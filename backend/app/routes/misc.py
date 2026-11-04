import json
from datetime import timedelta

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import func, select

from ..db import SessionLocal, iso, utcnow
from ..models import Appointment, AuditLog, Call, Campaign, Handoff, Message, Post
from ..scheduling import add_days, to_local, ymd

router = APIRouter(prefix="/api")


@router.get("/dashboard")
def dashboard():
    now = utcnow()
    since = now - timedelta(days=14)
    with SessionLocal() as db:
        calls = db.scalar(select(func.count()).select_from(Call))
        after = db.scalar(select(func.count()).select_from(Call).where(Call.after_hours == True))  # noqa: E712
        ai = db.scalars(select(Appointment).where(Appointment.source == "ai-phone", Appointment.status != "cancelled")).all()
        react = db.scalars(select(Appointment).where(Appointment.source == "ai-reactivation", Appointment.status != "cancelled")).all()
        handoffs = db.scalar(select(func.count()).select_from(Handoff))
        posts = db.scalar(select(func.count()).select_from(Post).where(Post.status == "published"))
        recent_calls = db.scalars(select(Call).where(Call.started_at >= since)).all()
        recent_appts = db.scalars(select(Appointment).where(Appointment.source.in_(["ai-phone", "ai-reactivation"]), Appointment.created_at >= since)).all()
        campaigns = db.scalar(select(func.count()).select_from(Campaign))
        revenue = sum(a.service.price_cents for a in [*ai, *react])
        outcomes = db.execute(select(Call.outcome, func.count()).group_by(Call.outcome)).all()
    days = [add_days(ymd(now), i - 13) for i in range(14)]

    def label(d: str) -> str:
        y, m, dd = d.split("-")
        return f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][int(m) - 1]} {int(dd)}"

    series = [{"day": label(d), "calls": sum(1 for c in recent_calls if ymd(c.started_at) == d and not c.after_hours),
               "afterHours": sum(1 for c in recent_calls if ymd(c.started_at) == d and c.after_hours),
               "phoneBookings": sum(1 for a in recent_appts if ymd(a.created_at) == d and a.source == "ai-phone"),
               "reactivationBookings": sum(1 for a in recent_appts if ymd(a.created_at) == d and a.source == "ai-reactivation")} for d in days]
    return {"kpis": {"callsHandled": calls, "afterHoursCaptured": after, "aiBookings": len(ai), "handoffs": handoffs, "postsPublished": posts,
                     "reactivationBookings": len(react), "revenueCents": revenue, "campaignsSent": campaigns},
            "series": series, "outcomes": [{"outcome": o or "other", "count": n} for o, n in outcomes]}


def _name(p) -> str | None:
    return f"{p.first_name} {p.last_name}" if p else None


@router.get("/inbox")
def inbox():
    with SessionLocal() as db:
        msgs = db.scalars(select(Message).order_by(Message.created_at.desc()).limit(80)).all()
        hands = db.scalars(select(Handoff).order_by(Handoff.created_at.desc()).limit(40)).all()
        audits = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(30)).all()
        return {
            "messages": [{"id": m.id, "channel": m.channel, "direction": m.direction, "toAddress": m.to_address, "body": m.body, "kind": m.kind,
                          "createdAt": iso(m.created_at), "patientName": _name(m.patient)} for m in msgs],
            "handoffs": [{"id": h.id, "reason": h.reason, "priority": h.priority, "status": h.status, "details": h.details,
                          "createdAt": iso(h.created_at), "patientName": _name(h.patient)} for h in hands],
            "audits": [{"id": a.id, "agent": a.agent, "tool": a.tool, "summary": a.summary, "ok": a.ok, "createdAt": iso(a.created_at)} for a in audits],
        }


class ResolveBody(BaseModel):
    handoffId: str


@router.post("/inbox")
def resolve(b: ResolveBody):
    with SessionLocal() as db:
        h = db.get(Handoff, b.handoffId)
        if h:
            h.status = "resolved"
            db.commit()
    return {"ok": True}
