"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { Facebook, Instagram } from "@/components/ui/brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ContentCalendar } from "@/components/social/ContentCalendar";
import { PostCard, type PostRow } from "@/components/social/PostCard";
import { cn, getJson, postJson } from "@/lib/utils";

const THEMES = ["condition spotlight", "ICBC awareness", "team intro", "seasonal tip", "review highlight", "blog promo"];
const TONES = ["Caring and professional", "Warm and friendly", "Educational and calm", "Upbeat and encouraging"];

const DMS = [
  { id: 1, platform: "Instagram", from: "@jas.fitness", text: "Hey! Do you take ICBC patients? Got rear-ended last week 😬" },
  { id: 2, platform: "Facebook", from: "Meera K.", text: "How much is a 60 min massage and can I book a Saturday?" },
  { id: 3, platform: "Instagram", from: "@tom_in_delta", text: "Do I need a doctor's referral for physio?" },
];

export default function SocialPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<"queue" | "calendar" | "dms">("queue");
  const [perWeek, setPerWeek] = useState(4);
  const [themes, setThemes] = useState<string[]>(["condition spotlight", "ICBC awareness", "team intro", "seasonal tip"]);
  const [tone, setTone] = useState(TONES[0]);
  const [platforms, setPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [dmDrafts, setDmDrafts] = useState<Record<number, string>>({});
  const [dmBusy, setDmBusy] = useState<number | null>(null);
  const [dmSent, setDmSent] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    getJson<{ posts: PostRow[] }>("/api/social").then((d) => setPosts(d.posts)).catch(() => setPosts([]));
  }, []);
  useEffect(load, [load]);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function generate() {
    if (!themes.length || !platforms.length) return toast("Pick at least one theme and one platform", "error");
    setGenerating(true);
    try {
      const r = await postJson<{ posts: PostRow[] }>("/api/social/generate", { postsPerWeek: perWeek, themes, tone, platforms });
      toast(`${r.posts.length} drafts ready for your approval`);
      setTab("queue");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Generation failed", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function act(id: string, fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed", "error");
    } finally {
      setBusy(false);
    }
    void id;
  }

  const queue = (posts ?? []).filter((p) => p.status === "draft");
  const approved = (posts ?? []).filter((p) => p.status === "approved");
  const published = (posts ?? []).filter((p) => p.status === "published");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">Social Media Agent</h1>
        <p className="text-sm text-slate-500">Drafts on-brand posts for Facebook and Instagram. Nothing goes live until you approve it.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] [&>*]:min-w-0">
        <Card className="h-fit">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand-600" /> Generate next week&apos;s content</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Posts per week</label>
              <Input type="number" min={1} max={10} value={perWeek} onChange={(e) => setPerWeek(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Themes</label>
              <div className="flex flex-wrap gap-1.5">
                {THEMES.map((t) => (
                  <button key={t} onClick={() => toggle(themes, t, setThemes)} className={cn("rounded-full border px-2.5 py-1 text-xs", themes.includes(t) ? "border-brand-600 bg-brand-600 text-white" : "border-sage-300 bg-white text-slate-600 hover:bg-sage-50")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Tone</label>
              <Select value={tone} onChange={(e) => setTone(e.target.value)}>{TONES.map((t) => <option key={t}>{t}</option>)}</Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Platforms</label>
              <div className="flex gap-2">
                {[{ k: "facebook", I: Facebook }, { k: "instagram", I: Instagram }].map(({ k, I }) => (
                  <button key={k} onClick={() => toggle(platforms, k, setPlatforms)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm capitalize", platforms.includes(k) ? "border-brand-600 bg-brand-50 text-brand-800" : "border-sage-300 text-slate-500")}>
                    <I className="h-4 w-4" /> {k}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={generate} disabled={generating}>
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Writing posts…</> : <><Sparkles className="h-4 w-4" /> Generate drafts</>}
            </Button>
            <p className="text-[11px] text-slate-400">Guardrails: no medical claims or guarantees; every post has a booking CTA.</p>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-3">
          <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-sage-200">
            {([["queue", `Approval queue (${queue.length})`], ["calendar", `Content calendar (${approved.length + published.length})`], ["dms", "Comments & DMs"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-medium", tab === k ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-sage-50")}>{l}</button>
            ))}
          </div>

          {tab === "queue" && (
            <div className="space-y-3">
              {posts === null ? (
                <><Skeleton className="h-44 w-full" /><Skeleton className="h-44 w-full" /></>
              ) : generating ? (
                <><Skeleton className="h-44 w-full" /><Skeleton className="h-44 w-full" /></>
              ) : (
                <>
                  {queue.length === 0 && approved.length === 0 && <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No drafts yet" hint="Use the form to generate a week of posts." />}
                  {[...queue, ...approved].map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      busy={busy}
                      onApprove={() => act(p.id, () => postJson(`/api/social/${p.id}/approve`, {}), "Approved and added to the content calendar")}
                      onReject={() => act(p.id, () => getJson(`/api/social/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected" }) }), "Draft rejected")}
                      onRegenerate={() => act(p.id, () => postJson(`/api/social/${p.id}/regenerate`, {}), "New draft generated")}
                      onPublish={() => act(p.id, () => postJson(`/api/social/${p.id}/publish`, {}), "Published (demo). See the preview below the post.")}
                      onSave={(caption) => act(p.id, () => getJson(`/api/social/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption }) }), "Edit saved")}
                    />
                  ))}
                  {published.length > 0 && <div className="pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Recently published</div>}
                  {published.slice(-3).map((p) => (
                    <PostCard key={p.id} post={p} busy onApprove={() => {}} onReject={() => {}} onRegenerate={() => {}} onPublish={() => {}} onSave={() => {}} />
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "calendar" && <Card><CardContent className="pt-4"><ContentCalendar posts={posts ?? []} /></CardContent></Card>}

          {tab === "dms" && (
            <div className="space-y-3">
              {DMS.map((d) => (
                <Card key={d.id}>
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-brand-600" />
                      <span className="text-sm font-semibold">{d.from}</span>
                      <Badge variant="sage">{d.platform}</Badge>
                    </div>
                    <p className="rounded-xl bg-sage-50 px-3 py-2 text-sm">{d.text}</p>
                    {dmDrafts[d.id] !== undefined ? (
                      <div className="space-y-2">
                        <Textarea value={dmDrafts[d.id]} onChange={(e) => setDmDrafts({ ...dmDrafts, [d.id]: e.target.value })} />
                        <Button size="sm" disabled={dmSent.has(d.id)} onClick={() => { setDmSent(new Set(dmSent).add(d.id)); toast("Reply sent (demo)"); }}>
                          <Send className="h-3.5 w-3.5" /> {dmSent.has(d.id) ? "Sent" : "Send reply"}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="soft" disabled={dmBusy === d.id} onClick={async () => {
                        setDmBusy(d.id);
                        try {
                          const r = await postJson<{ reply: string }>("/api/social/dm", { message: d.text, platform: d.platform });
                          setDmDrafts((x) => ({ ...x, [d.id]: r.reply }));
                        } catch (e) { toast(e instanceof Error ? e.message : "Failed", "error"); }
                        setDmBusy(null);
                      }}>
                        {dmBusy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Draft reply
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
