import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]  # project root
load_dotenv(ROOT / ".env")

MODEL = os.getenv("GROQ_MODEL") or "openai/gpt-oss-120b"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"  # Groq is OpenAI-compatible
DB_PATH = ROOT / "backend" / "dev.db"
KNOWLEDGE_DIR = ROOT / "backend" / "data" / "knowledge"
PROMPTS_DIR = Path(__file__).resolve().parent / "agents" / "prompts"


class AIConfigError(Exception):
    """Raised when the Groq API key is missing."""


def has_api_key() -> bool:
    return bool(os.getenv("GROQ_API_KEY"))


def require_api_key() -> None:
    if not has_api_key():
        raise AIConfigError("GROQ_API_KEY is not set. Add it to the .env file in the project root and restart the backend.")


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


CLINIC = {
    "name": "Q's Wellness Clinic",
    "address": "9364 120 Street, Surrey, BC V3V 4B9",
    "phone": "+1 604-613-9496",
    "booking_url": "qwellnessclinic.janeapp.com",
    "persona": "Ava, Q's Wellness virtual receptionist",
}

SERVICE_IDS = ["rmt-30", "rmt-45", "rmt-60", "physio-initial", "physio-followup", "acupuncture", "counselling", "icbc-rehab"]
PRACTITIONER_IDS = ["khalid", "shaniya", "anjanjeet", "priya", "daniel", "jordan"]
PRACTITIONER_NAMES = {
    "khalid": "Khalid Qasmi",
    "shaniya": "Shaniya",
    "anjanjeet": "Anjanjeet Shergill",
    "priya": "Priya Nair",
    "daniel": "Daniel Okafor",
    "jordan": "Jordan Reyes",
}
SERVICE_LABELS = {
    "rmt-30": "30-min massage",
    "rmt-45": "45-min massage",
    "rmt-60": "60-min massage",
    "physio-initial": "physio initial assessment",
    "physio-followup": "physio follow-up",
    "acupuncture": "acupuncture",
    "counselling": "counselling session",
    "icbc-rehab": "ICBC rehab session",
}
STOP_FOOTER = "Reply STOP to opt out."
