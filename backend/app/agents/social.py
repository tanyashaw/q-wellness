import json
from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import select

from ..config import CLINIC
from ..db import SessionLocal, iso
from ..models import Post
from ..scheduling import add_days, at_local, ymd
from ..tools import DraftPostIn, ToolContext, execute_tool
from .llm import complete, load_prompt


class _Resp(BaseModel):
    posts: list[DraftPostIn]


def _slot_times(week_start: str, n: int) -> list[str]:
    days = [0, 2, 4, 5, 1, 3, 6]
    mins = [12 * 60, 18 * 60, 9 * 60 + 30, 17 * 60]
    return [iso(at_local(add_days(week_start, days[i % len(days)]), mins[i % len(mins)])) for i in range(n)]


def generate_drafts(week_start: str, posts_per_week: int, themes: list[str], tone: str, platforms: list[str]) -> dict:
    times = _slot_times(week_start, posts_per_week)
    shape = '{"posts":[{"platform","theme","headline","caption","hashtags":[string],"imagePrompt","suggestedTime","cta"}]}'
    prompt = (
        f"Create {posts_per_week} posts for the week starting {week_start}.\n"
        f"Themes to rotate through: {', '.join(themes)}.\n"
        f"Tone: {tone}.\n"
        f"Platforms (alternate between them): {', '.join(platforms)}.\n"
        f"Suggested times to use in order (ISO): {', '.join(times)}.\n"
        f"Return JSON: {shape}"
    )
    raw = complete(load_prompt("social"), prompt, 4000, json_mode=True)
    drafts = _Resp.model_validate(json.loads(raw)).posts
    ids = []
    for d in drafts:
        ev = execute_tool("draftPost", d.model_dump(), ToolContext("social", f"social-{week_start}", datetime.utcnow()))
        if ev["ok"]:
            ids.append(ev["output"]["postId"])
    with SessionLocal() as db:
        posts = db.scalars(select(Post).where(Post.id.in_(ids)).order_by(Post.suggested_at)).all()
        return {"posts": [post_json(p) for p in posts]}


def post_json(p: Post) -> dict:
    return {"id": p.id, "platform": p.platform, "theme": p.theme, "headline": p.headline, "caption": p.caption, "hashtags": p.hashtags,
            "imagePrompt": p.image_prompt, "cta": p.cta, "suggestedAt": iso(p.suggested_at), "status": p.status,
            "publishedAt": iso(p.published_at), "externalUrl": p.external_url}


def regenerate(post_id: str) -> dict | None:
    with SessionLocal() as db:
        old = db.get(Post, post_id)
        old_when, platform, theme = old.suggested_at, old.platform, old.theme or "seasonal tip"
    res = generate_drafts(ymd(old_when), 1, [theme], "caring and professional, with a fresh angle different from before", [platform])
    fresh = res["posts"][0] if res["posts"] else None
    if fresh:
        with SessionLocal() as db:
            db.get(Post, fresh["id"]).suggested_at = old_when
            db.get(Post, post_id).status = "rejected"
            db.commit()
        fresh["suggestedAt"] = iso(old_when)
    return fresh


def draft_dm_reply(message: str, platform: str) -> str:
    prompt = (
        f"Draft a short, warm reply to this {platform} direct message to Q's Wellness Clinic. "
        f"No medical advice. Include the booking link {CLINIC['booking_url']}. Reply with the message text only.\n\n"
        f'Message: "{message}"'
    )
    return complete(load_prompt("social"), prompt, 300).strip()
