import { money } from "@/lib/utils";

export interface Funnel {
  campaignId: string;
  name?: string;
  sent: number;
  replied: number;
  booked: number;
  optedOut: number;
  revenueCents: number;
}

export function FunnelChart({ funnel }: { funnel: Funnel }) {
  const steps = [
    { label: "Sent", value: funnel.sent, color: "bg-brand-300" },
    { label: "Replied", value: funnel.replied, color: "bg-brand-500" },
    { label: "Booked", value: funnel.booked, color: "bg-brand-700" },
    { label: "Opted-out", value: funnel.optedOut, color: "bg-rose-400" },
  ];
  const max = Math.max(funnel.sent, 1);
  return (
    <div className="space-y-3">
      {steps.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="w-20 text-xs font-medium text-slate-600">{s.label}</div>
          <div className="h-8 flex-1 overflow-hidden rounded-lg bg-sage-100">
            <div className={`${s.color} flex h-full items-center rounded-lg px-2 text-xs font-semibold text-white transition-all duration-700`} style={{ width: `${Math.max((s.value / max) * 100, s.value ? 6 : 0)}%` }}>
              {s.value}
            </div>
          </div>
          <div className="w-12 text-right text-xs text-slate-400">{funnel.sent ? Math.round((s.value / funnel.sent) * 100) : 0}%</div>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-white">
        <span className="text-sm">Estimated revenue recovered (sample pricing)</span>
        <span className="text-2xl font-semibold">{money(funnel.revenueCents)}</span>
      </div>
    </div>
  );
}
