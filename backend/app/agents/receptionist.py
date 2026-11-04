import json
import threading
from dataclasses import dataclass, field
from datetime import datetime

from ..config import CLINIC, require_api_key
from ..db import SessionLocal, iso, utcnow
from ..models import Call, Handoff, Patient
from ..scheduling import add_days, at_local, human_time, is_open_at, open_state, simulated_after_hours_now, to_local, now_utc, weekday, ymd
from ..tools import RECEPTIONIST_TOOLS, ToolContext, execute_tool
from .llm import complete, load_prompt, run_agent


@dataclass
class Session:
    id: str
    messages: list = field(default_factory=list)
    transcript: list = field(default_factory=list)
    events: list = field(default_factory=list)
    after_hours: bool = False
    caller_phone: str | None = None
    caller_name: str | None = None
    started_at: datetime = field(default_factory=utcnow)


_sessions: dict[str, Session] = {}
_lock = threading.Lock()


def clinic_now(after_hours: bool) -> datetime:
    return simulated_after_hours_now() if after_hours else now_utc()


def _calendar_hint(now: datetime) -> str:
    today = ymd(now)
    rows = [f"{weekday(at_local(add_days(today, i), 12 * 60))} = {add_days(today, i)}" for i in range(8)]
    return f"Today is {weekday(now)}, {today}. Upcoming dates: {'; '.join(rows)}."


def _system_prompt(s: Session, now: datetime) -> str:
    l = to_local(now)
    now_txt = f"{weekday(now)} {l.strftime('%b')} {l.day}, {l.year} at {human_time(now).split(' at ')[1]}"
    text = load_prompt("receptionist", persona=CLINIC["persona"], now=now_txt, openState=open_state(now))
    text += f"\n{_calendar_hint(now)}\n"
    if s.caller_phone:
        text += f"Caller ID number: {s.caller_phone}. Call lookupPatient with it at the start of the call.\n"
    return text


def receptionist_turn(session_id: str, message: str | None, start: bool, after_hours: bool, caller_phone: str | None, on_text, on_tool) -> dict:
    require_api_key()
    with _lock:
        s = _sessions.get(session_id)
        if start or s is None:
            s = Session(id=session_id, after_hours=after_hours, caller_phone=caller_phone)
            _sessions[session_id] = s
    now = clinic_now(s.after_hours)
    ctx = ToolContext(agent="receptionist", session_id=s.id, now=now)

    def tool_cb(ev: dict):
        s.events.append(ev)
        on_tool(ev)

    caller_text = None if start else (message or "").strip()
    ctx.caller_text = caller_text or ""
    user_msg = "Hello?" if (start or not caller_text) else caller_text
    try:
        r = run_agent(_system_prompt(s, now), [*s.messages, {"role": "user", "content": user_msg}], RECEPTIONIST_TOOLS, ctx, max_tokens=700, on_text=on_text, on_tool=tool_cb)
    except Exception:
        if start:
            with _lock:
                _sessions.pop(session_id, None)
        raise
    s.messages, reply = r["messages"], r["text"]
    if caller_text:
        s.transcript.append({"role": "caller", "text": caller_text, "at": iso(utcnow())})
    s.transcript.append({"role": "ava", "text": reply, "at": iso(utcnow())})
    changed = any(e["tool"] in ("bookAppointment", "rescheduleAppointment", "cancelAppointment") and e["ok"] for e in s.events)
    return {"reply": reply, "calendarChanged": changed, "afterHours": s.after_hours, "clinicOpen": is_open_at(now), "now": iso(now)}


def _intent_outcome(s: Session) -> tuple[str, str]:
    ok = lambda t: any(e["tool"] == t and e["ok"] for e in s.events)  # noqa: E731
    if ok("bookAppointment"):
        return "new booking", "booked"
    if ok("rescheduleAppointment"):
        return "reschedule", "rescheduled"
    if ok("cancelAppointment"):
        return "cancel", "cancelled"
    handoffs = [e for e in s.events if e["tool"] == "createHandoff"]
    if handoffs:
        return ("icbc intake" if "icbc" in json.dumps(handoffs[0]["input"]).lower() else "handoff"), "handoff"
    return "faq", "answered"


def _summarize(s: Session) -> str:
    text = "\n".join(f"{t['role']}: {t['text']}" for t in s.transcript)
    return complete(None, "Summarize this clinic phone call in 1-2 plain sentences for the front-desk team (who called, what they wanted, what was done). "
                          "Do not include health details beyond what is needed. Reply with the summary only.\n\n" + text, 200).strip()


def end_call(session_id: str) -> dict | None:
    with _lock:
        s = _sessions.get(session_id)
    if not s:
        return None
    booking = next((e for e in s.events if e["tool"] in ("bookAppointment", "rescheduleAppointment") and e["ok"]), None)
    appt = (booking or {}).get("output", {}).get("appointment") if booking else None
    patient_id = appt["patientId"] if appt else None
    with SessionLocal() as db:
        patient = db.get(Patient, patient_id) if patient_id else None
    if patient:
        s.caller_name = f"{patient.first_name} {patient.last_name}"
    # Always leave a confirmation text in the inbox after a booking/reschedule
    if appt and patient and not any(e["tool"] == "sendMessage" and e["ok"] for e in s.events):
        s.events.append(execute_tool("sendMessage", {"channel": "sms", "to": patient.phone, "kind": "confirmation", "patientId": patient.id,
                                                      "body": f"Q's Wellness Clinic: you're booked for {appt['label']} with {appt['practitionerName']}. {CLINIC['address']}."},
                                     ToolContext("receptionist", session_id, clinic_now(s.after_hours))))
    intent, outcome = _intent_outcome(s)
    try:
        summary = _summarize(s) if s.transcript else ""
    except Exception as e:  # noqa: BLE001  (a failed summary must not lose the call record)
        print(f"Call summary failed: {e}")
        summary = ""
    with SessionLocal() as db:
        call = db.query(Call).filter(Call.session_id == session_id).first() or Call(session_id=session_id)
        call.patient_id, call.caller_name, call.caller_phone, call.after_hours = patient_id, s.caller_name, s.caller_phone, s.after_hours
        call.transcript, call.summary, call.intent, call.outcome = json.dumps(s.transcript), summary, intent, outcome
        call.started_at, call.ended_at = s.started_at, utcnow()
        db.add(call)
        db.flush()
        for e in s.events:
            hid = (e["output"] or {}).get("handoffId")
            if e["tool"] == "createHandoff" and hid:
                h = db.get(Handoff, hid)
                if h:
                    h.call_id = call.id
                    h.patient_id = patient_id or h.patient_id
        db.commit()
        call_id = call.id
    with _lock:
        _sessions.pop(session_id, None)
    return {"callId": call_id, "summary": summary, "intent": intent, "outcome": outcome, "actions": len(s.events)}
