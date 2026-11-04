"use client";

import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function VoiceButton({
  listening,
  speaking,
  supported,
  disabled,
  onClick,
}: {
  listening: boolean;
  speaking: boolean;
  supported: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={disabled || !supported}
        aria-label={listening ? "Stop listening" : "Talk to Ava"}
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full text-white shadow-md transition-all disabled:opacity-40",
          listening ? "pulse-ring bg-rose-500" : "bg-brand-600 hover:bg-brand-700",
        )}
      >
        {supported ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
      </button>
      <span className="text-[11px] text-slate-500">
        {!supported ? "Voice needs Chrome" : listening ? "Listening…" : speaking ? "Ava is speaking…" : "Tap to talk"}
      </span>
    </div>
  );
}
