import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const TZ = "America/Vancouver";

/** Clinic hours as [openMinute, closeMinute] from local midnight, keyed by JS getDay(). */
export const HOURS: Record<number, [number, number] | null> = {
  0: null,
  1: [10 * 60, 18 * 60 + 30],
  2: [13 * 60 + 30, 18 * 60 + 30],
  3: [13 * 60 + 30, 18 * 60 + 30],
  4: [13 * 60 + 30, 18 * 60 + 30],
  5: [10 * 60, 18 * 60 + 30],
  6: [10 * 60, 17 * 60],
};

const pad = (n: number) => String(n).padStart(2, "0");

export function fmt(d: Date | string, pattern: string): string {
  return formatInTimeZone(typeof d === "string" ? new Date(d) : d, TZ, pattern);
}

/** Local (Vancouver) calendar date as yyyy-MM-dd */
export function ymd(d: Date): string {
  return fmt(d, "yyyy-MM-dd");
}

export function dowOf(dateStr: string): number {
  return new Date(dateStr + "T12:00:00Z").getUTCDay();
}

export function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Convert a local Vancouver date + minutes-from-midnight to a UTC Date */
export function atLocal(dateStr: string, minutes: number): Date {
  return fromZonedTime(`${dateStr}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`, TZ);
}

export function dayWindow(dateStr: string): { open: Date; close: Date } | null {
  const h = HOURS[dowOf(dateStr)];
  return h ? { open: atLocal(dateStr, h[0]), close: atLocal(dateStr, h[1]) } : null;
}

export function isOpenAt(d: Date): boolean {
  const w = dayWindow(ymd(d));
  return !!w && d >= w.open && d < w.close;
}

export function openState(d: Date): string {
  return isOpenAt(d) ? "OPEN" : "CLOSED (after hours)";
}

export interface Busy {
  start: Date;
  end: Date;
}

/** Generate bookable slot start times (30-min grid) for one practitioner on one local date. */
export function generateSlots(opts: {
  dateStr: string;
  durationMin: number;
  busy: Busy[];
  now: Date;
  workDays?: number[];
}): { start: Date; end: Date }[] {
  const { dateStr, durationMin, busy, now, workDays } = opts;
  const w = dayWindow(dateStr);
  if (!w) return [];
  if (workDays && !workDays.includes(dowOf(dateStr))) return [];
  const out: { start: Date; end: Date }[] = [];
  for (let t = w.open.getTime(); t + durationMin * 60000 <= w.close.getTime(); t += 30 * 60000) {
    const start = new Date(t);
    const end = new Date(t + durationMin * 60000);
    if (start <= now) continue;
    if (busy.some((b) => start < b.end && end > b.start)) continue;
    out.push({ start, end });
  }
  return out;
}

/** The demo's "after-hours call" clock: the next Tuesday at 9:15 AM Vancouver time. */
export function simulatedAfterHoursNow(from = new Date()): Date {
  const today = ymd(from);
  for (let i = 0; i < 8; i++) {
    const day = addDaysStr(today, i);
    if (dowOf(day) === 2) {
      const t = atLocal(day, 9 * 60 + 15);
      if (t > from) return t;
    }
  }
  return atLocal(addDaysStr(today, 7), 9 * 60 + 15);
}

export function humanTime(d: Date | string): string {
  return fmt(d, "EEE MMM d 'at' h:mm a");
}

export const HOURS_TEXT = [
  "Mon & Fri 10:00 AM – 6:30 PM",
  "Tue–Thu 1:30 PM – 6:30 PM",
  "Sat 10:00 AM – 5:00 PM",
  "Sun closed",
];
