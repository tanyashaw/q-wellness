import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-brand-500 via-brand-600 to-brand-800",
  "from-sage-400 via-brand-500 to-brand-700",
  "from-brand-300 via-brand-500 to-sage-500",
  "from-brand-700 via-brand-600 to-sage-400",
  "from-sage-500 via-brand-600 to-brand-900",
  "from-brand-400 via-sage-400 to-brand-700",
];

/** Branded placeholder for post images: gradient + headline rendered in HTML (no image API needed). */
export function BrandCard({ headline, theme, platform, className }: { headline: string; theme: string; platform: string; className?: string }) {
  const idx = Math.abs([...theme].reduce((a, c) => a + c.charCodeAt(0), 0)) % GRADIENTS.length;
  return (
    <div
      className={cn(
        "relative flex w-full flex-col justify-between overflow-hidden bg-gradient-to-br p-5 text-white",
        GRADIENTS[idx],
        platform === "instagram" ? "aspect-square" : "aspect-[1.91/1]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/10" />
      <div className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">{theme || "Q's Wellness"}</div>
      <div className="relative text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{headline}</div>
      <div className="relative flex items-center gap-2 text-xs text-white/85">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-xs font-bold">Q</span>
        Q&apos;s Wellness Clinic · Surrey, BC
      </div>
    </div>
  );
}
