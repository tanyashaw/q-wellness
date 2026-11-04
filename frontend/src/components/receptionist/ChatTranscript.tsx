"use client";

import { useEffect, useRef } from "react";
import { PhoneIncoming } from "lucide-react";
import { EmptyState } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChatMsg } from "@/types";

export function ChatTranscript({ messages, interim }: { messages: ChatMsg[]; interim?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [messages, interim]);

  if (!messages.length)
    return (
      <div className="flex h-full items-center">
        <EmptyState icon={<PhoneIncoming className="h-6 w-6" />} title="No active call" hint="Press a scenario below, tap the mic, or type to start a call with Ava." />
      </div>
    );

  return (
    <div ref={ref} className="scroll-thin flex h-full flex-col gap-3 overflow-y-auto pr-1">
      {messages.map((m, i) => (
        <div key={i} className={cn("slide-in flex", m.role === "caller" ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              m.role === "caller" ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-sage-100 text-brand-900",
            )}
          >
            {m.role === "ava" && <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">Ava</div>}
            {m.text || (m.streaming ? "…" : "")}
            {m.streaming && m.text && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-brand-500 align-middle" />}
          </div>
        </div>
      ))}
      {interim && (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-200 px-4 py-2.5 text-sm italic text-brand-900">{interim}</div>
        </div>
      )}
    </div>
  );
}
