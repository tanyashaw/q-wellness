from fastapi import APIRouter, Query
from sqlalchemy import select

from ..db import SessionLocal, iso
from ..models import Appointment, Practitioner
from ..scheduling import add_days, at_local, now_utc, ymd

router = APIRouter(prefix="/api/calendar")


@router.get("")
def calendar(frm: str | None = Query(default=None, alias="from"), days: int = 7):
    frm = frm or ymd(now_utc())
    days = min(days, 14)
    start, end = at_local(frm, 0), at_local(add_days(frm, days), 0)
    with SessionLocal() as db:
        pracs = db.scalars(select(Practitioner).order_by(Practitioner.name)).all()
        appts = db.scalars(select(Appointment).where(Appointment.start >= start, Appointment.start < end, Appointment.status == "booked").order_by(Appointment.start)).all()
        return {
            "from": frm,
            "days": days,
            "practitioners": [{"id": p.id, "name": p.name, "title": p.title, "discipline": p.discipline, "isFictional": p.is_fictional} for p in pracs],
            "appointments": [
                {"id": a.id, "practitionerId": a.practitioner_id, "start": iso(a.start), "end": iso(a.end),
                 "patient": f"{a.patient.first_name} {a.patient.last_name[:1]}.", "service": a.service.name, "source": a.source}
                for a in appts
            ],
        }
