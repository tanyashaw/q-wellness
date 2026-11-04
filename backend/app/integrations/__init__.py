"""Provider factory: adapters are chosen from env so mocks can be swapped for the real thing."""
from ..config import env
from .booking import JaneProvider, MockJaneProvider
from .messaging import MockMessenger, TwilioMessenger
from .social import MetaGraphPublisher, MockMetaPublisher


def get_booking():
    return JaneProvider() if env("BOOKING_PROVIDER") == "jane" else MockJaneProvider()


def get_publisher():
    return MetaGraphPublisher() if env("SOCIAL_PROVIDER") == "meta" else MockMetaPublisher()


def get_messenger():
    return TwilioMessenger() if env("MESSAGING_PROVIDER") == "twilio" else MockMessenger()


def integration_status() -> list[dict]:
    tel = env("TELEPHONY_PROVIDER", "browser")
    return [
        {"key": "booking", "label": "Booking", "active": "Jane App" if env("BOOKING_PROVIDER") == "jane" else "Mock Jane", "realName": "Jane App", "live": env("BOOKING_PROVIDER") == "jane", "note": "Pending partner API access"},
        {"key": "social", "label": "Social (Meta)", "active": "Meta Graph API" if env("SOCIAL_PROVIDER") == "meta" else "Mock Meta", "realName": "Facebook + Instagram", "live": env("SOCIAL_PROVIDER") == "meta", "note": "Pending Meta app review"},
        {"key": "messaging", "label": "Messaging", "active": "Twilio" if env("MESSAGING_PROVIDER") == "twilio" else "In-app inbox", "realName": "Twilio SMS / WhatsApp", "live": env("MESSAGING_PROVIDER") == "twilio", "note": "Needs Canadian number + CASL consent records"},
        {"key": "telephony", "label": "Telephony", "active": tel if tel != "browser" else "Browser voice", "realName": "Twilio / Vapi / Retell", "live": tel != "browser", "note": "Phone number not yet provisioned"},
    ]
