"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentInfo {
  key: string;
  label: string;
  hint: string;
}

export function SegmentChips({
  segments,
  counts,
  selected,
  onToggle,
}: {
  segments: readonly SegmentInfo[];
  counts: Record<string, number>;
  selected: string[];
  onToggle: (k: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {segments.map((s) => {
        const on = selected.includes(s.key);
        return (
          <button
            key={s.key}
            onClick={() => onToggle(s.key)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
              on ? "border-brand-600 bg-brand-50" : "border-sage-200 bg-white hover:bg-sage-50",
            )}
          >
            <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", on ? "border-brand-600 bg-brand-600 text-white" : "border-sage-300")}>
              {on && <Check className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-brand-900">{s.label}</div>
              <div className="truncate text-[11px] text-slate-500">{s.hint}</div>
            </div>
            <div className="text-xl font-semibold text-brand-700">{counts[s.key] ?? 0}</div>
          </button>
        );
      })}
    </div>
  );
}
