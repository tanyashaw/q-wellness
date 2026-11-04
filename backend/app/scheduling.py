from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Vancouver")
UTC = timezone.utc

# [open_minute, close_minute] from local midnight, keyed by JS-style getDay() (0 = Sunday)
HOURS: dict[int, tuple[int, int] | None] = {
    0: None,
    1: (10 * 60, 18 * 60 + 30),
    2: (13 * 60 + 30, 18 * 60 + 30),
    3: (13 * 60 + 30, 18 * 60 + 30),
    4: (13 * 60 + 30, 18 * 60 + 30),
    5: (10 * 60, 18 * 60 + 30),
    6: (10 * 60, 17 * 60),
}
HOURS_TEXT = ["Mon & Fri 10:00 AM – 6:30 PM", "Tue–Thu 1:30 PM – 6:30 PM", "Sat 10:00 AM – 5:00 PM", "Sun closed"]


def now_utc() -> datetime:
    """Naive UTC now (matches DB storage)."""
    return datetime.now(UTC).replace(tzinfo=None)


def to_local(dt: datetime) -> datetime:
    """Naive-UTC (or aware) datetime -> aware Vancouver datetime."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(TZ)


def parse_iso(s: str) -> datetime:
    """Parse an ISO string (with Z / offset, or naive meaning UTC) to naive UTC."""
    d = datetime.fromisoformat(s.replace("Z", "+00:00"))
    if d.tzinfo is None:
        return d
    return d.astimezone(UTC).replace(tzinfo=None)


def weekday(dt: datetime) -> str:
    return to_local(dt).strftime("%A")


def human_time(dt: datetime) -> str:
    """e.g. 'Sat Nov 7 at 10:00 AM'"""
    l = to_local(dt)
    return f"{l.strftime('%a %b')} {l.day} at {l.hour % 12 or 12}:{l.minute:02d} {'AM' if l.hour < 12 else 'PM'}"


def short_time(dt: datetime) -> str:
    """e.g. 'Sat 10:30 AM'"""
    l = to_local(dt)
    return f"{l.strftime('%a')} {l.hour % 12 or 12}:{l.minute:02d} {'AM' if l.hour < 12 else 'PM'}"


def clock(dt: datetime) -> str:
    l = to_local(dt)
    return f"{l.hour % 12 or 12}:{l.minute:02d} {'AM' if l.hour < 12 else 'PM'}"


def ymd(dt: datetime) -> str:
    return to_local(dt).strftime("%Y-%m-%d")


def dow_of(date_str: str) -> int:
    """JS getDay(): Sunday = 0."""
    return (date.fromisoformat(date_str).weekday() + 1) % 7


def add_days(date_str: str, n: int) -> str:
    return (date.fromisoformat(date_str) + timedelta(days=n)).isoformat()


def at_local(date_str: str, minutes: int) -> datetime:
    """Local Vancouver date + minutes-from-midnight -> naive UTC."""
    d = date.fromisoformat(date_str)
    local = datetime(d.year, d.month, d.day, minutes // 60, minutes % 60, tzinfo=TZ)
    return local.astimezone(UTC).replace(tzinfo=None)


def day_window(date_str: str) -> tuple[datetime, datetime] | None:
    h = HOURS[dow_of(date_str)]
    if not h:
        return None
    return at_local(date_str, h[0]), at_local(date_str, h[1])


def is_open_at(dt: datetime) -> bool:
    w = day_window(ymd(dt))
    return bool(w) and w[0] <= dt < w[1]


def open_state(dt: datetime) -> str:
    return "OPEN" if is_open_at(dt) else "CLOSED (after hours)"


def generate_slots(date_str: str, duration_min: int, busy: list[tuple[datetime, datetime]], now: datetime, work_days: list[int] | None = None):
    w = day_window(date_str)
    if not w:
        return []
    if work_days is not None and dow_of(date_str) not in work_days:
        return []
    out = []
    t = w[0]
    while t + timedelta(minutes=duration_min) <= w[1]:
        end = t + timedelta(minutes=duration_min)
        if t > now and not any(t < b_end and end > b_start for b_start, b_end in busy):
            out.append((t, end))
        t += timedelta(minutes=30)
    return out


def simulated_after_hours_now(frm: datetime | None = None) -> datetime:
    """The demo's after-hours clock: the next Tuesday at 9:15 AM Vancouver time."""
    frm = frm or now_utc()
    today = ymd(frm)
    for i in range(8):
        day = add_days(today, i)
        if dow_of(day) == 2:
            t = at_local(day, 9 * 60 + 15)
            if t > frm:
                return t
    return at_local(add_days(today, 7), 9 * 60 + 15)
