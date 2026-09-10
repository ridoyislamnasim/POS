"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Banknote, Package, Receipt, TrendingUp, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ErrorState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dashQs, useDashQuery } from "./use-dash-query";
import { taka } from "./format";
import type { DashSummary } from "./types";

const ACCENT = {
  orange: {
    card: "border-l-[3px] border-l-orange-500 bg-gradient-to-br from-orange-50/90 to-card dark:from-orange-950/40",
    icon: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  amber: {
    card: "border-l-[3px] border-l-amber-500 bg-gradient-to-br from-amber-50/90 to-card dark:from-amber-950/40",
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  emerald: {
    card: "border-l-[3px] border-l-emerald-500 bg-gradient-to-br from-emerald-50/90 to-card dark:from-emerald-950/40",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  stone: {
    card: "border-l-[3px] border-l-stone-400 bg-gradient-to-br from-stone-50/90 to-card dark:from-stone-900/40",
    icon: "bg-stone-500/15 text-stone-600 dark:text-stone-300",
  },
  rose: {
    card: "border-l-[3px] border-l-rose-500 bg-gradient-to-br from-rose-50/90 to-card dark:from-rose-950/40",
    icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  lime: {
    card: "border-l-[3px] border-l-lime-500 bg-gradient-to-br from-lime-50/90 to-card dark:from-lime-950/40",
    icon: "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  },
} as const;

function DashKpi({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  loading,
  delay,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENT;
  loading?: boolean;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const tone = ACCENT[accent];
  return (
    <motion.div
      className="min-w-0"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.22, delay: reduce ? 0 : delay }}
    >
      <div className={cn("rounded-lg border p-2.5 shadow-sm transition-shadow hover:shadow-md sm:p-3", tone.card)}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <span className={cn("rounded-md p-1", tone.icon)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        {loading ? (
          <div className="mt-1.5 h-6 w-20 animate-pulse rounded bg-muted/80" />
        ) : (
          <p className="mt-1 truncate text-lg font-semibold leading-tight tabular-nums">{value}</p>
        )}
        {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </motion.div>
  );
}

export function KpiGrid({ period, branchId }: { period: string; branchId: string | null }) {
  const summary = useDashQuery<DashSummary>("summary", `/api/v1/dashboard/summary${dashQs(period, branchId)}`, period, branchId);
  const d = summary.data;
  const low = d?.lowStockItems ?? 0;
  const out = d?.outOfStockItems ?? 0;

  if (summary.isError) {
    return <ErrorState message="Could not load dashboard totals." onRetry={() => summary.refetch()} />;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
      <DashKpi label="Sales" value={taka(d?.todaysSales ?? 0)} hint="Gross for period" icon={Banknote} accent="orange" loading={summary.isLoading} delay={0} />
      <DashKpi label="Orders" value={d?.orders ?? d?.todaysTransactions ?? 0} hint={`${d?.todaysCustomers ?? 0} customers`} icon={Receipt} accent="lime" loading={summary.isLoading} delay={0.04} />
      <DashKpi
        label="Profit"
        value={taka(d?.todaysProfit ?? 0)}
        hint={`Margin ${d?.grossMargin ?? "0"}%`}
        icon={TrendingUp}
        accent="emerald"
        loading={summary.isLoading}
        delay={0.08}
      />
      <DashKpi label="Expenses" value={taka(d?.expenses ?? 0)} hint="Posted in period" icon={Wallet} accent="stone" loading={summary.isLoading} delay={0.12} />
      <DashKpi
        label="Receivables"
        value={taka(d?.due ?? 0)}
        hint={Number(d?.supplierDue ?? 0) ? `Supplier ৳ ${Number(d?.supplierDue).toFixed(0)}` : "Customer credit"}
        icon={Banknote}
        accent="rose"
        loading={summary.isLoading}
        delay={0.16}
      />
      <DashKpi
        label="Stock alerts"
        value={low}
        hint={out ? `${out} out of stock` : "Low + out"}
        icon={Package}
        accent="amber"
        loading={summary.isLoading}
        delay={0.2}
      />
    </div>
  );
}
