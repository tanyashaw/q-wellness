import json
from typing import Any

from .db import SessionLocal
from .models import AuditLog


def write_audit(agent: str, session_id: str | None, tool: str, input: Any, output: Any, summary: str, ok: bool) -> str:
    with SessionLocal() as db:
        row = AuditLog(
            agent=agent,
            session_id=session_id,
            tool=tool,
            input=json.dumps(input or {}, default=str),
            output=json.dumps(output or {}, default=str),
            summary=summary,
            ok=ok,
        )
        db.add(row)
        db.commit()
        return row.id
