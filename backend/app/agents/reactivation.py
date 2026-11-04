import re

from ..config import STOP_FOOTER
from ..models import Patient

SENSITIVE = re.compile(r"icbc|claim|accident|injur|diagnos|pain|herniat|sprain|migraine|anxiety|depress|surgery|carpal|disc\b", re.I)


def validate_message(msg: str, channel: str) -> bool:
    """Guardrails enforced in code: opt-out line, no sensitive health terms, <=320 chars for SMS."""
    return bool(re.search(r"reply stop", msg, re.I)) and not SENSITIVE.search(msg) and not (channel == "sms" and len(msg) > 320)


def _template(p: Patient, channel: str) -> str:
    """Fixed, pre-approved wording with the patient's details filled in (no AI involved)."""
    svc = (p.last_service or "").strip().lower()
    with_whom = f" with {p.last_practitioner}" if p.last_practitioner else ""
    if p.visit_count == 0:
        body = (f"Hi {p.first_name}, thanks for getting in touch with Q's Wellness Clinic in Surrey. "
                "We'd love to help. Reply here or call us to book a time that suits you.")
    elif svc and not SENSITIVE.search(svc):
        body = (f"Hi {p.first_name}, it's been a while since your {svc} visit{with_whom} at Q's Wellness Clinic. "
                "We have openings this week. Reply here and we'll find you a time.")
    else:
        body = (f"Hi {p.first_name}, we miss seeing you at Q's Wellness Clinic{with_whom}. "
                "We have openings this week. Reply here and we'll find you a time.")
    return f"{body} {STOP_FOOTER}"


def personalise(patients: list[Patient], goal: str, channel: str) -> dict[str, str]:
    """One templated message per patient. Anything that breaks a guardrail is left out (never sent)."""
    out = {p.id: _template(p, channel) for p in patients}
    return {i: m for i, m in out.items() if validate_message(m, channel)}
