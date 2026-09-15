"use client";

import { cn } from "@/lib/cn";

type Props = {
  value: number;
  max: number | null;
  unlimited?: boolean;
  className?: string;
};

export function ProgressBar({ value, max, unlimited, className }: Props) {
  if (unlimited || max === null) {
    return (
      <div className={cn("h-1.5 w-full rounded-full bg-emerald-500/20", className)}>
        <div className="h-full w-full rounded-full bg-emerald-500" />
      </div>
    );
  }

  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all duration-300", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}
