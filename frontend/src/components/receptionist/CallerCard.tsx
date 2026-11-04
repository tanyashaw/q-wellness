"use client";

import { Clock, Phone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/scheduling";

export function CallerCard({
  phone,
  name,
  clinicNow,
  open,
  active,
}: {
  phone: string;
  name: string | null;
  clinicNow: string | null;
  open: boolean | null;
  active: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center gap-2 rounded-xl bg-sage-50 px-3 py-2">
        <UserRound className="h-4 w-4 text-brand-600" />
        <div className="min-w-0">
          <div className="truncate font-medium text-brand-900">{active ? name ?? "New caller" : "—"}</div>
          <div className="flex items-center gap-1 text-slate-500">
            <Phone className="h-3 w-3" /> {active ? phone : "No call"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-sage-50 px-3 py-2">
        <Clock className="h-4 w-4 text-brand-600" />
        <div className="min-w-0">
          <div className="truncate font-medium text-brand-900">{clinicNow ? fmt(clinicNow, "EEE h:mm a") : "Clinic time"}</div>
          {open !== null && <Badge variant={open ? "default" : "amber"}>{open ? "Open" : "Closed"}</Badge>}
        </div>
      </div>
    </div>
  );
}
