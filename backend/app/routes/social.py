from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from ..agents.social import draft_dm_reply, generate_drafts, post_json, regenerate
from ..audit import write_audit
from ..db import SessionLocal, utcnow
from ..integrations import get_publisher
from ..models import Post
from ..scheduling import add_days, dow_of, now_utc, parse_iso, ymd
from ..tools import sanitize_claims

router = APIRouter(prefix="/api/social")


@router.get("")
def list_posts():
    with SessionLocal() as db:
        posts = db.scalars(select(Post).where(Post.status.in_(["draft", "approved", "published"])).order_by(Post.suggested_at)).all()
        cutoff = utcnow() - timedelta(days=7)
        return {"posts": [post_json(p) for p in posts if p.status != "published" or (p.published_at and p.published_at > cutoff)]}


class GenerateBody(BaseModel):
    weekStart: str | None = None
    postsPerWeek: int = Field(default=4, ge=1, le=10)
    themes: list[str] = Field(min_length=1)
    tone: str = "caring and professional"
    platforms: list[Literal["facebook", "instagram"]] = Field(min_length=1)


def _next_monday() -> str:
    today = ymd(now_utc())
    for i in range(1, 8):
        if dow_of(add_days(today, i)) == 1:
            return add_days(today, i)
    return today


@router.post("/generate")
def generate(b: GenerateBody):
    return generate_drafts(b.weekStart or _next_monday(), b.postsPerWeek, b.themes, b.tone, list(b.platforms))


class DmBody(BaseModel):
    message: str
    platform: str = "Instagram"


@router.post("/dm")
def dm(b: DmBody):
    return {"reply": draft_dm_reply(b.message, b.platform)}


class PatchBody(BaseModel):
    caption: str | None = None
    headline: str | None = None
    hashtags: str | None = None
    suggestedAt: str | None = None
    status: Literal["draft", "approved", "rejected"] | None = None


@router.patch("/{post_id}")
def patch(post_id: str, b: PatchBody):
    with SessionLocal() as db:
        p = db.get(Post, post_id)
        if not p:
            raise HTTPException(404, "Not found")
        if b.caption is not None:
            p.caption = sanitize_claims(b.caption)
        if b.headline is not None:
            p.headline = sanitize_claims(b.headline)
        if b.hashtags is not None:
            p.hashtags = b.hashtags
        if b.suggestedAt:
            p.suggested_at = parse_iso(b.suggestedAt)
        if b.status:
            p.status = b.status
        db.commit()
        return {"post": post_json(p)}


@router.post("/{post_id}/approve")
def approve(post_id: str):
    with SessionLocal() as db:
        p = db.get(Post, post_id)
        if not p:
            raise HTTPException(404, "Not found")
        p.status = "approved"
        db.commit()
        write_audit("social", None, "approvePost", {"id": post_id}, {"ok": True}, f'Owner approved {p.platform} post "{p.headline}"', True)
        return {"post": post_json(p)}


@router.post("/{post_id}/publish")
def publish(post_id: str):
    with SessionLocal() as db:
        p = db.get(Post, post_id)
        if not p:
            raise HTTPException(404, "Not found")
        if p.status in ("draft", "rejected"):
            raise HTTPException(400, "Approve the post before publishing")
        try:
            r = get_publisher().publish(p.id, p.platform, p.caption, p.hashtags)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(500, str(e))
        p.status, p.published_at, p.external_url = "published", utcnow(), r["url"]
        db.commit()
        write_audit("social", None, "publishPost", {"id": p.id}, r, f"Published {p.platform} post → {r['url']}", True)
        return {"post": post_json(p)}


@router.post("/{post_id}/regenerate")
def regen(post_id: str):
    return {"post": regenerate(post_id)}
