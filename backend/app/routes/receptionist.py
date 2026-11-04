import json
import queue
import threading

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..agents.receptionist import end_call, receptionist_turn
from ..config import has_api_key

router = APIRouter(prefix="/api/receptionist")


@router.get("")
def mode():
    return {"configured": has_api_key()}


class TurnBody(BaseModel):
    sessionId: str
    message: str | None = None
    start: bool = False
    end: bool = False
    afterHours: bool = False
    callerPhone: str | None = None


@router.post("")
def turn(body: TurnBody):
    if body.end:
        r = end_call(body.sessionId)
        if not r:
            raise HTTPException(404, "No active call")
        return r

    q: queue.Queue = queue.Queue()

    def work():
        try:
            r = receptionist_turn(body.sessionId, body.message, body.start, body.afterHours, body.callerPhone,
                                  lambda d: q.put({"type": "text", "delta": d}), lambda e: q.put({"type": "tool", "event": e}))
            q.put({"type": "done", **r})
        except Exception as e:  # noqa: BLE001
            q.put({"type": "error", "message": str(e)})
        q.put(None)

    threading.Thread(target=work, daemon=True).start()

    def gen():
        while (item := q.get()) is not None:
            yield json.dumps(item) + "\n"

    return StreamingResponse(gen(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache"})
