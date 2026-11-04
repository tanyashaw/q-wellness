import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, utcnow


def cuid() -> str:
    return "c" + uuid.uuid4().hex[:24]


class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    first_name: Mapped[str] = mapped_column(String)
    last_name: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    preferred_channel: Mapped[str] = mapped_column(String, default="sms")
    consent_sms: Mapped[bool] = mapped_column(Boolean, default=True)
    consent_email: Mapped[bool] = mapped_column(Boolean, default=True)
    opted_out: Mapped[bool] = mapped_column(Boolean, default=False)
    is_icbc: Mapped[bool] = mapped_column(Boolean, default=False)
    last_visit_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_inquiry_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_service: Mapped[str | None] = mapped_column(String, nullable=True)
    last_practitioner: Mapped[str | None] = mapped_column(String, nullable=True)
    visit_count: Mapped[int] = mapped_column(Integer, default=0)
    unfinished_plan: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Practitioner(Base):
    __tablename__ = "practitioners"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    discipline: Mapped[str] = mapped_column(String)
    bio: Mapped[str] = mapped_column(String, default="")
    is_fictional: Mapped[bool] = mapped_column(Boolean, default=False)
    work_days: Mapped[str] = mapped_column(String, default="1,2,3,4,5,6")


class Service(Base):
    __tablename__ = "services"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    discipline: Mapped[str] = mapped_column(String)
    duration_min: Mapped[int] = mapped_column(Integer)
    price_cents: Mapped[int] = mapped_column(Integer)


class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), index=True)
    practitioner_id: Mapped[str] = mapped_column(ForeignKey("practitioners.id"), index=True)
    service_id: Mapped[str] = mapped_column(ForeignKey("services.id"))
    start: Mapped[datetime] = mapped_column(DateTime, index=True)
    end: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String, default="booked")
    source: Mapped[str] = mapped_column(String, default="staff")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    patient: Mapped[Patient] = relationship()
    practitioner: Mapped[Practitioner] = relationship()
    service: Mapped[Service] = relationship()


class Call(Base):
    __tablename__ = "calls"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    session_id: Mapped[str] = mapped_column(String, unique=True)
    patient_id: Mapped[str | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    caller_name: Mapped[str | None] = mapped_column(String, nullable=True)
    caller_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    channel: Mapped[str] = mapped_column(String, default="browser-voice")
    after_hours: Mapped[bool] = mapped_column(Boolean, default=False)
    transcript: Mapped[str] = mapped_column(Text, default="[]")
    summary: Mapped[str] = mapped_column(Text, default="")
    intent: Mapped[str] = mapped_column(String, default="")
    outcome: Mapped[str] = mapped_column(String, default="")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    patient_id: Mapped[str | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String)
    direction: Mapped[str] = mapped_column(String)
    to_address: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String, default="general")
    campaign_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    patient: Mapped[Patient | None] = relationship()


class Handoff(Base):
    __tablename__ = "handoffs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    patient_id: Mapped[str | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    call_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reason: Mapped[str] = mapped_column(String)
    priority: Mapped[str] = mapped_column(String, default="normal")
    details: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    patient: Mapped[Patient | None] = relationship()


class Post(Base):
    __tablename__ = "posts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    platform: Mapped[str] = mapped_column(String)
    theme: Mapped[str] = mapped_column(String, default="")
    caption: Mapped[str] = mapped_column(Text)
    hashtags: Mapped[str] = mapped_column(String, default="")
    image_prompt: Mapped[str] = mapped_column(Text, default="")
    headline: Mapped[str] = mapped_column(String, default="")
    cta: Mapped[str] = mapped_column(String, default="")
    suggested_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String, default="draft")
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    external_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    name: Mapped[str] = mapped_column(String)
    segments: Mapped[str] = mapped_column(String)
    channel: Mapped[str] = mapped_column(String)
    goal: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="sent")
    revenue_cents: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CampaignContact(Base):
    __tablename__ = "campaign_contacts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="sent")
    reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    patient: Mapped[Patient] = relationship()


class KnowledgeDoc(Base):
    __tablename__ = "knowledge_docs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    slug: Mapped[str] = mapped_column(String, unique=True)
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=cuid)
    agent: Mapped[str] = mapped_column(String)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    tool: Mapped[str] = mapped_column(String)
    input: Mapped[str] = mapped_column(Text)
    output: Mapped[str] = mapped_column(Text)
    summary: Mapped[str] = mapped_column(Text, default="")
    ok: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
