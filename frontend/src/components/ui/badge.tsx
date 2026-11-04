import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-brand-100 text-brand-800",
      sage: "bg-sage-100 text-sage-500",
      amber: "bg-amber-100 text-amber-800",
      rose: "bg-rose-100 text-rose-700",
      slate: "bg-slate-100 text-slate-700",
      solid: "bg-brand-600 text-white",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...p }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...p} />;
}
