import math
import re

from .config import KNOWLEDGE_DIR

_STOP = set("a an the is are do i you to of and or for in on at my me it we can what how".split())
_cache: list[dict] | None = None


def _tokenize(s: str) -> list[str]:
    s = re.sub(r"[^a-z0-9$ ]+", " ", s.lower())
    return [t for t in s.split() if t and t not in _STOP]


def _load() -> list[dict]:
    global _cache
    if _cache is not None:
        return _cache
    chunks = []
    for f in sorted(KNOWLEDGE_DIR.glob("*.md")):
        raw = f.read_text(encoding="utf8")
        m = re.search(r"^# (.+)$", raw, re.M)
        title = m.group(1) if m else f.name
        parts = re.split(r"^## ", raw, flags=re.M)
        for i, p in enumerate(parts):
            heading = title if i == 0 else p.split("\n")[0]
            text = (p if i == 0 else "## " + p).strip()
            chunks.append({"doc": f.name, "heading": heading, "text": text, "tokens": _tokenize(f"{title} {text}")})
    _cache = chunks
    return chunks


def search_knowledge(query: str, limit: int = 3) -> list[dict]:
    """Tiny BM25 keyword search over the markdown knowledge base (no vector DB needed)."""
    chunks = _load()
    q = _tokenize(query)
    n = len(chunks)
    avg = sum(len(c["tokens"]) for c in chunks) / n
    df = {t: sum(1 for c in chunks if t in c["tokens"]) for t in set(q)}
    k1, b = 1.4, 0.75
    scored = []
    for c in chunks:
        score = 0.0
        for t in q:
            f = c["tokens"].count(t)
            if not f:
                continue
            nn = df.get(t, 0)
            idf = math.log(1 + (n - nn + 0.5) / (nn + 0.5))
            score += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * len(c["tokens"]) / avg))
        if score > 0:
            scored.append((score, c))
    scored.sort(key=lambda x: -x[0])
    return [{"source": c["doc"], "heading": c["heading"], "text": c["text"], "score": round(s, 2)} for s, c in scored[:limit]]
