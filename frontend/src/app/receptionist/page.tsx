"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, MoonStar, PhoneOff, PhoneCall, Send, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { VoiceButton } from "@/components/receptionist/VoiceButton";
import { ChatTranscript } from "@/components/receptionist/ChatTranscript";
import { ActionTimeline } from "@/components/receptionist/ActionTimeline";
import { CallerCard } from "@/components/receptionist/CallerCard";
import { WeekGrid, type GridAppt } from "@/components/calendar/WeekGrid";
import { BrowserVoice } from "@/lib/integrations/telephony/browser";
import { DEMO_CALLER } from "@/lib/constants";
import { fmt, ymd } from "@/lib/scheduling";
import { getJson, postJson } from "@/lib/utils";
import type { ChatMsg, ToolEvent } from "@/types";

type CallerKind = "sarah" | "new";
const NEW_CALLER_PHONE = "604-555-0177";

const SCENARIOS: { label: string; line: string; caller: CallerKind }[] = [
  { label: "Book 60-min massage with Khalid Saturday", line: "Hi, I'd like to book a 60-minute massage with Khalid on Saturday.", caller: "new" },
  { label: "Car accident last week, ICBC", line: "I was in a car accident last week and I have an ICBC claim. Can you help?", caller: "new" },
  { label: "Reschedule my Thursday physio", line: "Hi, I need to reschedule my Thursday physio appointment.", caller: "sarah" },
  { label: "Do I need a referral? Prices?", line: "Do I need a referral? And what are your prices?", caller: "new" },
  { label: "My back hurts badly, what's wrong with me?", line: "My back hurts badly. What's wrong with me?", caller: "new" },
];

interface CalData {
  practitioners: { id: string; name: string }[];
  appointments: (Omit<GridAppt, "columnKey"> & { practitionerId: string })[];
}
interface EndResult {
  summary: string;
  intent: string;
  outcome: string;
  actions: number;
}

export default function ReceptionistPage() {
  const toast = useToast();
  const [callActive, setCallActive] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [events, setEvents] = useState<ToolEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [afterHours, setAfterHours] = useState(false);
  const [caller, setCaller] = useState<CallerKind>("new");
  const [voiceOn, setVoiceOn] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [clinicNow, setClinicNow] = useState<string | null>(null);
  const [clinicOpen, setClinicOpen] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<EndResult | null>(null);
  const [cal, setCal] = useState<CalData | null>(null);
  const [calOverride, setCalOverride] = useState<string | null>(null);

  const sessionRef = useRef("");
  const busyRef = useRef(false);
  const voice = useRef<BrowserVoice | null>(null);
  const voiceOnRef = useRef(false);
  voiceOnRef.current = voiceOn;

  useEffect(() => {
    setSupported(BrowserVoice.supported());
    voice.current = new BrowserVoice();
  }, []);

  const calDate = calOverride ?? (clinicNow ? ymd(new Date(clinicNow)) : ymd(new Date()));
  // Always load the date held in a ref (never a stale closure) and ignore out-of-order responses,
  // so a booking made for another day is what the calendar ends up showing.
  const calDateRef = useRef(calDate);
  calDateRef.current = calDate;
  const calReq = useRef(0);
  const loadCal = useCallback((date?: string) => {
    const d = date ?? calDateRef.current;
    const id = ++calReq.current;
    getJson<CalData>(`/api/calendar?from=${d}&days=1`).then((r) => { if (id === calReq.current) setCal(r); }).catch(() => null);
  }, []);
  useEffect(() => { loadCal(calDate); }, [calDate, loadCal]);

  const callerPhone = caller === "sarah" ? DEMO_CALLER.phone : NEW_CALLER_PHONE;
  const knownName = (() => {
    const e = events.find((x) => x.tool === "lookupPatient");
    const o = e?.output as { found?: boolean; patient?: { name: string } } | undefined;
    return o?.found ? o.patient!.name : null;
  })();

  function speak(t: string) {
    if (!voiceOnRef.current || !t.trim() || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "en-CA";
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  async function runTurn(body: Record<string, unknown>) {
    busyRef.current = true;
    setBusy(true);
    setMsgs((m) => [...m, { role: "ava", text: "", streaming: true }]);
    let full = "";
    let failed = false;
    try {
      const res = await fetch("/api/receptionist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "text") {
            full += ev.delta;
            setMsgs((m) => m.map((x, idx) => (idx === m.length - 1 ? { ...x, text: full } : x)));
          } else if (ev.type === "tool") {
            setEvents((e) => [...e, ev.event]);
            const start = (ev.event.output as { appointment?: { start: string } })?.appointment?.start;
            if (start) { const d = ymd(new Date(start)); calDateRef.current = d; setCalOverride(d); }
            if (["bookAppointment", "rescheduleAppointment", "cancelAppointment"].includes(ev.event.tool)) loadCal();
          } else if (ev.type === "done") {
            setClinicNow(ev.now);
            setClinicOpen(ev.clinicOpen);
            if (ev.calendarChanged) loadCal();
          } else if (ev.type === "error") {
            failed = true;
            toast(ev.message, "error");
          }
        }
      }
    } catch (e) {
      failed = true;
      toast(e instanceof Error ? e.message : "Call failed", "error");
    } finally {
      // an errored turn leaves no empty bubble behind; a failed call start resets the phone
      setMsgs((m) => (failed && !full ? m.slice(0, -1) : m.map((x, idx) => (idx === m.length - 1 ? { ...x, streaming: false } : x))));
      if (failed && body.start) {
        sessionRef.current = "";
        setCallActive(false);
      }
      busyRef.current = false;
      setBusy(false);
      if (!failed) speak(full);
    }
  }

  async function startCall(who: CallerKind) {
    const sid = crypto.randomUUID();
    sessionRef.current = sid;
    setCallActive(true);
    setMsgs([]);
    setEvents([]);
    setSummary(null);
    setCalOverride(null);
    setCaller(who);
    await runTurn({ sessionId: sid, start: true, afterHours, callerPhone: who === "sarah" ? DEMO_CALLER.phone : NEW_CALLER_PHONE });
  }

  async function endCall(quiet = false) {
    if (!sessionRef.current) return;
    voice.current?.endCall();
    setListening(false);
    setSpeaking(false);
    try {
      const r = await postJson<EndResult & { callId: string }>("/api/receptionist", { sessionId: sessionRef.current, end: true });
      if (!quiet) {
        setSummary(r);
        toast("Call saved with AI summary. Confirmation SMS (if any) is in the Inbox.");
      }
    } catch {
      /* call may already be ended */
    }
    sessionRef.current = "";
    setCallActive(false);
    loadCal();
  }

  async function sendText(t: string) {
    const line = t.trim();
    if (!line || busyRef.current) return;
    if (!sessionRef.current) {
      await startCall(caller);
      if (!sessionRef.current) return; // call could not start (error already shown)
    }
    setMsgs((m) => [...m, { role: "caller", text: line }]);
    setText("");
    setInterim("");
    await runTurn({ sessionId: sessionRef.current, message: line });
  }

  async function runScenario(s: (typeof SCENARIOS)[number]) {
    if (busyRef.current) return;
    if (sessionRef.current) await endCall(true);
    await startCall(s.caller);
    if (!sessionRef.current) return; // call could not start (error already shown)
    setMsgs((m) => [...m, { role: "caller", text: s.line }]);
    await runTurn({ sessionId: sessionRef.current, message: s.line });
  }

  async function toggleMic() {
    if (listening) {
      voice.current?.endCall();
      setListening(false);
      return;
    }
    window.speechSynthesis?.cancel();
    if (!sessionRef.current) {
      await startCall(caller);
      if (!sessionRef.current) return;
    }
    setListening(true);
    try {
      await voice.current!.startCall({
        onTranscript: (t, final) => {
          setInterim(final ? "" : t);
          if (final) void sendText(t);
        },
        onEnd: () => setListening(false),
      });
    } catch (e) {
      setListening(false);
      toast(e instanceof Error ? e.message : "Microphone unavailable", "error");
    }
  }

  const columns = (cal?.practitioners ?? []).map((p) => ({ key: p.id, label: p.name.split(" ")[0], dateStr: calDate }));
  const appts: GridAppt[] = (cal?.appointments ?? []).map((a) => ({ ...a, columnKey: a.practitionerId }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">AI Receptionist</h1>
          <p className="text-sm text-slate-500">Talk to Ava like a real caller. See what she does on the right.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${afterHours ? "border-amber-300 bg-amber-50 text-amber-900" : "border-sage-300 bg-white text-slate-700"} ${callActive ? "cursor-not-allowed opacity-60" : ""}`}>
            <input type="checkbox" className="accent-brand-600" checked={afterHours} disabled={callActive} onChange={(e) => setAfterHours(e.target.checked)} />
            <MoonStar className="h-4 w-4" /> Simulate after-hours call (Tue 9:15 AM)
          </label>
          <Select className="h-9 w-auto" value={caller} disabled={callActive} onChange={(e) => setCaller(e.target.value as CallerKind)} aria-label="Caller">
            <option value="new">Caller: new / unknown</option>
            <option value="sarah">Caller: Sarah Chen (existing)</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] [&>*]:min-w-0">
        {/* LEFT: phone */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-brand-600" /> Phone
              {callActive && <Badge variant="solid">● Call in progress · recorded</Badge>}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant={voiceOn ? "soft" : "ghost"}
                size="sm"
                onClick={() => { setVoiceOn(!voiceOn); setSpeaking(false); window.speechSynthesis?.cancel(); }}
                aria-pressed={voiceOn}
                aria-label="Speaker"
                title={voiceOn ? "Speaker on: you will hear Ava" : "Speaker off: text only"}
              >
                {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Speaker {voiceOn ? "on" : "off"}
              </Button>
              {callActive && (
                <Button variant="danger" size="sm" onClick={() => endCall()}>
                  <PhoneOff className="h-4 w-4" /> End call
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <CallerCard phone={callerPhone} name={knownName} clinicNow={clinicNow} open={clinicOpen} active={callActive} />
            <div className="h-[360px] rounded-xl border border-sage-200 bg-white p-3">
              <ChatTranscript messages={msgs} interim={interim} />
            </div>

            {summary && (
              <div className="slide-in rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm">
                <div className="mb-1 flex items-center gap-2 font-semibold text-brand-900">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" /> Call summary (saved)
                  <Badge>{summary.intent}</Badge>
                  <Badge variant="solid">{summary.outcome}</Badge>
                </div>
                <p className="text-slate-700">{summary.summary}</p>
              </div>
            )}

            <form className="flex items-center gap-3" onSubmit={(e) => { e.preventDefault(); void sendText(text); }}>
              <VoiceButton listening={listening} speaking={speaking} supported={supported} disabled={busy} onClick={toggleMic} />
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="…or type what the caller says" disabled={busy} />
              <Button type="submit" size="icon" disabled={busy || !text.trim()} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </form>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">One-click scenarios</div>
              <div className="flex flex-wrap gap-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.label}
                    disabled={busy}
                    onClick={() => runScenario(s)}
                    className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-left text-xs font-medium text-brand-800 transition-colors hover:bg-brand-100 disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: actions + calendar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>What the AI did</CardTitle>
              <Badge variant="sage">{events.length} action{events.length === 1 ? "" : "s"}</Badge>
            </CardHeader>
            <CardContent className="scroll-thin max-h-[380px] overflow-y-auto">
              <ActionTimeline events={events} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                {calDate === ymd(new Date()) ? "Today's calendar" : `Calendar · ${fmt(new Date(calDate + "T20:00:00Z"), "EEE MMM d")}`}
              </CardTitle>
              <span className="text-[11px] text-slate-400">✨ = booked by AI · updates live</span>
            </CardHeader>
            <CardContent>{cal ? <WeekGrid columns={columns} appointments={appts} rowH={22} /> : <Skeleton className="h-64 w-full" />}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
