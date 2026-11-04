"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeekGrid, type GridAppt } from "@/components/calendar/WeekGrid";
import { addDaysStr, dowOf, fmt, ymd } from "@/lib/scheduling";
import { cn, getJson } from "@/lib/utils";

interface Cal {
  practitioners: { id: string; name: string; title: string; isFictional: boolean }[];
  appointments: (Omit<GridAppt, "columnKey"> & { practitionerId: string })[];
}

function mondayOf(d: string) {
  const dow = dowOf(d);
  return addDaysStr(d, dow === 0 ? -6 : 1 - dow);
}

export default function CalendarPage() {
  const [week, setWeek] = useState(() => mondayOf(ymd(new Date())));
  const [cal, setCal] = useState<Cal | null>(null);
  const [prac, setPrac] = useState("khalid");

  const load = useCallback(() => {
    setCal(null);
    getJson<Cal>(`/api/calendar?from=${week}&days=7`).then(setCal).catch(() => null);
  }, [week]);
  useEffect(load, [load]);

  const columns = Array.from({ length: 7 }, (_, i) => {
    const d = addDaysStr(week, i);
    return { key: d, label: fmt(new Date(d + "T20:00:00Z"), "EEE"), sub: fmt(new Date(d + "T20:00:00Z"), "MMM d"), dateStr: d };
  });
  const appts: GridAppt[] = (cal?.appointments ?? []).filter((a) => a.practitionerId === prac).map((a) => ({ ...a, columnKey: ymd(new Date(a.start)) }));
  const aiCount = appts.filter((a) => a.source.startsWith("ai-")).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">Calendar</h1>
          <p className="text-sm text-slate-500">Every practitioner&apos;s week. Appointments booked by the AI are highlighted.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeek(addDaysStr(week, -7))} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[150px] text-center text-sm font-medium">
            {fmt(new Date(week + "T20:00:00Z"), "MMM d")} – {fmt(new Date(addDaysStr(week, 6) + "T20:00:00Z"), "MMM d")}
          </div>
          <Button variant="outline" size="icon" onClick={() => setWeek(addDaysStr(week, 7))} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(cal?.practitioners ?? []).map((p) => (
          <button
            key={p.id}
            onClick={() => setPrac(p.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              prac === p.id ? "border-brand-600 bg-brand-600 text-white" : "border-sage-300 bg-white text-slate-700 hover:bg-sage-50",
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{cal?.practitioners.find((p) => p.id === prac)?.title ?? "Loading…"}</CardTitle>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-sage-300 bg-sage-100" /> Staff / existing</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-brand-600" /><span className="h-3 w-3 rounded border border-brand-500 bg-brand-100" /> Booked by AI ({aiCount})</span>
          </div>
        </CardHeader>
        <CardContent>{cal ? <WeekGrid columns={columns} appointments={appts} rowH={32} /> : <Skeleton className="h-[500px] w-full" />}</CardContent>
      </Card>
    </div>
  );
}
