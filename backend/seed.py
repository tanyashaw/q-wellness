"""Seed fictional demo data. Run from the project root:  python -m backend.seed   (or: npm run seed)"""
import json
import random
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import KNOWLEDGE_DIR  # noqa: E402
from app.db import Base, SessionLocal, engine, init_db, utcnow  # noqa: E402
from app.models import (Appointment, AuditLog, Call, Campaign, CampaignContact, Handoff, KnowledgeDoc, Message, Patient, Post, Practitioner, Service)  # noqa: E402
from app.scheduling import add_days, at_local, day_window, dow_of, ymd  # noqa: E402

rng = random.Random(20260401)
pick = lambda a: a[int(rng.random() * len(a))]  # noqa: E731
between = lambda a, b: int(a + rng.random() * (b - a + 1))  # noqa: E731

FIRST = "Aarav Priya Liam Olivia Noah Emma Harpreet Simran Jasdeep Manpreet Ava Ethan Sofia Lucas Mia Gurleen Amrit Kiran Jessica Daniel Hannah Ryan Chloe Tyler Maya Arjun Neha Ben Grace Owen Sana Imran Layla Omar Zoe Jack Ruby Dev Tanya Marcus Lily Nathan Fatima Ali Rhea Caleb Isla Sam Nina Paul".split()
LAST = "Singh Sandhu Gill Dhillon Sidhu Brar Chen Wong Lee Nguyen Smith Brown Wilson Taylor Martin Anderson Thomas Patel Sharma Khan Ahmed Johnson Clarke Murphy Campbell Kaur Grewal Bains Hayer Mann Johal Randhawa Walker Young Scott Reid Baker Hill Evans Cooper".split()

SERVICES = [
    ("rmt-30", "Registered Massage Therapy 30 min", "rmt", "rmt", 30, 8500),
    ("rmt-45", "Registered Massage Therapy 45 min", "rmt", "rmt", 45, 11000),
    ("rmt-60", "Registered Massage Therapy 60 min", "rmt", "rmt", 60, 13500),
    ("physio-initial", "Physiotherapy Initial Assessment", "physio", "physio", 60, 12000),
    ("physio-followup", "Physiotherapy Follow-up", "physio", "physio", 45, 9500),
    ("acupuncture", "Acupuncture", "acupuncture", "acupuncture", 45, 10000),
    ("counselling", "Clinical Counselling (50 min)", "counselling", "counselling", 50, 14000),
    ("icbc-rehab", "ICBC Post-Injury Rehab Session", "icbc", "physio", 45, 9500),
]
PRACTITIONERS = [
    ("khalid", "Khalid Qasmi", "Registered Massage Therapist", "rmt", "1,2,3,4,5,6", False),
    ("shaniya", "Shaniya", "Registered Massage Therapist", "rmt", "2,3,4,5,6", False),
    ("anjanjeet", "Anjanjeet Shergill", "Physiotherapist", "physio", "1,2,4,5,6", False),
    ("priya", "Priya Nair", "Acupuncturist (demo)", "acupuncture", "2,3,5,6", True),
    ("daniel", "Daniel Okafor", "Clinical Counsellor (demo)", "counselling", "1,3,4,5", True),
    ("jordan", "Jordan Reyes", "Registered Massage Therapist (demo)", "rmt", "1,3,5,6", True),
]
SERVICE_BY_LABEL = {
    "massage": ["khalid", "shaniya", "jordan"],
    "physiotherapy": ["anjanjeet"],
    "acupuncture": ["priya"],
    "counselling": ["daniel"],
    "ICBC rehab": ["anjanjeet"],
}


def wipe():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def seed_all():
    now = utcnow()
    ago = lambda d: now - timedelta(days=d)  # noqa: E731
    with SessionLocal() as db:
        for i, n, c, d, m, p in SERVICES:
            db.add(Service(id=i, name=n, category=c, discipline=d, duration_min=m, price_cents=p))
        for i, n, t, d, w, f in PRACTITIONERS:
            db.add(Practitioner(id=i, name=n, title=t, discipline=d, work_days=w, is_fictional=f))
        import re

        for f in sorted(KNOWLEDGE_DIR.glob("*.md")):
            content = f.read_text(encoding="utf8")
            m = re.search(r"^# (.+)$", content, re.M)
            db.add(KnowledgeDoc(slug=f.stem, title=m.group(1) if m else f.name, content=content))

        n = 0

        def mk(**over) -> Patient:
            nonlocal n
            n += 1
            first, last = pick(FIRST), pick(LAST)
            ch = rng.random()
            base = dict(first_name=first, last_name=last, phone=f"604-555-{1000 + n:04d}", email=f"{first}.{last}{n}@example.com".lower(),
                        preferred_channel="sms" if ch < 0.6 else "email" if ch < 0.85 else "whatsapp", consent_sms=rng.random() < 0.92,
                        consent_email=rng.random() < 0.9, opted_out=rng.random() < 0.07, is_icbc=False, visit_count=0, unfinished_plan=False)
            base.update(over)
            return Patient(**base)

        def prac_first(label: str) -> str:
            pid = pick(SERVICE_BY_LABEL[label])
            return next(p[1] for p in PRACTITIONERS if p[0] == pid).split()[0]
        window = lambda: ago(between(190, 355))  # noqa: E731
        created: list[Patient] = []

        sarah = Patient(first_name="Sarah", last_name="Chen", phone="604-555-0142", email="sarah.chen@example.com", preferred_channel="sms", visit_count=4,
                        last_service="physiotherapy", last_practitioner="Anjanjeet", last_visit_at=ago(9))
        created.append(sarah)
        for _ in range(70):  # recently active
            label = pick(["massage", "massage", "physiotherapy", "acupuncture", "counselling"])
            created.append(mk(last_service=label, last_practitioner=prac_first(label), last_visit_at=ago(between(1, 150)), visit_count=between(1, 14), opted_out=False))
        for _ in range(32):
            created.append(mk(last_service="massage", last_practitioner=prac_first("massage"), last_visit_at=window(), visit_count=between(3, 12)))
        for _ in range(22):
            created.append(mk(last_service="physiotherapy", last_practitioner="Anjanjeet", last_visit_at=window(), visit_count=between(1, 5), unfinished_plan=True))
        for _ in range(18):
            created.append(mk(last_service="ICBC rehab", last_practitioner="Anjanjeet", last_visit_at=window(), visit_count=between(2, 9), is_icbc=True))
        for _ in range(20):
            created.append(mk(last_service=None, last_practitioner=None, last_inquiry_at=window(), visit_count=0))
        for _ in range(18):
            label = pick(["massage", "acupuncture", "counselling", "physiotherapy"])
            created.append(mk(last_service=label, last_practitioner=prac_first(label), last_visit_at=window(), visit_count=between(1, 2)))
        for _ in range(66):  # older lapsed (12-24 months)
            label = pick(["massage", "massage", "physiotherapy", "acupuncture", "counselling"])
            created.append(mk(last_service=label, last_practitioner=prac_first(label), last_visit_at=ago(between(370, 720)), visit_count=between(1, 10)))
        db.add_all(created)
        db.flush()

        active = [p for p in created if not p.opted_out and p.phone != "604-555-0142"]
        recent = created[1:71]  # only recently-active patients hold future bookings

        today = ymd(now)
        for d in range(28):
            date = add_days(today, d)
            w = day_window(date)
            if not w:
                continue
            for pid, _, _, disc, wd, _ in PRACTITIONERS:
                if dow_of(date) not in [int(x) for x in wd.split(",")]:
                    continue
                svcs = [s for s in SERVICES if s[3] == disc]
                t = w[0]
                while t + timedelta(minutes=45) < w[1]:
                    if rng.random() < 0.25 and t > now:
                        s = pick(svcs)
                        end = t + timedelta(minutes=s[4])
                        if end <= w[1]:
                            db.add(Appointment(patient_id=pick(recent).id, practitioner_id=pid, service_id=s[0], start=t, end=end, source="seed"))
                            mins = (end - w[0]).total_seconds() / 60
                            t = w[0] + timedelta(minutes=-(-mins // 30) * 30)
                            continue
                    t += timedelta(minutes=30)
        db.flush()

        thu = add_days(today, 1)
        while dow_of(thu) != 4:
            thu = add_days(thu, 1)
        s0 = at_local(thu, 14 * 60 + 30)
        for a in db.query(Appointment).filter(Appointment.practitioner_id == "anjanjeet", Appointment.start < s0 + timedelta(minutes=45), Appointment.end > s0).all():
            db.delete(a)
        db.add(Appointment(patient_id=sarah.id, practitioner_id="anjanjeet", service_id="physio-followup", start=s0, end=s0 + timedelta(minutes=45), source="seed"))

        rebooked = [p for p in created if p.last_visit_at and 200 < (now - p.last_visit_at).days < 350 and not p.opted_out][:6]
        for i, p in enumerate(rebooked):
            date = add_days(today, 3 + i)
            w = day_window(date)
            if not w or dow_of(date) not in (1, 3, 5, 6):
                continue
            start = w[1] - timedelta(minutes=90)
            if db.query(Appointment).filter(Appointment.practitioner_id == "jordan", Appointment.start < start + timedelta(hours=1), Appointment.end > start).first():
                continue
            db.add(Appointment(patient_id=p.id, practitioner_id="jordan", service_id="rmt-60", start=start, end=start + timedelta(hours=1), source="seed"))

        # ---- history so the dashboard isn't empty
        outcomes = ["booked", "booked", "booked", "faq", "faq", "handoff", "message-taken"]
        intents = ["new booking", "new booking", "reschedule", "faq", "icbc intake", "cancel", "billing question"]
        for i in range(64):
            after = rng.random() < 0.36
            started = ago(between(0, 29)) - timedelta(hours=between(0, 12))
            outcome = pick(outcomes)
            p = pick(active)
            db.add(Call(session_id=f"seed-{i}", patient_id=p.id if rng.random() < 0.5 else None, caller_name=f"{p.first_name} {p.last_name}", caller_phone=p.phone, after_hours=after,
                        summary=f"Caller asked about {pick(intents)}. Outcome: {outcome}.", intent=pick(intents), outcome=outcome, started_at=started, ended_at=started + timedelta(minutes=between(2, 6))))
            if outcome == "booked":
                s = pick([x for x in SERVICES if x[2] != "icbc"])
                pr = pick([x for x in PRACTITIONERS if x[3] == s[3]])
                start = started + timedelta(days=between(2, 9))
                db.add(Appointment(patient_id=p.id, practitioner_id=pr[0], service_id=s[0], start=start, end=start + timedelta(minutes=s[4]),
                                   status="completed" if start < now else "booked", source="ai-phone", created_at=started))
        for _ in range(14):
            p = pick(active)
            db.add(Handoff(patient_id=p.id, reason=pick(["ICBC intake", "Billing question", "Insurance coverage question", "Complaint"]), priority="urgent" if rng.random() < 0.2 else "normal",
                           status="resolved" if rng.random() < 0.7 else "open", details=json.dumps({"callerName": f"{p.first_name} {p.last_name}", "callerPhone": p.phone}), created_at=ago(between(0, 29))))

        past = Campaign(name="Spring check-in (past)", segments=json.dumps(["massage_regulars"]), channel="sms", goal="Rebook lapsed massage regulars", created_at=ago(40))
        db.add(past)
        db.flush()
        rev = 0
        for i, p in enumerate([x for x in created if x.last_service == "massage" and not x.opted_out][:24]):
            status = "booked" if i < 3 else "replied" if i < 8 else "opted_out" if i == 8 else "sent"
            db.add(CampaignContact(campaign_id=past.id, patient_id=p.id, message=f"Hi {p.first_name}, it's been a while since your last massage at Q's Wellness. Want us to find you a time? Reply STOP to opt out.",
                                   status=status, reply=None if status == "sent" else "Sample reply", created_at=ago(40)))
            if status == "booked":
                rev += 13500
                start = ago(30)
                db.add(Appointment(patient_id=p.id, practitioner_id="khalid", service_id="rmt-60", start=start, end=start + timedelta(hours=1), status="completed", source="ai-reactivation", created_at=ago(38)))
        past.revenue_cents = rev

        themes = ["condition spotlight", "ICBC awareness", "team intro", "seasonal tip", "review highlight", "blog promo"]
        for i in range(14):
            t = pick(themes)
            when = ago(between(1, 40))
            db.add(Post(platform="facebook" if i % 2 else "instagram", theme=t, headline=t[0].upper() + t[1:], caption=f"Sample published post about {t}. Book at qwellnessclinic.janeapp.com",
                        hashtags="SurreyBC QsWellness", cta="Book online", suggested_at=when, published_at=when, status="published", external_url="https://facebook.com/qswellnessclinic"))
        for p in active[:6]:
            db.add(Message(patient_id=p.id, channel="sms", direction="outbound", to_address=p.phone, kind="confirmation", created_at=ago(between(1, 6)),
                           body=f"Hi {p.first_name}, your appointment at Q's Wellness Clinic is confirmed. See you soon!"))
        db.commit()


def main():
    init_db()
    wipe()
    seed_all()
    with SessionLocal() as db:
        print(f"Seeded {db.query(Patient).count()} fictional patients and {db.query(Appointment).count()} appointments.")


if __name__ == "__main__":
    main()
