import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-sage-100", className)} />;
}

export function EmptyState({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sage-300 bg-sage-50/60 px-6 py-10 text-center">
      {icon && <div className="text-brand-500">{icon}</div>}
      <p className="text-sm font-medium text-brand-900">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
