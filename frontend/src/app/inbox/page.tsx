"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Inbox as InboxIcon, LifeBuoy, Mail, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { fmt } from "@/lib/scheduling";
import { cn, getJson, postJson } from "@/lib/utils";

interface Msg {
  id: string;
  channel: string;
  direction: string;
  toAddress: string;
  body: string;
  kind: string;
  createdAt: string;
  patientName: string | null;
}
interface Handoff {
  id: string;
  reason: string;
  priority: string;
  status: string;
  details: string;
  createdAt: string;
  patientName: string | null;
}
interface Audit {
  id: string;
  agent: string;
  tool: string;
  summary: string;
  ok: boolean;
  createdAt: string;
}

export default function InboxPage() {
  const toast = useToast();
  const [data, setData] = useState<{ messages: Msg[]; handoffs: Handoff[]; audits: Audit[] } | null>(null);
  const [tab, setTab] = useState<"messages" | "tickets">("messages");
  const load = () => getJson<{ messages: Msg[]; handoffs: Handoff[]; audits: Audit[] }>("/api/inbox").then(setData).catch(() => null);
  useEffect(() => { void load(); }, []);

  const open = data?.handoffs.filter((h) => h.status === "open").length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">Inbox & Tickets</h1>
        <p className="text-sm text-slate-500">Everything the AI sent, received, or escalated to your front-desk staff. Demo messages are not actually delivered.</p>
      </div>
      <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-sage-200">
        {([["messages", "Messages"], ["tickets", `Handoff tickets${open ? ` (${open} open)` : ""}`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-medium", tab === k ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-sage-50")}>{l}</button>
        ))}
      </div>

      {!data ? (
        <Skeleton className="h-64 w-full" />
      ) : tab === "messages" ? (
        data.messages.length === 0 ? <EmptyState icon={<InboxIcon className="h-6 w-6" />} title="No messages yet" /> : (
          <div className="space-y-2">
            {data.messages.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex gap-3 pt-4">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", m.direction === "inbound" ? "bg-sage-100 text-sage-500" : "bg-brand-50 text-brand-700")}>
                    {m.channel === "email" ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-brand-900">{m.direction === "inbound" ? `From ${m.patientName ?? m.toAddress}` : `To ${m.patientName ?? m.toAddress}`}</span>
                      <Badge variant={m.direction === "inbound" ? "slate" : "default"}>
                        {m.direction === "inbound" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />} {m.direction}
                      </Badge>
                      <Badge variant="sage">{m.channel}</Badge>
                      <Badge variant="sage">{m.kind}</Badge>
                      <span className="ml-auto text-slate-400">{fmt(m.createdAt, "MMM d, h:mm a")}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{m.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : tab === "tickets" ? (
        data.handoffs.length === 0 ? <EmptyState icon={<LifeBuoy className="h-6 w-6" />} title="No tickets" hint="ICBC intake and escalations land here." /> : (
          <div className="space-y-2">
            {data.handoffs.map((h) => {
              const d = (() => { try { return JSON.parse(h.details) as Record<string, string>; } catch { return {}; } })();
              return (
                <Card key={h.id}>
                  <CardContent className="flex flex-wrap items-start gap-3 pt-4">
                    <LifeBuoy className={cn("mt-0.5 h-5 w-5", h.priority === "urgent" ? "text-rose-600" : "text-brand-600")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-brand-900">{h.reason}</span>
                        {h.priority === "urgent" && <Badge variant="rose">urgent</Badge>}
                        <Badge variant={h.status === "open" ? "amber" : "sage"}>{h.status}</Badge>
                        <span className="text-xs text-slate-400">{fmt(h.createdAt, "MMM d, h:mm a")}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {[h.patientName ?? d.callerName, d.callerPhone, d.claimNumber && `Claim ${d.claimNumber}`, d.accidentDate && `Accident: ${d.accidentDate}`].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    {h.status === "open" && (
                      <Button size="sm" variant="outline" onClick={async () => { await postJson("/api/inbox", { handoffId: h.id }); toast("Ticket resolved"); void load(); }}>
                        <Check className="h-3.5 w-3.5" /> Resolve
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : null}
    </div>
  );
}
