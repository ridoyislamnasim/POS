"use client";

import { ProgressBar } from "./progress-bar";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  current: number;
  limit: number | null;
  unlimited?: boolean;
  disabled?: boolean;
  className?: string;
};

export function UsageCard({ label, current, limit, unlimited, disabled, className }: Props) {
  const atLimit = !unlimited && limit !== null && current >= limit;
  const pct = !unlimited && limit !== null ? (limit === 0 ? 0 : Math.min(100, (current / limit) * 100)) : 0;
  const remaining = !unlimited && limit !== null ? Math.max(0, limit - current) : null;

  return (
    <div className={cn("rounded-lg border bg-card p-3 text-card-foreground shadow-sm", className)}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {unlimited ? (
          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Unlimited</span>
        ) : disabled ? (
          <span className="text-[10px] font-medium text-muted-foreground">Disabled</span>
        ) : atLimit ? (
          <span className="text-[10px] font-medium text-red-600 dark:text-red-400">Limit reached</span>
        ) : remaining !== null ? (
          <span className="text-[10px] font-medium text-muted-foreground">{remaining} remaining</span>
        ) : null}
      </div>
      <div className="mb-2 text-lg font-semibold tabular-nums">
        {current}
        <span className="text-sm font-normal text-muted-foreground">
          {" / "}
          {unlimited ? "∞" : limit?.toLocaleString() ?? "—"}
        </span>
      </div>
      <ProgressBar value={current} max={limit} unlimited={unlimited} />
    </div>
  );
}
