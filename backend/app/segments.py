from datetime import timedelta

from sqlalchemy import select

from .db import SessionLocal
from .models import Appointment, Patient
from .scheduling import now_utc

SEGMENTS = [
    {"key": "massage_regulars", "label": "Lapsed massage regulars", "hint": "3+ massage visits"},
    {"key": "physio_unfinished", "label": "Unfinished physio plans", "hint": "Plan not completed"},
    {"key": "icbc", "label": "ICBC patients", "hint": "Claim possibly still active"},
    {"key": "inquired", "label": "Inquired but never booked", "hint": "Asked, never visited"},
    {"key": "benefits", "label": "Year-end benefits reminder", "hint": "Use remaining insurance benefits"},
]

_PRED = {
    "massage_regulars": lambda p: p.last_service == "massage" and p.visit_count >= 3,
    "physio_unfinished": lambda p: p.unfinished_plan and p.last_service == "physiotherapy",
    "icbc": lambda p: p.is_icbc,
    "inquired": lambda p: p.visit_count == 0,
    "benefits": lambda p: p.visit_count > 0 and not p.is_icbc,
}


def segments_of(p: Patient) -> list[str]:
    return [s["key"] for s in SEGMENTS if _PRED[s["key"]](p)]


def rebook_service_id(label: str | None) -> str:
    return {
        "physiotherapy": "physio-followup",
        "acupuncture": "acupuncture",
        "counselling": "counselling",
        "ICBC rehab": "icbc-rehab",
    }.get(label or "", "rmt-60")


def get_cohort(now=None):
    """Patients whose last visit/inquiry was 6-12 months ago, no future booking, not opted out."""
    now = now or now_utc()
    frm = now - timedelta(days=365)
    to = now - timedelta(days=182)
    with SessionLocal() as db:
        future = {r[0] for r in db.execute(select(Appointment.patient_id).where(Appointment.status == "booked", Appointment.start > now))}
        patients = db.scalars(select(Patient).where(Patient.opted_out == False)).all()  # noqa: E712
    out = []
    for p in patients:
        dates = [d for d in (p.last_visit_at, p.last_inquiry_at) if d]
        if not dates:
            continue
        last = max(dates)
        if frm <= last <= to and p.id not in future:
            out.append(p)
    counts = {s["key"]: sum(1 for p in out if s["key"] in segments_of(p)) for s in SEGMENTS}
    return out, counts
