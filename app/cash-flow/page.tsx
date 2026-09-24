"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { ErrorState, PageHeader, SummaryCards, Panel, InfoTip } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui";
import { CashFlowTrendChart, MoneyDonut, MethodBarChart } from "@/components/cash-flow/charts";
import { CHART } from "@/components/dashboard/format";
import { ArrowRightLeft, Info, Layers, TrendingDown, TrendingUp } from "lucide-react";

type Flow = {
  from: string;
  to: string;
  inflows: string;
  outflows: string;
  net: string;
  salesCollected?: string;
  salesIn: string;
  refunds?: string;
  refundsByMethod?: { method: string; amount: string }[];
  expenses: string;
  income: string;
  duesCollected: string;
  supplierPaid: string;
  trend?: { date: string; inflow: string; outflow: string; net: string; inflowN: number; outflowN: number; netN: number }[];
  methodBreakdown?: { method: string; inflow: string; outflow: string; inflowN: number; outflowN: number }[];
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(base: string, delta: number) {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}
function startOfWeek(base: string) {
  const d = new Date(`${base}T00:00:00`);
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}
function startOfMonth(base: string) {
  return `${base.slice(0, 7)}-01`;
}

type Preset = "Today" | "Yesterday" | "This Week" | "This Month" | "Custom";

export default function CashFlowPage() {
  const today = useMemo(() => toISODate(new Date()), []);
  const [preset, setPreset] = useState<Preset>("Today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [view, setView] = useState<"summary" | "charts">("summary");

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "Today") {
      setFrom(today);
      setTo(today);
    } else if (p === "Yesterday") {
      const y = addDays(today, -1);
      setFrom(y);
      setTo(y);
    } else if (p === "This Week") {
      setFrom(startOfWeek(today));
      setTo(today);
    } else if (p === "This Month") {
      setFrom(startOfMonth(today));
      setTo(today);
    }
  }

  const q = useQuery({
    queryKey: ["cash-flow", from, to],
    queryFn: () => api<Flow>(`/api/v1/finance/cash-flow${qs({ from, to })}`),
  });
  const d = q.data;

  const rangeLabel = d ? `${d.from} → ${d.to}` : `${from} → ${to}`;

  return (
    <AppShell>
      <PageHeader title="Cash Flow" description={`Money in vs money out · ${rangeLabel}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["Today", "Yesterday", "This Week", "This Month", "Custom"] as Preset[]).map((p) => (
            <Button
              key={p}
              variant={preset === p ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </PageHeader>

      <Panel className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setPreset("Custom");
                  setFrom(e.target.value);
                }}
                className={inputClass + " h-9 w-auto"}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setPreset("Custom");
                  setTo(e.target.value);
                }}
                className={inputClass + " h-9 w-auto"}
              />
            </label>
            <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
              Apply
            </Button>
          </div>
          <div className="flex items-center rounded-md border p-0.5">
            <Button variant={view === "summary" ? "default" : "ghost"} size="sm" className="h-7 px-3" onClick={() => setView("summary")}>
              Summary
            </Button>
            <Button variant={view === "charts" ? "default" : "ghost"} size="sm" className="h-7 px-3" onClick={() => setView("charts")}>
              Charts
            </Button>
          </div>
        </div>
      </Panel>

      {/* Explainer — compact, ShohojHisab style, no fancy gradients */}
      <div className="mb-3 rounded-md border bg-muted/30 px-3 py-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold">Actual money movement</span>
              <span className="text-muted-foreground"> — sale total ≠ cash. Refund is a separate cash-out.</span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded bg-card px-1.5 py-0.5 font-mono">Sale +10,000</span>
                <span>+</span>
                <span className="rounded bg-card px-1.5 py-0.5 font-mono">Refund -3,000</span>
                <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                <span className="rounded bg-card px-1.5 py-0.5 font-semibold">Net +7,000</span>
                <span className="hidden text-muted-foreground sm:inline">· Return without refund = 0 outflow</span>
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Layers className="h-3.5 w-3.5" /> Same From→To for Summary & Charts
          </div>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
          <div className="flex items-center gap-1.5 rounded border bg-card px-2 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              <span className="font-medium text-emerald-600">Inflow:</span> Sales Collected + Dues Collected + Other Income
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded border bg-card px-2 py-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
            <span>
              <span className="font-medium text-rose-600">Outflow:</span> Expenses + Supplier Paid + Refunds
            </span>
          </div>
        </div>
      </div>

      {q.isError ? <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} /> : null}

      {view === "summary" ? (
        <>
          {/* Row 1: Total Inflow / Outflow / Net */}
          <SummaryCards
            items={[
              { label: "Total Inflow", value: `৳ ${d?.inflows ?? "0.00"}`, accent: "emerald", loading: q.isLoading },
              { label: "Total Outflow", value: `৳ ${d?.outflows ?? "0.00"}`, accent: "rose", loading: q.isLoading },
              { label: "Net Cash Flow", value: `৳ ${d?.net ?? "0.00"}`, accent: "sky", loading: q.isLoading },
            ]}
          />

          {/* Money In */}
          <div className="mb-1 mt-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Money In <InfoTip label="Money In" description="Only CAPTURED payments count. Due = later collection. Never subtract returns from sales." />
          </div>
          <SummaryCards
            items={[
              { label: "Sales Collected", value: `৳ ${d?.salesCollected ?? d?.salesIn ?? "0.00"}`, accent: "orange", loading: q.isLoading },
              { label: "Dues Collected", value: `৳ ${d?.duesCollected ?? "0.00"}`, accent: "violet", loading: q.isLoading },
              { label: "Other Income", value: `৳ ${d?.income ?? "0.00"}`, accent: "lime", loading: q.isLoading },
            ]}
          />

          {/* Money Out */}
          <div className="mb-1 mt-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Money Out <InfoTip label="Money Out" description="Refunds are separate OUT from PaymentTransaction REFUNDED. Return without refund = no cash." />
          </div>
          <SummaryCards
            items={[
              { label: "Expenses", value: `৳ ${d?.expenses ?? "0.00"}`, accent: "amber", loading: q.isLoading },
              { label: "Supplier Paid", value: `৳ ${d?.supplierPaid ?? "0.00"}`, accent: "teal", loading: q.isLoading },
              { label: "Refunds", value: `৳ ${d?.refunds ?? "0.00"}`, accent: "rose", loading: q.isLoading, description: d?.refundsByMethod?.length ? d.refundsByMethod.map((r) => `${r.method}: ৳${r.amount}`).join(" · ") : undefined },
            ]}
          />
        </>
      ) : (
        <>
          {/* Charts View */}
          <div className="grid gap-3">
            <Panel>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                Cash Flow Trend{" "}
                <InfoTip label="Trend" description="One point per day in range. Inflow emerald, Outflow rose, Net sky. Single day shows daily totals." />
              </div>
              {q.isLoading ? (
                <div className="h-[240px] animate-pulse rounded bg-muted" />
              ) : (
                <CashFlowTrendChart data={d?.trend ?? []} />
              )}
            </Panel>

            <div className="grid gap-3 md:grid-cols-2">
              <Panel>
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  Money In Breakdown <InfoTip label="Money In" description="Same values as cards: Sales Collected / Dues Collected / Other Income" />
                </div>
                {q.isLoading ? (
                  <div className="h-[200px] animate-pulse rounded bg-muted" />
                ) : (
                  <MoneyDonut
                    data={[
                      { name: "Sales Collected", value: Number(d?.salesCollected ?? d?.salesIn ?? 0), color: CHART[1] },
                      { name: "Dues Collected", value: Number(d?.duesCollected ?? 0), color: CHART[2] },
                      { name: "Other Income", value: Number(d?.income ?? 0), color: CHART[5] },
                    ]}
                  />
                )}
              </Panel>
              <Panel>
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  Money Out Breakdown <InfoTip label="Money Out" description="Expenses / Supplier Paid / Refunds — refunds stay separate" />
                </div>
                {q.isLoading ? (
                  <div className="h-[200px] animate-pulse rounded bg-muted" />
                ) : (
                  <MoneyDonut
                    data={[
                      { name: "Expenses", value: Number(d?.expenses ?? 0), color: CHART[3] },
                      { name: "Supplier Paid", value: Number(d?.supplierPaid ?? 0), color: CHART[4] },
                      { name: "Refunds", value: Number(d?.refunds ?? 0), color: "hsl(var(--destructive))" },
                    ]}
                  />
                )}
              </Panel>
            </div>

            <Panel>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                Payment Method — Money In vs Money Out <InfoTip label="By method" description="Grouped by actual payment method (Cash/Card/bKash/Nagad/Other). Refund method from refund payment, not original sale." />
              </div>
              {q.isLoading ? (
                <div className="h-[240px] animate-pulse rounded bg-muted" />
              ) : (
                <MethodBarChart data={d?.methodBreakdown ?? []} />
              )}
            </Panel>
          </div>
        </>
      )}
    </AppShell>
  );
}
