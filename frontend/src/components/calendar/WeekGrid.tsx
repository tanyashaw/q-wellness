"use client";

import { Sparkles } from "lucide-react";
import { HOURS, fmt } from "@/lib/scheduling";
import { cn } from "@/lib/utils";

export interface GridAppt {
  id: string;
  start: string;
  end: string;
  patient: string;
  service: string;
  source: string;
  columnKey: string;
}
export interface GridColumn {
  key: string;
  label: string;
  sub?: string;
  dateStr: string;
}

const START = 10 * 60;
const END = 18 * 60 + 30;

const minutesOf = (iso: string) => Number(fmt(iso, "H")) * 60 + Number(fmt(iso, "m"));
const hourLabel = (m: number) => `${Math.floor(m / 60) % 12 || 12}${m < 720 ? "a" : "p"}`;
const dowOfDate =(d: string) => new Date(d + "T12:00:00Z").getUTCDay();

export function WeekGrid({
  columns,
  appointments,
  rowH = 28,
  highlightIds,
}: {
  columns: GridColumn[];
  appointments: GridAppt[];
  rowH?: number;
  highlightIds?: Set<string>;
}) {
  const rows = (END - START) / 30;
  const height = rows * rowH;
  return (
    <div className="overflow-x-auto scroll-thin">
      <div className="flex min-w-[560px]" style={{ paddingRight: 2 }}>
        <div className="w-12 shrink-0 pt-9 text-right text-[10px] text-slate-400">
          {Array.from({ length: rows + 1 }, (_, i) => (
            <div key={i} style={{ height: i === rows ? 0 : rowH }} className="-mt-1.5 pr-1">
              {i % 2 === 0 ? hourLabel(START + i * 30) : ""}
            </div>
          ))}
        </div>
        {columns.map((c) => {
          const h = HOURS[dowOfDate(c.dateStr)];
          const items = appointments.filter((a) => a.columnKey === c.key);
          return (
            <div key={c.key} className="min-w-0 flex-1 border-l border-sage-200">
              <div className="flex h-9 flex-col items-center justify-center border-b border-sage-200 text-center">
                <div className="truncate px-1 text-xs font-semibold text-brand-900">{c.label}</div>
                {c.sub && <div className="text-[10px] text-slate-400">{c.sub}</div>}
              </div>
              <div className="relative" style={{ height }}>
                {Array.from({ length: rows }, (_, i) => (
                  <div key={i} className={cn("border-b", i % 2 ? "border-sage-100" : "border-sage-200")} style={{ height: rowH }} />
                ))}
                {!h && <div className="hatch absolute inset-0 flex items-center justify-center text-[10px] font-medium text-slate-400">Closed</div>}
                {h && h[0] > START && <div className="hatch absolute inset-x-0 top-0" style={{ height: ((h[0] - START) / 30) * rowH }} />}
                {h && h[1] < END && <div className="hatch absolute inset-x-0" style={{ top: ((h[1] - START) / 30) * rowH, height: ((END - h[1]) / 30) * rowH }} />}
                {items.map((a) => {
                  const top = ((minutesOf(a.start) - START) / 30) * rowH;
                  const hh = Math.max(((minutesOf(a.end) - minutesOf(a.start)) / 30) * rowH - 2, 18);
                  const ai = a.source.startsWith("ai-");
                  return (
                    <div
                      key={a.id}
                      title={`${a.patient} · ${a.service} · ${fmt(a.start, "h:mm a")}`}
                      className={cn(
                        "absolute inset-x-0.5 overflow-hidden rounded-md border px-1 py-0.5 text-[10px] leading-tight",
                        ai ? "border-brand-500 bg-brand-100 text-brand-900" : "border-sage-300 bg-sage-100 text-slate-700",
                        highlightIds?.has(a.id) && "slide-in ring-2 ring-brand-500",
                      )}
                      style={{ top, height: hh }}
                    >
                      <div className="flex items-center gap-0.5 truncate font-semibold">
                        {ai && <Sparkles className="h-2.5 w-2.5 shrink-0 text-brand-600" />}
                        {a.patient}
                      </div>
                      {hh > 30 && <div className="truncate opacity-75">{a.service.replace("Registered Massage Therapy", "RMT")}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
