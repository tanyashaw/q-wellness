"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CohortTable, type CohortRow } from "@/components/reactivation/CohortTable";
import { SegmentChips, type SegmentInfo } from "@/components/reactivation/SegmentChips";
import { MessagePreview, type Preview } from "@/components/reactivation/MessagePreview";
import { FunnelChart, type Funnel } from "@/components/reactivation/FunnelChart";
import { getJson, postJson } from "@/lib/utils";

interface CohortData {
  total: number;
  counts: Record<string, number>;
  segments: SegmentInfo[];
  patients: CohortRow[];
}

const GOALS = ["Re-book lapsed patients", "Use remaining insurance benefits before year-end", "Check in and offer a follow-up visit"];

export default function ReactivationPage() {
  const toast = useToast();
  const [cohort, setCohort] = useState<CohortData | null>(null);
  const [selected, setSelected] = useState<string[]>(["massage_regulars", "physio_unfinished"]);
  const [channel, setChannel] = useState("sms");
  const [goal, setGoal] = useState(GOALS[0]);
  const [previews, setPreviews] = useState<Preview[] | null>(null);
  const [recipients, setRecipients] = useState(0);
  const [loading, setLoading] = useState<"" | "preview" | "send">("");
  const [funnel, setFunnel] = useState<Funnel | null>(null);

  function loadCohort() {
    getJson<CohortData>("/api/reactivation/cohort").then(setCohort).catch(() => null);
  }
  useEffect(loadCohort, []);

  const labels = useMemo(() => Object.fromEntries((cohort?.segments ?? []).map((s) => [s.key, s.label])), [cohort]);
  const rows = useMemo(() => (cohort?.patients ?? []).filter((p) => !selected.length || p.segments.some((s) => selected.includes(s))), [cohort, selected]);

  const toggle = (k: string) => {
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
    setPreviews(null);
  };

  async function preview() {
    setLoading("preview");
    try {
      const r = await postJson<{ recipients: number; previews: Preview[] }>("/api/reactivation/campaign", { segments: selected, channel, goal, preview: true });
      setPreviews(r.previews);
      setRecipients(r.recipients);
      if (!r.previews.length) toast("No consented recipients in that selection", "error");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Preview failed", "error");
    }
    setLoading("");
  }

  async function send() {
    setLoading("send");
    try {
      const r = await postJson<{ funnel: Funnel; sentCount: number }>("/api/reactivation/campaign", { segments: selected, channel, goal });
      setFunnel(r.funnel);
      toast(`${channel === "email" ? "Email" : channel === "whatsapp" ? "WhatsApp message" : "SMS"} sent successfully`);
      loadCohort();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Send failed", "error");
    }
    setLoading("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">Patient Reactivation</h1>
        <p className="text-sm text-slate-500">Patients last seen 6–12 months ago, with no future appointment, who have not opted out.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" /> Cohort</CardTitle>
          {cohort && <Badge variant="solid">{cohort.total} patients</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {cohort ? (
            <>
              <SegmentChips segments={cohort.segments} counts={cohort.counts} selected={selected} onToggle={toggle} />
              <CohortTable rows={rows} labels={labels} />
            </>
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Campaign builder</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
            <Select value={channel} onChange={(e) => { setChannel(e.target.value); setPreviews(null); }}>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
            <Input list="goals" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal" />
            <datalist id="goals">{GOALS.map((g) => <option key={g} value={g} />)}</datalist>
            <Button onClick={preview} disabled={!selected.length || loading !== ""} variant="soft">
              {loading === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Preview 5 messages
            </Button>
          </div>
          {loading === "preview" && <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}
          {previews && previews.length > 0 && (
            <>
              <MessagePreview previews={previews} />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sage-50 p-3">
                <p className="text-sm text-slate-600">
                  <strong>{recipients}</strong> consented recipients. Each message is personalised and ends with <em>“Reply STOP to opt out.”</em> (CASL)
                </p>
                <Button onClick={send} disabled={loading !== ""}>
                  {loading === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send to {recipients}
                </Button>
              </div>
            </>
          )}
          {!previews && loading !== "preview" && <EmptyState title="Pick segments, then preview" hint="A personal message is prepared for each patient. Review five before anything is sent." />}
        </CardContent>
      </Card>

      {funnel && (
        <Card>
          <CardHeader><CardTitle>Campaign funnel · {funnel.name}</CardTitle></CardHeader>
          <CardContent><FunnelChart funnel={funnel} /></CardContent>
        </Card>
      )}
    </div>
  );
}
