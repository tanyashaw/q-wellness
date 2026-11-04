"""Messenger adapter: MockMessenger (in-app inbox) and a TwilioMessenger stub."""
from ..db import SessionLocal
from ..models import Message


class MockMessenger:
    name = "Mock messenger (in-app inbox)"

    def send(self, channel: str, to: str, body: str, kind: str = "general", patient_id: str | None = None, campaign_id: str | None = None, direction: str = "outbound") -> dict:
        with SessionLocal() as db:
            m = Message(patient_id=patient_id, channel=channel, direction=direction, to_address=to, body=body, kind=kind, campaign_id=campaign_id)
            db.add(m)
            db.commit()
            return {"ok": True, "id": m.id}


class TwilioMessenger:
    """TwilioMessenger (STUB). Going live: Canadian number, A2P registration, POST to the Twilio Messages API,
    mirror inbound STOP to Patient.opted_out, send only with recorded CASL consent."""

    name = "Twilio (not configured)"

    def send(self, *a, **k):
        raise NotImplementedError("TwilioMessenger is not implemented yet. Set MESSAGING_PROVIDER=mock.")
