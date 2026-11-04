"use client";

import { BookOpen, CalendarCheck, CalendarClock, CalendarSearch, CalendarX, LifeBuoy, MessageSquareText, Search, UserSearch, Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ToolEvent } from "@/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  searchKnowledge: BookOpen,
  checkAvailability: CalendarSearch,
  bookAppointment: CalendarCheck,
  rescheduleAppointment: CalendarClock,
  cancelAppointment: CalendarX,
  lookupPatient: UserSearch,
  createHandoff: LifeBuoy,
  sendMessage: MessageSquareText,
};

/** Plain-language list of what the AI did. Raw tool inputs/outputs are intentionally not shown. */
export function ActionTimeline({ events }: { events: ToolEvent[] }) {
  if (!events.length)
    return <EmptyState icon={<Search className="h-6 w-6" />} title="Nothing yet" hint="Checks, bookings, tickets and texts the AI makes will appear here, live." />;
  return (
    <ol className="space-y-2">
      {events.map((e) => {
        const Icon = ICONS[e.tool] ?? Wrench;
        return (
          <li key={e.id} className="slide-in">
            <div className={cn("flex items-center gap-3 rounded-xl border p-3", e.ok ? "border-sage-200 bg-white" : "border-rose-200 bg-rose-50")}>
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", e.ok ? "bg-brand-50 text-brand-700" : "bg-rose-100 text-rose-700")}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 text-sm font-medium text-brand-900">{e.summary}</div>
              <div className="shrink-0 text-[11px] text-slate-400">{new Date(e.at).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
