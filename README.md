# Q's Wellness AI Front Desk: Demo

A clickable sales demo for **Q's Wellness Clinic** (Surrey, BC): an AI receptionist, a social media agent and a patient reactivation agent. All external systems (Jane App, Meta, SMS, telephony) are mocked behind adapter interfaces.

> All patients are fictional. Prices are **sample pricing**.

## Setup

Frontend: Next.js (UI only). Backend: **FastAPI** (Python 3.11+) + SQLAlchemy + SQLite. Next.js proxies `/api/*` to FastAPI on port 8000.

```bash
npm run install:all  # frontend deps (npm) + backend deps (pip)
npm run seed         # creates backend/dev.db with fictional data
npm run dev:all      # FastAPI on :8000 and Next.js on :3000 together
```

Or run them separately: `npm run api` (backend) and `npm run dev` (frontend). API docs: http://localhost:8000/docs.
Set `API_URL` if the backend is not on `http://127.0.0.1:8000`.

**Groq key (required for the AI features).** Open `.env` in the project root and set:

```
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b   # any current Groq model with tool calling
```

Then restart the backend. There is no offline mode: without a key the AI features show a clear "GROQ_API_KEY is not set" message, while the calendar, inbox and dashboard still work.

Reset to a clean state before each demo: `npm run reset-demo`.
Voice (mic + spoken replies) needs **Chrome**; typing works everywhere.

Checks: `npm run typecheck` and `npm run lint` (frontend) are both clean.

## 5-minute demo script

1. **Overview (30s).** Three agents, live KPIs.
2. **Receptionist (2 min).** Click *Book 60-min massage with Khalid Saturday*, then answer "the first one", "Maya Patel", "yes", "yes". Point at **What the AI did** (availability check, booking, SMS) and the calendar jumping to the new ✨ booking. Click *End call* to show the saved summary.
   - Tick **Simulate after-hours call (Tue 9:15 AM)** to show it capturing a call the clinic would miss.
   - *Car accident, ICBC* creates a front-desk ticket (Inbox & Tickets).
   - *Reschedule my Thursday physio* uses caller ID (Sarah Chen).
   - *My back hurts badly…* shows the no-medical-advice guardrail.
3. **Social (1 min).** *Generate drafts* → Approve → *Publish now* → *Show preview* (Facebook/Instagram). Try *Comments & DMs*.
4. **Reactivation (1 min).** 100 lapsed patients in 5 segments. Select segments → *Preview 5 messages* → *Send*. Each message ends with the CASL opt-out line, and the campaign funnel appears below.
5. **Dashboard (30s).** Everything comes from the DB.

## Architecture

```
Browser ──► Next.js (UI only, :3000) ── /api/* proxy ──► FastAPI (:8000)
                                                          routes/  receptionist · social · reactivation · calendar · dashboard · inbox
                                                            │
                                                          agents/  receptionist · social · reactivation
                                                            │      LLM tool-calling loop (Groq) (agents/llm.py); prompts in agents/prompts/*.md
                                                            ▼
                                                          tools.py searchKnowledge · checkAvailability · bookAppointment · rescheduleAppointment ·
                                                                   cancelAppointment · lookupPatient · createHandoff · sendMessage · draftPost · schedulePost
                                                            │      every call → AuditLog → "What the AI did" panel
                                                            ▼
                                                          integrations/  (chosen from env in __init__.py)
                                                             BookingProvider   MockJaneProvider (SQLite)  | JaneProvider (stub)
                                                             SocialPublisher   MockMetaPublisher          | MetaGraphPublisher (stub)
                                                             Messenger         MockMessenger (inbox)      | TwilioMessenger (stub)
                                                             Telephony         browser Web Speech (frontend) | Twilio/Vapi (see notes)
                                                            ▼
                                                          SQLAlchemy + SQLite (backend/dev.db)
```

Agents never touch the database; they call tools, and tools call adapters.

### Guardrails enforced in code (not only in prompts)
- `bookAppointment` rejects unless `confirmedWithCaller=true`, and validates hours, practitioner/service match and conflicts.
- Opted-out patients are blocked in `sendMessage`; campaign messages always get "Reply STOP to opt out."; **STOP replies are handled deterministically** (CASL).
- Reactivation messages are validated (≤320 chars for SMS, opt-out line, no sensitive health terms); any message that breaks a rule is dropped and never sent.
- Social copy is sanitised for medical claims ("cures", "guarantee"…); posts need approval before publishing.
- Emergencies → 911 + urgent ticket; billing/unclear intent → `createHandoff`.

## Swap mock → real (`.env`)

| Switch | Value |
|---|---|
| `BOOKING_PROVIDER` | `mock` \| `jane` |
| `SOCIAL_PROVIDER` | `mock` \| `meta` |
| `MESSAGING_PROVIDER` | `mock` \| `twilio` |
| `TELEPHONY_PROVIDER` | `browser` \| `twilio` \| `vapi` |

Implement the matching class in `backend/app/integrations/` (see the notes in each stub); no agent or tool code changes.

## How to go live

1. **Jane App:** apply for partner API access; map staff→Practitioner, treatments→Service, appointments→Appointment; implement `JaneProvider`.
2. **Meta:** create a Business app, connect the Page and Instagram Business account, pass App Review (`pages_manage_posts`, `instagram_content_publish`, messaging scopes). Render branded cards to hosted PNGs for Instagram.
3. **Phone number:** provision a 604/778 number in Twilio and wire Vapi/Retell (or Twilio Media Streams) to `POST /api/receptionist`. Keep the call-recording notice.
4. **Hosting & privacy:** host in Canada (e.g. AWS `ca-central-1`) for PIPA; replace SQLite with Postgres; add authentication and role-based access; sign a DPA with the AI vendor; review retention of transcripts.
5. **CASL:** record express/implied consent per patient and channel, keep the opt-out line, sync STOP from Twilio webhooks to `Patient.optedOut`, include sender identification.
6. Languages: English now; Punjabi/Hindi on the roadmap.

## Project map

`frontend/` React (Next.js) app: `frontend/src/app` pages · `frontend/src/components` UI · `backend/app/main.py` FastAPI app · `backend/app/routes` HTTP endpoints · `backend/app/agents` agents + prompts · `backend/app/tools.py` tools · `backend/app/integrations` adapters · `backend/app/scheduling.py` clinic hours/slots/timezone · `backend/app/segments.py` cohort rules · `backend/seed.py` seed data · `backend/data/knowledge` knowledge base (BM25 keyword search).
