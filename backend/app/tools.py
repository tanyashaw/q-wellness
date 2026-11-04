"""Agent tools: pydantic schema + LLM tool definition + handler + friendly summary.

Agents never touch the database directly; they call tools, and tools call adapters (app.integrations).
Every call is written to the audit log (the "What the AI did" panel).
"""
import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Literal

from pydantic import BaseModel, Field

from .audit import write_audit
from .config import PRACTITIONER_NAMES, SERVICE_LABELS, STOP_FOOTER
from .db import SessionLocal, iso
from .integrations import get_booking, get_messenger
from .knowledge import search_knowledge
from .models import Handoff, Patient, Post
from .scheduling import add_days, now_utc, parse_iso, ymd

ServiceId = Literal["rmt-30", "rmt-45", "rmt-60", "physio-initial", "physio-followup", "acupuncture", "counselling", "icbc-rehab"]
PractitionerId = Literal["khalid", "shaniya", "anjanjeet", "priya", "daniel", "jordan"]


@dataclass
class ToolContext:
    agent: str
    session_id: str
    now: datetime  # naive UTC "clinic now" (may be the simulated after-hours clock)
    call_id: str | None = None
    caller_text: str | None = None  # the caller's latest message (None = not a live call, no check)


@dataclass
class Tool:
    name: str
    description: str
    model: type[BaseModel]
    handler: Callable[[Any, ToolContext], dict]
    summarize: Callable[[Any, dict], str]


# ---------------------------------------------------------------- searchKnowledge
class SearchKnowledgeIn(BaseModel):
    query: str = Field(description="Natural-language question or keywords")


# ---------------------------------------------------------------- checkAvailability
class CheckAvailabilityIn(BaseModel):
    serviceId: ServiceId = Field(description="Service to book")
    practitionerId: PractitionerId | None = Field(default=None, description="Optional specific practitioner")
    dateFrom: str = Field(description="First local date to search, YYYY-MM-DD")
    dateTo: str | None = Field(default=None, description="Last local date, YYYY-MM-DD (default dateFrom + 6 days)")


def _check_availability(i: CheckAvailabilityIn, ctx: ToolContext) -> dict:
    date_to = i.dateTo or add_days(i.dateFrom, 6)
    frm = max(i.dateFrom, ymd(ctx.now))
    slots = get_booking().get_availability(i.serviceId, i.practitionerId, frm, date_to, ctx.now, 8)
    return {"count": len(slots), "slots": slots}


def _sum_availability(i, o):
    who = f"{PRACTITIONER_NAMES[i.practitionerId]}'s" if i.practitionerId else "clinic"
    first = f" (first: {o['slots'][0]['label']})" if o.get("slots") else ""
    return f"Checked {who} availability for {SERVICE_LABELS[i.serviceId]} → {o['count']} opening{'' if o['count'] == 1 else 's'}{first}"


# ---------------------------------------------------------------- bookAppointment
class BookAppointmentIn(BaseModel):
    patientId: str | None = Field(default=None, description="Existing patient id from lookupPatient")
    firstName: str | None = None
    lastName: str | None = None
    phone: str | None = None
    serviceId: ServiceId
    practitionerId: PractitionerId
    start: str = Field(description="ISO start time exactly as returned by checkAvailability")
    confirmedWithCaller: bool = Field(description="true only if the caller confirmed all details")


_YES = re.compile(r"\b(yes|yeah|yep|yup|correct|right|sure|ok|okay|confirm(ed)?|go ahead|sounds good|perfect|absolutely)\b", re.I)
_NO = re.compile(r"\b(no|not|wrong|incorrect|change|actually|instead)\b", re.I)


def _said_yes(text: str) -> bool:
    return bool(_YES.search(text)) and not _NO.search(text)


def _book(i: BookAppointmentIn, ctx: ToolContext) -> dict:
    # Guardrail enforced in code, not just in the prompt.
    if i.confirmedWithCaller is not True:
        return {"ok": False, "error": "Details not confirmed with the caller. Read back name, phone, service, practitioner and time first."}
    if ctx.caller_text is not None and not _said_yes(ctx.caller_text):
        return {"ok": False, "error": "The caller has not said yes yet. Do NOT book. Read back name, phone, service, practitioner and date/time, ask 'Is that correct?', then wait for their answer in their next message."}
    return get_booking().book(
        {"id": i.patientId, "firstName": i.firstName, "lastName": i.lastName, "phone": i.phone},
        i.practitionerId, i.serviceId, i.start, "ai-reactivation" if ctx.agent == "reactivation" else "ai-phone", ctx.now,
    )


def _sum_book(i, o):
    if o.get("ok"):
        return f"Booked {SERVICE_LABELS[i.serviceId]} with {PRACTITIONER_NAMES[i.practitionerId]} on {o['appointment']['label']} for {o['appointment']['patientName']}"
    return f"Booking not made: {o.get('error')}"


# ---------------------------------------------------------------- reschedule / cancel / lookup
class RescheduleIn(BaseModel):
    appointmentId: str
    newStart: str = Field(description="ISO start time exactly as returned by checkAvailability")


class CancelIn(BaseModel):
    appointmentId: str


class LookupPatientIn(BaseModel):
    phone: str | None = None
    name: str | None = None


def _cancel(i: CancelIn, ctx: ToolContext) -> dict:
    r = get_booking().cancel(i.appointmentId)
    return {**r, "policy": "Please give at least 24 hours' notice to cancel or reschedule. Late cancellations may incur a fee."}


def _lookup(i: LookupPatientIn, ctx: ToolContext) -> dict:
    p = get_booking().find_patient(i.phone, i.name)
    return {"found": True, "patient": p} if p else {"found": False}


# ---------------------------------------------------------------- createHandoff
class CreateHandoffIn(BaseModel):
    reason: str = Field(description="Short reason, e.g. 'ICBC intake' or 'Billing dispute'")
    priority: Literal["normal", "urgent"] = "normal"
    patientId: str | None = None
    callerName: str | None = None
    callerPhone: str | None = None
    details: dict[str, str] | None = Field(default=None, description="Key facts, e.g. claimNumber, accidentDate")


def _handoff(i: CreateHandoffIn, ctx: ToolContext) -> dict:
    with SessionLocal() as db:
        h = Handoff(
            reason=i.reason, priority=i.priority, patient_id=i.patientId, call_id=ctx.call_id,
            details=json.dumps({"callerName": i.callerName, "callerPhone": i.callerPhone, **(i.details or {})}),
        )
        db.add(h)
        db.commit()
        return {"ok": True, "handoffId": h.id}


# ---------------------------------------------------------------- sendMessage
class SendMessageIn(BaseModel):
    channel: Literal["sms", "email", "whatsapp"] = "sms"
    to: str = Field(description="Phone number or email")
    body: str
    kind: Literal["confirmation", "campaign", "reply", "general"] = "general"
    patientId: str | None = None
    campaignId: str | None = None


def _send(i: SendMessageIn, ctx: ToolContext) -> dict:
    if i.patientId:
        with SessionLocal() as db:
            p = db.get(Patient, i.patientId)
            if p and p.opted_out:
                return {"ok": False, "error": "Patient has opted out. Message blocked (CASL)."}
    body = i.body.strip()
    if i.kind == "campaign" and not re.search(r"reply stop", body, re.I):
        body += f" {STOP_FOOTER}"
    r = get_messenger().send(i.channel, i.to, body, i.kind, i.patientId, i.campaignId)
    return {**r, "body": body}


# ---------------------------------------------------------------- social
def sanitize_claims(text: str) -> str:
    """Code-level enforcement of 'no medical claims or guarantees' for social copy."""
    text = re.sub(r"\bcures?\b", "may help with", text, flags=re.I)
    text = re.sub(r"\bheals?\b", "may support", text, flags=re.I)
    text = re.sub(r"\bguarantee[sd]?\b", "aim to provide", text, flags=re.I)
    return re.sub(r"\bfix(es)?\b", "support", text, flags=re.I)


class DraftPostIn(BaseModel):
    platform: Literal["facebook", "instagram"]
    theme: str
    headline: str
    caption: str
    hashtags: list[str]
    imagePrompt: str
    suggestedTime: str = Field(description="ISO 8601 time in America/Vancouver")
    cta: str


def _draft_post(i: DraftPostIn, ctx: ToolContext) -> dict:
    try:
        when = parse_iso(i.suggestedTime)
    except ValueError:
        when = now_utc() + timedelta(days=1)
    with SessionLocal() as db:
        p = Post(platform=i.platform, theme=i.theme, headline=sanitize_claims(i.headline), caption=sanitize_claims(i.caption),
                 hashtags=" ".join(h.lstrip("#") for h in i.hashtags), image_prompt=i.imagePrompt, cta=i.cta, suggested_at=when)
        db.add(p)
        db.commit()
        return {"ok": True, "postId": p.id}


class SchedulePostIn(BaseModel):
    postId: str
    time: str = Field(description="ISO 8601")


def _schedule_post(i: SchedulePostIn, ctx: ToolContext) -> dict:
    with SessionLocal() as db:
        p = db.get(Post, i.postId)
        p.status = "approved"
        try:
            p.suggested_at = parse_iso(i.time)
        except ValueError:
            pass
        db.commit()
    return {"ok": True}


ALL_TOOLS: dict[str, Tool] = {t.name: t for t in [
    Tool("searchKnowledge", "Search the clinic knowledge base (services, FAQ, pricing, policies, ICBC, hours). Use for any factual question about the clinic.",
         SearchKnowledgeIn, lambda i, c: {"results": search_knowledge(i.query, 3)}, lambda i, o: "Looked up clinic information"),
    Tool("checkAvailability", "Look up real open appointment slots. NEVER offer a time that did not come from this tool. Returns slots with ISO start times to pass to bookAppointment.",
         CheckAvailabilityIn, _check_availability, _sum_availability),
    Tool("bookAppointment", "Book an appointment. ONLY call after you have read back name, phone, service, practitioner and time to the caller and they said yes. Set confirmedWithCaller=true only in that case.",
         BookAppointmentIn, _book, _sum_book),
    Tool("rescheduleAppointment", "Move an existing appointment to a new slot from checkAvailability. Confirm the new time with the caller first, then mention the 24-hour cancellation policy.",
         RescheduleIn, lambda i, c: get_booking().reschedule(i.appointmentId, i.newStart, c.now),
         lambda i, o: f"Moved appointment to {o['appointment']['label']}" if o.get("ok") else f"Reschedule failed: {o.get('error')}"),
    Tool("cancelAppointment", "Cancel an existing appointment after the caller confirms. Afterwards, mention the cancellation policy.",
         CancelIn, _cancel, lambda i, o: f"Cancelled appointment on {o['label']}" if o.get("ok") else f"Cancel failed: {o.get('error')}"),
    Tool("lookupPatient", "Find an existing patient by phone number (preferred) or name. Returns upcoming appointments with ids.",
         LookupPatientIn, _lookup,
         lambda i, o: (f"Identified caller: {o['patient']['name']}" if o["found"] else "New caller (not in the system yet)")),
    Tool("createHandoff", "Create a ticket for front-desk staff. Use for ICBC intake, billing disputes, complaints, clinical questions, urgent issues, or whenever intent is unclear.",
         CreateHandoffIn, _handoff, lambda i, o: f"Created {'URGENT ' if i.priority == 'urgent' else ''}ticket for the front desk: {i.reason}"),
    Tool("sendMessage", "Send an SMS, email or WhatsApp message to a patient. Use kind=confirmation for booking confirmations (no health details!). Marketing/reactivation messages automatically get the CASL opt-out line.",
         SendMessageIn, _send, lambda i, o: (f"Sent {'SMS' if i.channel == 'sms' else i.channel} confirmation" if i.kind == "confirmation" else f"Sent {'SMS' if i.channel == 'sms' else i.channel} message") if o.get("ok") else f"Message blocked: {o.get('error')}"),
    Tool("draftPost", "Save a social media post draft for owner approval.", DraftPostIn, _draft_post, lambda i, o: f'Drafted {i.platform} post: "{i.headline}"'),
    Tool("schedulePost", "Approve a draft post and put it on the content calendar at a given time.", SchedulePostIn, _schedule_post, lambda i, o: f"Scheduled post {i.postId[-6:]} for {i.time}"),
]}

RECEPTIONIST_TOOLS = ["searchKnowledge", "checkAvailability", "bookAppointment", "rescheduleAppointment", "cancelAppointment", "lookupPatient", "createHandoff", "sendMessage"]
REACTIVATION_TOOLS = ["searchKnowledge", "checkAvailability", "bookAppointment", "lookupPatient", "createHandoff", "sendMessage"]


def llm_tools(names: list[str]) -> list[dict]:
    out = []
    for n in names:
        t = ALL_TOOLS[n]
        schema = t.model.model_json_schema()
        schema.pop("title", None)
        out.append({"type": "function", "function": {"name": t.name, "description": t.description, "parameters": schema}})
    return out


def execute_tool(name: str, raw_input: Any, ctx: ToolContext) -> dict:
    """Validate, run and audit a tool call. Returns the event shown in the UI timeline."""
    t = ALL_TOOLS.get(name)
    at = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    inp: Any = raw_input
    ok = True
    try:
        if not t:
            raise ValueError(f"Unknown tool {name}")
        parsed = t.model.model_validate(raw_input)
        inp = parsed.model_dump(exclude_none=True)
        out = t.handler(parsed, ctx)
        ok = out.get("ok") is not False
        summary = t.summarize(parsed, out)
    except Exception as e:  # noqa: BLE001
        ok = False
        out = {"ok": False, "error": str(e)}
        summary = f"{name} failed: {e}"
    audit_id = write_audit(ctx.agent, ctx.session_id, name, inp, out, summary, ok)
    return {"id": audit_id, "tool": name, "input": inp, "output": out, "summary": summary, "ok": ok, "at": at}
