"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; text: string; kind: "ok" | "error" };
const Ctx = React.createContext<(text: string, kind?: Toast["kind"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);
  const push = React.useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "slide-in pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg",
              t.kind === "ok" ? "border-brand-200" : "border-rose-200",
            )}
          >
            {t.kind === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-brand-600" /> : <AlertCircle className="mt-0.5 h-4 w-4 text-rose-600" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => React.useContext(Ctx);
