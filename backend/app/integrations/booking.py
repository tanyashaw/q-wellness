"""BookingProvider adapter: MockJaneProvider (SQLite) and a JaneProvider stub."""
import re
from datetime import datetime, timedelta
from typing import Any, Protocol

from sqlalchemy import select

from ..db import SessionLocal, iso
from ..models import Appointment, Patient, Practitioner, Service
from ..scheduling import add_days, day_window, dow_of, generate_slots, human_time, now_utc, ymd, parse_iso


def digits(s: str) -> str:
    return re.sub(r"\D", "", s)[-10:]


class BookingProvider(Protocol):
    name: str

    def get_availability(self, service_id: str, practitioner_id: str | None, date_from: str, date_to: str, now: datetime, limit: int = 12) -> list[dict]: ...
    def book(self, patient: dict, practitioner_id: str, service_id: str, start: str, source: str, now: datetime | None = None) -> dict: ...
    def reschedule(self, appointment_id: str, new_start: str, now: datetime | None = None) -> dict: ...
    def cancel(self, appointment_id: str) -> dict: ...
    def find_patient(self, phone: str | None = None, name: str | None = None) -> dict | None: ...


def _find_by_phone(db, phone: str):
    d = digits(phone)
    if len(d) < 7:
        return None
    for p in db.scalars(select(Patient).where(Patient.phone.contains(d[-4:]))):
        if digits(p.phone) == d:
            return p
    return None


def _result(db, appt_id: str) -> dict:
    a = db.get(Appointment, appt_id)
    return {
        "ok": True,
        "appointment": {
            "id": a.id,
            "patientId": a.patient_id,
            "patientName": f"{a.patient.first_name} {a.patient.last_name}",
            "practitionerName": a.practitioner.name,
            "serviceName": a.service.name,
            "start": iso(a.start),
            "end": iso(a.end),
            "label": human_time(a.start),
        },
    }


class MockJaneProvider:
    """Mock Jane App backed by SQLite. Swap for JaneProvider via BOOKING_PROVIDER=jane."""

    name = "Mock Jane (SQLite)"

    def get_availability(self, service_id, practitioner_id, date_from, date_to, now, limit=12):
        with SessionLocal() as db:
            service = db.get(Service, service_id)
            if not service:
                return []
            q = select(Practitioner).where(Practitioner.discipline == service.discipline)
            if practitioner_id:
                q = q.where(Practitioner.id == practitioner_id)
            practitioners = db.scalars(q).all()
            slots: list[dict] = []
            d, i = date_from, 0
            while d <= date_to and i < 28:
                w = day_window(d)
                if w:
                    for p in practitioners:
                        appts = db.scalars(select(Appointment).where(Appointment.practitioner_id == p.id, Appointment.status == "booked", Appointment.start >= w[0], Appointment.start < w[1])).all()
                        gen = generate_slots(d, service.duration_min, [(a.start, a.end) for a in appts], now, [int(x) for x in p.work_days.split(",")])
                        for s, e in gen:
                            slots.append({"practitionerId": p.id, "practitionerName": p.name, "start": iso(s), "end": iso(e), "label": human_time(s)})
                    if len(slots) >= limit * 3:
                        break
                d, i = add_days(d, 1), i + 1
            slots.sort(key=lambda s: s["start"])
            return slots[:limit]

    def book(self, patient, practitioner_id, service_id, start, source, now=None):
        with SessionLocal() as db:
            service = db.get(Service, service_id)
            prac = db.get(Practitioner, practitioner_id)
            if not service:
                return {"ok": False, "error": f"Unknown service {service_id}"}
            if not prac:
                return {"ok": False, "error": f"Unknown practitioner {practitioner_id}"}
            if prac.discipline != service.discipline:
                return {"ok": False, "error": f"{prac.name} does not provide {service.name}"}
            try:
                st = parse_iso(start)
            except ValueError:
                return {"ok": False, "error": "Invalid start time"}
            en = st + timedelta(minutes=service.duration_min)
            w = day_window(ymd(st))
            if not w or st < w[0] or en > w[1] or dow_of(ymd(st)) not in [int(x) for x in prac.work_days.split(",")]:
                return {"ok": False, "error": f"{human_time(st)} is outside {prac.name}'s working hours"}
            if st <= (now or now_utc()):
                return {"ok": False, "error": "That time is in the past"}
            clash = db.scalars(select(Appointment).where(Appointment.practitioner_id == prac.id, Appointment.status == "booked", Appointment.start < en, Appointment.end > st)).first()
            if clash:
                return {"ok": False, "error": "That slot has just been taken"}
            pid = patient.get("id")
            if not pid:
                existing = _find_by_phone(db, patient["phone"]) if patient.get("phone") else None
                if existing:
                    pid = existing.id
                else:
                    if not patient.get("firstName") or not patient.get("phone"):
                        return {"ok": False, "error": "Patient first name and phone are required for a new patient"}
                    cat = service.category
                    p = Patient(first_name=patient["firstName"], last_name=patient.get("lastName") or "", phone=patient["phone"], last_inquiry_at=now_utc(),
                                last_service="massage" if cat == "rmt" else "physiotherapy" if cat == "physio" else cat)
                    db.add(p)
                    db.flush()
                    pid = p.id
            a = Appointment(patient_id=pid, practitioner_id=prac.id, service_id=service.id, start=st, end=en, source=source)
            db.add(a)
            db.commit()
            return _result(db, a.id)

    def reschedule(self, appointment_id, new_start, now=None):
        with SessionLocal() as db:
            a = db.get(Appointment, appointment_id)
            if not a or a.status != "booked":
                return {"ok": False, "error": "Appointment not found or not active"}
            st = parse_iso(new_start)
            en = st + timedelta(minutes=a.service.duration_min)
            w = day_window(ymd(st))
            if not w or st < w[0] or en > w[1]:
                return {"ok": False, "error": "New time is outside clinic hours"}
            if st <= (now or now_utc()):
                return {"ok": False, "error": "That time is in the past"}
            clash = db.scalars(select(Appointment).where(Appointment.id != a.id, Appointment.practitioner_id == a.practitioner_id, Appointment.status == "booked", Appointment.start < en, Appointment.end > st)).first()
            if clash:
                return {"ok": False, "error": "That slot has just been taken"}
            a.start, a.end = st, en
            db.commit()
            return _result(db, a.id)

    def cancel(self, appointment_id):
        with SessionLocal() as db:
            a = db.get(Appointment, appointment_id)
            if not a or a.status != "booked":
                return {"ok": False, "error": "Appointment not found or already cancelled"}
            a.status = "cancelled"
            db.commit()
            return {"ok": True, "label": human_time(a.start)}

    def find_patient(self, phone=None, name=None):
        with SessionLocal() as db:
            p = _find_by_phone(db, phone) if phone else None
            if not p and name:
                first, *rest = name.strip().split()
                q = select(Patient).where(Patient.first_name.contains(first))
                if rest:
                    q = q.where(Patient.last_name.contains(" ".join(rest)))
                p = db.scalars(q).first()
            if not p:
                return None
            ups = db.scalars(select(Appointment).where(Appointment.patient_id == p.id, Appointment.status == "booked", Appointment.start > now_utc() - timedelta(days=1)).order_by(Appointment.start)).all()
            return {
                "id": p.id,
                "name": f"{p.first_name} {p.last_name}",
                "phone": p.phone,
                "email": p.email,
                "isIcbc": p.is_icbc,
                "visitCount": p.visit_count,
                "lastService": p.last_service,
                "upcoming": [
                    {"id": a.id, "label": human_time(a.start), "serviceName": a.service.name, "practitionerName": a.practitioner.name, "start": iso(a.start), "serviceId": a.service_id, "practitionerId": a.practitioner_id}
                    for a in ups
                ],
            }


class JaneProvider:
    """Real Jane App integration (STUB).

    Going live: Jane's API is partner-gated. Apply for partner/API access, then map Jane staff_member -> Practitioner,
    treatment -> Service, appointment -> Appointment. Implement each method with calls to JANE_API_BASE using JANE_API_KEY,
    keeping this interface identical so no agent/tool code changes. Normalise times to UTC.
    """

    name = "Jane App (pending API access)"

    def _nope(self, *a: Any, **k: Any):
        raise NotImplementedError("JaneProvider is not implemented yet (pending Jane App partner API access). Set BOOKING_PROVIDER=mock.")

    get_availability = book = reschedule = cancel = find_patient = _nope
