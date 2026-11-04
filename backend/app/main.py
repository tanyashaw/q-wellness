import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import AIConfigError
from .db import init_db
from .routes import calendar, misc, reactivation, receptionist, social

app = FastAPI(title="Q's Wellness AI Front Desk API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", *[o for o in os.getenv("CORS_ORIGINS", "").split(",") if o]], allow_methods=["*"], allow_headers=["*"])

init_db()


@app.exception_handler(AIConfigError)
def ai_config_error(_: Request, e: AIConfigError):
    return JSONResponse({"error": str(e)}, status_code=503)


@app.exception_handler(Exception)
def unhandled(_: Request, e: Exception):
    # Surface AI-provider problems (bad key, quota, network) as a readable message instead of a bare 500
    return JSONResponse({"error": f"{type(e).__name__}: {e}"}, status_code=500)


for r in (receptionist.router, calendar.router, social.router, reactivation.router, misc.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"ok": True}
