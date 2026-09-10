"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge, StatusBadge, tableSubText } from "@/components/ui";
import { DocumentActions } from "@/components/documents/document-actions";
import { ChartSkeleton, WidgetShell } from "./widget-shell";
import { dashQs, useDashBranchQuery, useDashQuery } from "./use-dash-query";
import { CHART, shortTime, taka } from "./format";
import type {
  DashActivity,
  DashCashier,
  DashCustomersMix,
  DashHourly,
  DashInventory,
  DashPayments,
  DashRecentSale,
  DashSales,
  DashTopCustomer,
  DashTopProduct,
} from "./types";

const SalesTrendChart = dynamic(() => import("./charts").then((m) => m.SalesTrendChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-[200px] sm:h-[220px]" />,
});
const PaymentMixChart = dynamic(() => import("./charts").then((m) => m.PaymentMixChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-[180px] sm:h-[200px]" />,
});
const HourlyBarChart = dynamic(() => import("./charts").then((m) => m.HourlyBarChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-[200px] sm:h-[220px]" />,
});
const TopProductsBarChart = dynamic(() => import("./charts").then((m) => m.TopProductsBarChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-[180px]" />,
});
const InventoryDonutChart = dynamic(() => import("./charts").then((m) => m.InventoryDonutChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-[140px]" />,
});
const CashierBarChart = dynamic(() => import("./charts").then((m) => m.CashierBarChart), {
  ssr: false,
  loading: () => <ChartSkeleton className="h-[160px]" />,
});

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-xs font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function SalesTrendWidget({ period, branchId, className }: { period: string; branchId: string | null; className?: string }) {
  const sales = useDashQuery<DashSales>("sales", `/api/v1/dashboard/sales${dashQs(period, branchId)}`, period, branchId);
  const chart = (sales.data?.series ?? []).map((s) => ({
    date: s.date.slice(5),
    sales: s.sales,
    count: s.count,
  }));
  const empty = !sales.isLoading && !sales.isError && chart.every((r) => r.sales === 0 && r.count === 0);

  return (
    <WidgetShell
      className={className}
      title="Sales trend"
      description="Daily totals for the selected period"
      loading={sales.isLoading}
      error={sales.isError}
      onRetry={() => sales.refetch()}
      empty={empty}
      emptyTitle="No sales in this period"
      skeletonRows={6}
    >
      <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <MiniStat label="Total" value={taka(sales.data?.totalSales ?? 0)} />
        <MiniStat label="Tickets" value={sales.data?.transactionCount ?? 0} />
        <MiniStat label="ATV" value={taka(sales.data?.averageTransactionValue ?? 0)} />
        <MiniStat label="Discounts" value={taka(sales.data?.discounts ?? 0)} />
      </div>
      <SalesTrendChart data={chart} />
    </WidgetShell>
  );
}

export function PaymentsWidget({ period, branchId, className }: { period: string; branchId: string | null; className?: string }) {
  const q = useDashQuery<DashPayments>("payments", `/api/v1/dashboard/payments${dashQs(period, branchId)}`, period, branchId);
  const rows = [
    { name: "Cash", value: Number(q.data?.cash ?? 0), color: CHART[2], variant: "success" as const },
    { name: "Card", value: Number(q.data?.card ?? 0), color: CHART[1], variant: "default" as const },
    { name: "MFS", value: Number(q.data?.mfs ?? 0), color: CHART[3], variant: "warning" as const },
  ];
  const refunds = Number(q.data?.refunds ?? 0);
  const hasData = rows.some((r) => r.value > 0) || refunds > 0;

  return (
    <WidgetShell
      className={className}
      title="Payments"
      description="Captured mix vs refunds"
      loading={q.isLoading}
      error={q.isError}
      onRetry={() => q.refetch()}
      empty={!hasData}
      emptyTitle="No payments yet"
    >
      <PaymentMixChart
        data={
          rows.some((r) => r.value > 0)
            ? rows.filter((r) => r.value > 0)
            : [{ name: "Refunds", value: refunds, color: CHART[4] }]
        }
      />
      <ul className="mt-1 space-y-1">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-2 text-xs">
            <Badge variant={row.variant}>{row.name}</Badge>
            <span className="tabular-nums">{taka(row.value)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2 text-xs">
          <Badge variant="destructive">Refunds</Badge>
          <span className="tabular-nums">{taka(refunds)}</span>
        </li>
      </ul>
    </WidgetShell>
  );
}

export function HourlyWidget({ period, branchId, className }: { period: string; branchId: string | null; className?: string }) {
  const q = useDashQuery<DashHourly[]>("hourly", `/api/v1/dashboard/hourly${dashQs(period, branchId)}`, period, branchId);
  const empty = !q.isLoading && !q.isError && !(q.data ?? []).some((h) => h.count > 0);
  return (
    <WidgetShell
      className={className}
      title="Hourly sales"
      description="Volume by hour of sale"
      loading={q.isLoading}
      error={q.isError}
      onRetry={() => q.refetch()}
      empty={empty}
      emptyTitle="No hourly volume yet"
      skeletonRows={6}
    >
      <HourlyBarChart data={q.data ?? []} />
    </WidgetShell>
  );
}

export function InventoryWidget({ branchId, className }: { branchId: string | null; className?: string }) {
  const path = branchId ? `/api/v1/dashboard/inventory?branchId=${encodeURIComponent(branchId)}` : "/api/v1/dashboard/inventory";
  const inv = useDashBranchQuery<DashInventory>("inventory", path, branchId);
  const d = inv.data;
  const empty = !inv.isLoading && !inv.isError && !(d?.skuCount || d?.lowStock?.length);

  return (
    <WidgetShell
      className={className}
      title="Inventory health"
      description={d?.threshold != null ? `Low ≤ ${d.threshold} or reorder` : "On-hand vs alerts"}
      action={
        <Link href="/inventory" className="text-[11px] font-medium text-primary hover:underline">
          Stock
        </Link>
      }
      loading={inv.isLoading}
      error={inv.isError}
      onRetry={() => inv.refetch()}
      empty={empty}
      emptyTitle="No stock rows"
    >
      <div className="grid grid-cols-1 items-center gap-2 min-[420px]:grid-cols-[120px_1fr]">
        <InventoryDonutChart inStock={d?.inStockCount ?? 0} low={d?.lowStockCount ?? 0} out={d?.outOfStockCount ?? 0} />
        <div className="min-w-0 space-y-1 text-xs">
          <p className="font-medium tabular-nums">{taka(d?.stockValue ?? 0)} on hand</p>
          <p className="text-muted-foreground">{d?.inStockCount ?? 0} in stock</p>
          <p className="text-amber-600 dark:text-amber-400">{d?.lowStockCount ?? 0} low</p>
          <p className="text-rose-600 dark:text-rose-400">{d?.outOfStockCount ?? 0} out</p>
        </div>
      </div>
      <ul className="mt-2 divide-y text-xs">
        {(d?.lowStock ?? []).slice(0, 5).map((row) => (
          <li key={`${row.sku}-${row.location}`} className="flex items-center justify-between gap-2 py-1.5">
            <span className="min-w-0 truncate">
              {row.product}
              <span className={tableSubText}>
                {row.sku} · {row.location}
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-amber-600 dark:text-amber-400">{row.available}</span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function TopProductsWidget({ period, branchId, className }: { period: string; branchId: string | null; className?: string }) {
  const q = useDashQuery<DashTopProduct[]>("top-products", `/api/v1/dashboard/top-products${dashQs(period, branchId)}`, period, branchId);
  const rows = q.data ?? [];
  return (
    <WidgetShell
      className={className}
      title="Top products"
      description="Highest revenue SKUs"
      loading={q.isLoading}
      error={q.isError}
      onRetry={() => q.refetch()}
      empty={!rows.length}
      emptyTitle="No product sales yet"
    >
      <TopProductsBarChart data={rows} />
      <ul className="mt-1 divide-y text-xs">
        {rows.slice(0, 5).map((p) => (
          <li key={p.sku} className="flex items-center justify-between gap-2 py-1.5">
            <span className="min-w-0 truncate">
              {p.name}
              <span className={tableSubText}>{p.sku}</span>
            </span>
            <span className="shrink-0 tabular-nums">{taka(p.revenue)}</span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function CustomersWidget({ period, branchId, className }: { period: string; branchId: string | null; className?: string }) {
  const mix = useDashQuery<DashCustomersMix>("customers", `/api/v1/dashboard/customers${dashQs(period, branchId)}`, period, branchId);
  const top = useDashQuery<DashTopCustomer[]>("top-customers", `/api/v1/dashboard/top-customers${dashQs(period, branchId)}`, period, branchId);
  const rows = top.data ?? [];
  return (
    <WidgetShell
      className={className}
      title="Top customers"
      description="Highest spend this period"
      loading={top.isLoading}
      error={top.isError}
      onRetry={() => top.refetch()}
      empty={!rows.length}
      emptyTitle="No customer sales yet"
    >
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <MiniStat label="Named" value={mix.data?.customersWithSales ?? "—"} />
        <MiniStat label="Walk-in tickets" value={mix.data?.walkInTransactions ?? "—"} />
      </div>
      <ul className="divide-y text-xs">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="min-w-0 truncate">
              {c.name}
              <span className={tableSubText}>{c.phone || `${c.count} tickets`}</span>
            </span>
            <span className="shrink-0 tabular-nums">{taka(c.revenue)}</span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function CashiersWidget({ period, branchId, className }: { period: string; branchId: string | null; className?: string }) {
  const q = useDashQuery<DashCashier[]>("cashiers", `/api/v1/dashboard/by-cashier${dashQs(period, branchId)}`, period, branchId);
  const rows = q.data ?? [];
  return (
    <WidgetShell
      className={className}
      title="By cashier"
      description="Register performance"
      loading={q.isLoading}
      error={q.isError}
      onRetry={() => q.refetch()}
      empty={!rows.length}
      emptyTitle="No cashier totals yet"
    >
      <CashierBarChart data={rows.map((c) => ({ name: c.cashier, total: c.totalValue ?? Number(c.total) }))} />
      <ul className="mt-1 divide-y text-xs">
        {rows.map((c) => (
          <li key={c.cashier} className="flex items-center justify-between gap-2 py-1.5">
            <span className="min-w-0 truncate">
              {c.cashier}
              <span className={tableSubText}>{c.count} tickets</span>
            </span>
            <span className="shrink-0 tabular-nums">{taka(c.total)}</span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function RecentSalesWidget({ branchId, className }: { branchId: string | null; className?: string }) {
  const path = branchId ? `/api/v1/dashboard/recent-sales?branchId=${encodeURIComponent(branchId)}` : "/api/v1/dashboard/recent-sales";
  const q = useDashBranchQuery<DashRecentSale[]>("recent-sales", path, branchId);
  const rows = q.data ?? [];
  return (
    <WidgetShell
      className={className}
      title="Recent sales"
      description="Latest tickets"
      action={
        <Link href="/sales" className="text-[11px] font-medium text-primary hover:underline">
          All sales
        </Link>
      }
      loading={q.isLoading}
      error={q.isError}
      onRetry={() => q.refetch()}
      empty={!rows.length}
      emptyTitle="No sales yet"
    >
      <div className="w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-1.5 font-medium">Invoice</th>
              <th className="pb-1.5 font-medium">Customer</th>
              <th className="pb-1.5 text-right font-medium">Amount</th>
              <th className="pb-1.5 font-medium">Pay</th>
              <th className="pb-1.5 w-[1%]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border/70">
                <td className="py-1.5 pr-2">
                  <span className="font-medium">{s.invoiceNumber}</span>
                  <span className={tableSubText}>{shortTime(s.time)}</span>
                </td>
                <td className="py-1.5 pr-2">
                  <span className="block max-w-[140px] truncate">{s.customer}</span>
                  <span className={tableSubText}>{s.cashier}</span>
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{taka(s.amount)}</td>
                <td className="py-1.5 pr-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{s.payment}</Badge>
                    <StatusBadge value={s.status} />
                  </div>
                </td>
                <td className="py-1.5 text-right">
                  <DocumentActions type="sale" id={s.id} number={s.invoiceNumber} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetShell>
  );
}

export function ActivityWidget({ branchId, className }: { branchId: string | null; className?: string }) {
  const path = branchId ? `/api/v1/dashboard/activity?branchId=${encodeURIComponent(branchId)}` : "/api/v1/dashboard/activity";
  const q = useDashBranchQuery<DashActivity[]>("activity", path, branchId);
  const rows = q.data ?? [];
  return (
    <WidgetShell
      className={className}
      title="Activity"
      description="Latest audit events"
      loading={q.isLoading}
      error={q.isError}
      onRetry={() => q.refetch()}
      empty={!rows.length}
      emptyTitle="No activity yet"
    >
      <ul className="space-y-0">
        {rows.map((a) => (
          <li key={a.id} className="flex items-start justify-between gap-2 border-b border-border/70 py-1.5 text-xs last:border-0">
            <span className="min-w-0">
              <span className="font-medium">{a.action}</span>{" "}
              <span className="text-muted-foreground">{a.entityType}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">{shortTime(a.time)}</span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
