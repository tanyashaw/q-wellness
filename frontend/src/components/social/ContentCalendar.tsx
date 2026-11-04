"use client";

import { Facebook, Instagram } from "@/components/ui/brand-icons";
import { EmptyState } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { addDaysStr, dowOf, fmt, ymd } from "@/lib/scheduling";
import { cn } from "@/lib/utils";
import type { PostRow } from "./PostCard";

export function ContentCalendar({ posts }: { posts: PostRow[] }) {
  const shown = posts.filter((p) => p.status === "approved" || p.status === "published");
  if (!shown.length)
    return <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No scheduled posts yet" hint="Approve drafts in the queue and they will appear here." />;
  const today = ymd(new Date());
  const monday = addDaysStr(today, dowOf(today) === 0 ? -6 : 1 - dowOf(today));
  const weeks = [0, 7, 14].map((o) => addDaysStr(monday, o));
  return (
    <div className="space-y-4">
      {weeks.map((w) => {
        const days = Array.from({ length: 7 }, (_, i) => addDaysStr(w, i));
        const any = shown.some((p) => days.includes(ymd(new Date(p.suggestedAt))));
        if (!any) return null;
        return (
          <div key={w}>
            <div className="mb-1.5 text-xs font-semibold text-slate-500">Week of {fmt(new Date(w + "T20:00:00Z"), "MMM d")}</div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((d) => (
                <div key={d} className={cn("min-h-[110px] rounded-xl border p-2", d === today ? "border-brand-400 bg-brand-50/50" : "border-sage-200 bg-white")}>
                  <div className="mb-1 text-[11px] font-semibold text-slate-500">{fmt(new Date(d + "T20:00:00Z"), "EEE d")}</div>
                  <div className="space-y-1">
                    {shown
                      .filter((p) => ymd(new Date(p.suggestedAt)) === d)
                      .map((p) => (
                        <div key={p.id} className={cn("rounded-md px-1.5 py-1 text-[10px] leading-tight", p.status === "published" ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-900")}>
                          <div className="flex items-center gap-1 font-semibold">
                            {p.platform === "facebook" ? <Facebook className="h-2.5 w-2.5" /> : <Instagram className="h-2.5 w-2.5" />}
                            {fmt(p.suggestedAt, "h:mm a")}
                          </div>
                          <div className="line-clamp-2">{p.headline}</div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
