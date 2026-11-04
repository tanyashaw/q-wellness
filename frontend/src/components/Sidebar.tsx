"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, Heart, Home, Inbox, Megaphone, PhoneCall, Share2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/receptionist", label: "AI Receptionist", icon: PhoneCall },
  { href: "/social", label: "Social Media", icon: Share2 },
  { href: "/reactivation", label: "Reactivation", icon: Megaphone },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/inbox", label: "Inbox & Tickets", icon: Inbox },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

export function Sidebar() {
  const path = usePathname();
  const [ai, setAi] = useState<{ configured: boolean } | null>(null);
  useEffect(() => {
    fetch("/api/receptionist", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAi(d))
      .catch(() => setAi(null));
  }, []);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-sage-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white">Q</div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-brand-900">Q&apos;s Wellness</div>
          <div className="text-xs text-slate-500">AI Front Desk</div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-sage-50",
              )}
            >
              <n.icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-slate-400")} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden space-y-2 border-t border-sage-200 px-5 py-4 text-xs text-slate-500 lg:block">
        <div className="flex items-center gap-2">
          <Sparkles className={cn("h-3.5 w-3.5", ai?.configured ? "text-brand-600" : "text-amber-600")} />
          {ai === null ? "Checking AI…" : ai.configured ? "AI assistant connected" : "AI assistant not connected"}
        </div>
        <div className="flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 text-rose-400" /> Surrey, BC · est. 2018
        </div>
      </div>
    </aside>
  );
}
