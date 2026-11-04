"use client";

import Link from "next/link";
import { ArrowRight, Megaphone, PhoneCall, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KpiTiles, useDashboard } from "@/components/KpiTiles";

const AGENTS = [
  {
    href: "/receptionist",
    icon: PhoneCall,
    title: "AI Receptionist",
    pitch: "Answers every call, 24/7. Books, reschedules, cancels, handles ICBC intake and never gives medical advice.",
    cta: "Take a call",
  },
  {
    href: "/social",
    icon: Share2,
    title: "Social Media Agent",
    pitch: "Drafts a week of Facebook and Instagram posts in your voice. You approve; it publishes.",
    cta: "Generate next week",
  },
  {
    href: "/reactivation",
    icon: Megaphone,
    title: "Patient Reactivation",
    pitch: "Finds patients 6–12 months lapsed, writes a personal message to each, and books the replies.",
    cta: "Win patients back",
  },
];

export default function Home() {
  const data = useDashboard();
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white md:p-10">
        <p className="text-sm font-medium text-brand-100">Q&apos;s Wellness Clinic · Surrey, BC</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Your AI front desk, working while you treat.</h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          Three agents that answer calls, fill your calendar and bring lapsed patients back. Every action is logged so you always see what the AI did.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {AGENTS.map((a) => (
          <Link key={a.href} href={a.href} className="group">
            <Card className="h-full p-5 transition-shadow group-hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <a.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-brand-900">{a.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{a.pitch}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                {a.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Live numbers (last 30 days of demo history)</h2>
        <KpiTiles data={data} compact />
      </div>
    </div>
  );
}
