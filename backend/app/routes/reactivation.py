import json
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from ..agents.reactivation import personalise
from ..db import SessionLocal, iso
from ..models import Campaign, CampaignContact, Patient
from ..scheduling import now_utc
from ..segments import SEGMENTS, get_cohort, segments_of
from ..tools import ToolContext, execute_tool

router = APIRouter(prefix="/api/reactivation")


def funnel_for(campaign_id: str) -> dict:
    with SessionLocal() as db:
        contacts = db.scalars(select(CampaignContact).where(CampaignContact.campaign_id == campaign_id)).all()
        c = db.get(Campaign, campaign_id)
        return {"campaignId": campaign_id, "name": c.name if c else None, "channel": c.channel if c else None, "sent": len(contacts),
                "replied": sum(1 for x in contacts if x.reply is not None), "booked": sum(1 for x in contacts if x.status == "booked"),
                "optedOut": sum(1 for x in contacts if x.status == "opted_out"), "revenueCents": c.revenue_cents if c else 0}


@router.get("/cohort")
def cohort():
    patients, counts = get_cohort()
    return {
        "total": len(patients), "counts": counts, "segments": SEGMENTS,
        "patients": [{"id": p.id, "name": f"{p.first_name} {p.last_name}", "firstName": p.first_name, "lastService": p.last_service or "Inquiry only",
                      "practitioner": p.last_practitioner, "lastActivity": iso(max(d for d in (p.last_visit_at, p.last_inquiry_at) if d)),
                      "visitCount": p.visit_count, "isIcbc": p.is_icbc, "channel": p.preferred_channel, "consentSms": p.consent_sms,
                      "consentEmail": p.consent_email, "segments": segments_of(p)} for p in patients],
    }


class CampaignBody(BaseModel):
    name: str | None = None
    segments: list[str] = Field(min_length=1)
    channel: Literal["sms", "email", "whatsapp"]
    goal: str = "Re-book lapsed patients"
    preview: bool = False


@router.get("/campaign")
def latest_campaign():
    with SessionLocal() as db:
        c = db.scalars(select(Campaign).where(~Campaign.name.contains("(past)")).order_by(Campaign.created_at.desc())).first()
    return {"funnel": funnel_for(c.id) if c else None}


@router.post("/campaign")
def campaign(b: CampaignBody):
    patients, _ = get_cohort()

    def eligible(p: Patient) -> bool:
        if not any(s in segments_of(p) for s in b.segments):
            return False
        return (p.consent_email and bool(p.email)) if b.channel == "email" else p.consent_sms

    consented = [p for p in patients if eligible(p)]
    if b.preview:
        pool = consented[:12]
        msgs = personalise(pool, b.goal, b.channel)
        sample = [p for p in pool if p.id in msgs][:5]
        return {"recipients": len(consented), "previews": [{"id": p.id, "name": f"{p.first_name} {p.last_name[:1]}.", "message": msgs[p.id]} for p in sample]}

    recipients = consented[:150]
    if not recipients:
        raise HTTPException(400, "No eligible recipients for this selection")
    msgs = personalise(recipients, b.goal, b.channel)
    recipients = [p for p in recipients if p.id in msgs]
    if not recipients:
        raise HTTPException(400, "No compliant messages could be prepared for this selection")
    names = " + ".join(next((s["label"] for s in SEGMENTS if s["key"] == k), k) for k in b.segments)
    with SessionLocal() as db:
        camp = Campaign(name=b.name or f"{names} outreach", segments=json.dumps(b.segments), channel=b.channel, goal=b.goal)
        db.add(camp)
        db.commit()
        cid = camp.id
    for p in recipients:
        to = p.email if b.channel == "email" else p.phone
        ev = execute_tool("sendMessage", {"channel": b.channel, "to": to, "body": msgs[p.id], "kind": "campaign", "patientId": p.id, "campaignId": cid},
                          ToolContext("reactivation", f"campaign-{cid}", now_utc()))
        if ev["ok"]:
            with SessionLocal() as db:
                db.add(CampaignContact(campaign_id=cid, patient_id=p.id, message=ev["output"]["body"]))
                db.commit()
    return {"funnel": funnel_for(cid), "sentCount": len(recipients)}
