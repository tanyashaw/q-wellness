"use client";

import { useEffect, useState } from "react";
import { Bot, CalendarCheck, DollarSign, Megaphone, Moon, PhoneCall, Share2, UserRoundCog } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getJson, money } from "@/lib/utils";

export interface DashboardData {
  kpis: {
    callsHandled: number;
    afterHoursCaptured: number;
    aiBookings: number;
    handoffs: number;
    postsPublished: number;
    reactivationBookings: number;
    revenueCents: number;
    campaignsSent: number;
  };
  series: { day: string; calls: number; afterHours: number; phoneBookings: number; reactivationBookings: number }[];
  outcomes: { outcome: string; count: number }[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  useEffect(() => {
    getJson<DashboardData>("/api/dashboard").then(setData).catch(() => null);
  }, []);
  return data;
}

export function KpiTiles({ data, compact }: { data: DashboardData | null; compact?: boolean }) {
  const k = data?.kpis;
  const tiles = [
    { label: "Calls handled", value: k?.callsHandled, icon: PhoneCall },
    { label: "After-hours captured", value: k?.afterHoursCaptured, icon: Moon, accent: true },
    { label: "Bookings by AI", value: k?.aiBookings, icon: CalendarCheck },
    { label: "Handoffs to staff", value: k?.handoffs, icon: UserRoundCog },
    { label: "Posts published", value: k?.postsPublished, icon: Share2 },
    { label: "Reactivation bookings", value: k?.reactivationBookings, icon: Megaphone },
    { label: "Est. revenue (sample pricing)", value: k ? money(k.revenueCents) : undefined, icon: DollarSign, accent: true },
  ];
  return (
    <div className={compact ? "grid grid-cols-2 gap-3 md:grid-cols-4" : "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"}>
      {tiles.map((t) => (
        <Card key={t.label} className={t.accent ? "border-brand-200 bg-brand-50/60" : ""}>
          <div className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.accent ? "bg-brand-600 text-white" : "bg-sage-100 text-brand-700"}`}>
              <t.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              {t.value === undefined ? <Skeleton className="h-7 w-16" /> : <div className="text-2xl font-semibold text-brand-900">{t.value}</div>}
              <div className="truncate text-xs text-slate-500">{t.label}</div>
            </div>
          </div>
        </Card>
      ))}
      {!compact && (
        <Card>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-100 text-brand-700">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              {k ? <div className="text-2xl font-semibold text-brand-900">{k.campaignsSent}</div> : <Skeleton className="h-7 w-10" />}
              <div className="text-xs text-slate-500">Campaigns sent</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
