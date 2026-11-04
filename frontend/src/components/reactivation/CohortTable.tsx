"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/scheduling";

export interface CohortRow {
  id: string;
  name: string;
  lastService: string;
  practitioner: string | null;
  lastActivity: string;
  visitCount: number;
  isIcbc: boolean;
  channel: string;
  segments: string[];
}

export function CohortTable({ rows, labels }: { rows: CohortRow[]; labels: Record<string, string> }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 8);
  return (
    <div>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-sage-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2 pr-3 font-medium">Patient</th>
              <th className="pr-3 font-medium">Last service</th>
              <th className="pr-3 font-medium">Last activity</th>
              <th className="pr-3 font-medium">Visits</th>
              <th className="pr-3 font-medium">Channel</th>
              <th className="font-medium">Segments</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-sage-100">
                <td className="py-2 pr-3 font-medium text-brand-900">{r.name}</td>
                <td className="pr-3 text-slate-600">
                  {r.lastService}
                  {r.practitioner ? ` · ${r.practitioner}` : ""}
                </td>
                <td className="pr-3 text-slate-600">{fmt(r.lastActivity, "MMM d, yyyy")}</td>
                <td className="pr-3 text-slate-600">{r.visitCount}</td>
                <td className="pr-3 uppercase text-slate-500">{r.channel}</td>
                <td className="space-x-1">
                  {r.segments.slice(0, 2).map((s) => <Badge key={s} variant="sage">{labels[s] ?? s}</Badge>)}
                  {r.isIcbc && <Badge variant="amber">ICBC</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 8 && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </Button>
      )}
    </div>
  );
}
