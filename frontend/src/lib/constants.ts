export const CLINIC = {
  name: "Q's Wellness Clinic",
  address: "9364 120 Street, Surrey, BC V3V 4B9",
  phone: "+1 604-613-9496",
  email: "admin@qwellnessclinic.ca",
  bookingUrl: "qwellnessclinic.janeapp.com",
  persona: "Ava, Q's Wellness virtual receptionist",
  personaFirst: "Ava",
};

export const SERVICE_IDS = [
  "rmt-30",
  "rmt-45",
  "rmt-60",
  "physio-initial",
  "physio-followup",
  "acupuncture",
  "counselling",
  "icbc-rehab",
] as const;

export const PRACTITIONER_IDS = ["khalid", "shaniya", "anjanjeet", "priya", "daniel", "jordan"] as const;

export const PRACTITIONER_NAMES: Record<string, string> = {
  khalid: "Khalid Qasmi",
  shaniya: "Shaniya",
  anjanjeet: "Anjanjeet Shergill",
  priya: "Priya Nair",
  daniel: "Daniel Okafor",
  jordan: "Jordan Reyes",
};

export const SERVICE_LABELS: Record<string, string> = {
  "rmt-30": "30-min massage",
  "rmt-45": "45-min massage",
  "rmt-60": "60-min massage",
  "physio-initial": "physio initial assessment",
  "physio-followup": "physio follow-up",
  acupuncture: "acupuncture",
  counselling: "counselling session",
  "icbc-rehab": "ICBC rehab session",
};

export const STOP_FOOTER = "Reply STOP to opt out.";

export const DEMO_CALLER = { name: "Sarah Chen", phone: "604-555-0142" };
