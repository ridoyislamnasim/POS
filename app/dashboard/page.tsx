"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Banknote,
  Boxes,
  Package,
  Receipt,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, downloadDocument, printDocument } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import {
  Badge,
  Button,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Kpi,
  PageHeader,
  ShellCard,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/ui";
import { toastError } from "@/lib/toast";
import { usePagedRows } from "@/lib/use-pagination";

type Summary = {
  from: string;
  to: string;
  todaysSales: string;
  todaysTransactions: number;
  orders?: number;
  revenue?: string;
  todaysCustomers: number;
  todaysReturns: number;
  todaysProfit: string;
  profit?: string;
  expenses?: string;
  due?: string;
  customerDue?: string;
  supplierDue?: string;
  grossMargin: string;
  currentStockValue: string;
  lowStockItems: number;
  activeOutlets: number;
};

type SalesOverview = {
  period: string;
  totalSales: string;
  transactionCount: number;
  averageTransactionValue: string;
  cash: string;
  card: string;
  mfs: string;
  refunds: string;
  discounts: string;
  payments: { method: string; amount: string }[];
  series: { date: string; sales: number; count: number }[];
};

type InventoryDash = {
  stockValue: string;
  lowStockCount: number;
  outOfStockCount: number;
  lowStock: { sku: string; product: string; location: string; available: string }[];
};

type TopProduct = { name: string; sku: string; qty: string; revenue: string };
type TopCustomer = { id: string; name: string; phone: string; count: number; revenue: string };
type ByCashier = { cashier: string; count: number; total: string };
type Hourly = { hour: string; sales: number; count: number };
type RecentSale = {
  id: string;
  invoiceNumber: string;
  customer: string;
  cashier: string;
  outlet: string;
  amount: string;
  payment: string;
  time: string;
  status: string;
};
type Activity = { id: string; action: string; entityType: string; time: string };

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
] as const;

function money(v: string | number) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("today");

  const summary = useQuery({
    queryKey: ["dash-summary", period],
    queryFn: () => api<Summary>(`/api/v1/dashboard/summary?period=${period}`),
  });
  const sales = useQuery({
    queryKey: ["dash-sales", period],
    queryFn: () => api<SalesOverview>(`/api/v1/dashboard/sales?period=${period}`),
  });
  const inventory = useQuery({
    queryKey: ["dash-inv"],
    queryFn: () => api<InventoryDash>("/api/v1/dashboard/inventory"),
  });
  const top = useQuery({
    queryKey: ["dash-top", period],
    queryFn: () => api<TopProduct[]>(`/api/v1/dashboard/top-products?period=${period}`),
  });
  const recent = useQuery({
    queryKey: ["dash-recent"],
    queryFn: () => api<RecentSale[]>("/api/v1/dashboard/recent-sales"),
  });
  const activity = useQuery({
    queryKey: ["dash-act"],
    queryFn: () => api<Activity[]>("/api/v1/dashboard/activity"),
  });
  const topCust = useQuery({
    queryKey: ["dash-top-cust", period],
    queryFn: () => api<TopCustomer[]>(`/api/v1/dashboard/top-customers?period=${period}`),
  });
  const cashiers = useQuery({
    queryKey: ["dash-cashier", period],
    queryFn: () => api<ByCashier[]>(`/api/v1/dashboard/by-cashier?period=${period}`),
  });
  const hourly = useQuery({
    queryKey: ["dash-hourly", period],
    queryFn: () => api<Hourly[]>(`/api/v1/dashboard/hourly?period=${period}`),
  });

  const { rows: topProductRows, pager: topProductPager } = usePagedRows(top.data, 5);
  const { rows: lowStockRows, pager: lowStockPager } = usePagedRows(inventory.data?.lowStock, 5);
  const { rows: recentSaleRows, pager: recentSalePager } = usePagedRows(recent.data, 5);
  const { rows: topCustomerRows, pager: topCustomerPager } = usePagedRows(topCust.data, 5);
  const { rows: cashierRows, pager: cashierPager } = usePagedRows(cashiers.data, 5);

  const chart = (sales.data?.series ?? []).map((s) => ({
    date: s.date.slice(5),
    sales: s.sales,
    count: s.count,
  }));

  async function onDoc(id: string, kind: "bill" | "invoice", mode: "print" | "download") {
    try {
      if (mode === "print") await printDocument(id, kind);
      else await downloadDocument(id, kind);
    } catch (e) {
      toastError(e, "Could not open document");
    }
  }

  return (
    <AppShell>
      <PageHeader title="Dashboard Overview" description="Live store totals from POS sales, stock, and activity.">
        <div className="inline-flex rounded-md border bg-background p-0.5">
          {PERIODS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={period === p.id ? "default" : "ghost"}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      {summary.isError ? (
        <ErrorState message="Could not load dashboard totals." onRetry={() => summary.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Today's Sales" value={`৳ ${money(summary.data?.todaysSales ?? 0)}`} loading={summary.isLoading} icon={Banknote} description="Gross for period" tone="increase" />
          <Kpi label="Orders" value={summary.data?.orders ?? summary.data?.todaysTransactions ?? 0} loading={summary.isLoading} icon={Receipt} description="Completed tickets" />
          <Kpi label="Revenue" value={`৳ ${money(summary.data?.revenue ?? summary.data?.todaysSales ?? 0)}`} loading={summary.isLoading} icon={Banknote} description="Same-period revenue" />
          <Kpi label="Profit" value={`৳ ${money(summary.data?.todaysProfit ?? 0)}`} loading={summary.isLoading} icon={TrendingUp} description={`Margin ${summary.data?.grossMargin ?? "0"}%`} tone="increase" />
          <Kpi label="Expenses" value={`৳ ${money(summary.data?.expenses ?? 0)}`} loading={summary.isLoading} icon={Boxes} description="Posted expenses" />
          <Kpi label="Due" value={`৳ ${money(summary.data?.due ?? 0)}`} loading={summary.isLoading} icon={Users} description="Customer credit due" tone={Number(summary.data?.due ?? 0) ? "warning" : "neutral"} />
          <Kpi label="Low stock" value={summary.data?.lowStockItems ?? 0} loading={summary.isLoading} icon={Package} description="Needs attention" tone={summary.data?.lowStockItems ? "warning" : "neutral"} />
          <Kpi label="Active outlets" value={summary.data?.activeOutlets ?? 0} loading={summary.isLoading} icon={Store} description="Open locations" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader>
            <CardTitle>Sales trend</CardTitle>
            <CardDescription>Period sales from the register — not demo cargo figures.</CardDescription>
          </CardHeader>
          <CardContent>
            {sales.isLoading ? (
              <Skeleton rows={8} />
            ) : sales.isError ? (
              <ErrorState message="Sales overview failed to load." onRetry={() => sales.refetch()} />
            ) : chart.length === 0 ? (
              <EmptyState title="No sales in this period" />
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>
                    <div className="text-muted-foreground">Total</div>
                    <div className="font-medium tabular-nums">৳ {money(sales.data?.totalSales ?? 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Count</div>
                    <div className="font-medium tabular-nums">{sales.data?.transactionCount ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ATV</div>
                    <div className="font-medium tabular-nums">৳ {money(sales.data?.averageTransactionValue ?? 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Discounts</div>
                    <div className="font-medium tabular-nums">৳ {money(sales.data?.discounts ?? 0)}</div>
                  </div>
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer>
                    <AreaChart data={chart}>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="sales" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.25} />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Cash, card, and MFS split for this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {sales.isLoading ? (
              <Skeleton />
            ) : (
              <Table>
                <TableBody>
                  {[
                    { k: "Cash", v: sales.data?.cash, variant: "success" as const },
                    { k: "Card", v: sales.data?.card, variant: "info" as const },
                    { k: "MFS", v: sales.data?.mfs, variant: "warning" as const },
                    { k: "Refunds", v: sales.data?.refunds, variant: "destructive" as const },
                  ].map((row) => (
                    <TableRow key={row.k}>
                      <TableCell className="text-muted-foreground">
                        <Badge variant={row.variant}>{row.k}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">৳ {money(row.v ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </ShellCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>Highest revenue SKUs in the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            {top.isLoading ? <Skeleton /> : null}
            {top.isError ? <ErrorState message="Could not load top products." onRetry={() => top.refetch()} /> : null}
            {!top.isLoading && !top.data?.length ? <EmptyState title="No product sales yet" /> : null}
            <Table>
              <TableBody>
                {topProductRows.map((p) => (
                  <TableRow key={p.sku}>
                    <TableCell>
                      {p.name}
                      <div className="text-xs text-muted-foreground">{p.sku}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.qty}</TableCell>
                    <TableCell className="text-right tabular-nums">৳ {money(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...topProductPager} />
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
            <CardDescription>Live inventory snapshot (threshold 5 units).</CardDescription>
          </CardHeader>
          <CardContent>
            {inventory.isLoading ? <Skeleton /> : null}
            {inventory.isError ? (
              <ErrorState message="Could not load inventory snapshot." onRetry={() => inventory.refetch()} />
            ) : null}
            {!inventory.isLoading && !inventory.data?.lowStock.length ? (
              <EmptyState title="No low-stock items" hint="Threshold is 5 units." />
            ) : null}
            <Table>
              <TableBody>
                {lowStockRows.map((r) => (
                  <TableRow key={`${r.sku}-${r.location}`}>
                    <TableCell>
                      {r.product}
                      <div className="text-xs text-muted-foreground">{r.sku}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.location}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.available}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...lowStockPager} />
          </CardContent>
        </ShellCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader>
            <CardTitle>Recent sales</CardTitle>
            <CardDescription>Print or download the last tickets.</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.isLoading ? <Skeleton /> : null}
            {recent.isError ? <ErrorState message="Could not load recent sales." onRetry={() => recent.refetch()} /> : null}
            {!recent.isLoading && !recent.data?.length ? <EmptyState title="No sales yet" /> : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Pay</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSaleRows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.invoiceNumber}</TableCell>
                    <TableCell>{s.customer}</TableCell>
                    <TableCell>{s.cashier}</TableCell>
                    <TableCell className="text-right tabular-nums">৳ {money(s.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.payment}</Badge>
                    </TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => onDoc(s.id, "invoice", "print")}>
                        View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDoc(s.id, "bill", "print")}>
                        Reprint
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDoc(s.id, "invoice", "download")}>
                        Invoice
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...recentSalePager} />
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Audit trail from this tenant.</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.isLoading ? <Skeleton /> : null}
            {!activity.isLoading && !activity.data?.length ? <EmptyState title="No activity yet" /> : null}
            <ul className="space-y-1.5 text-sm">
              {(activity.data ?? []).map((a) => (
                <li key={a.id} className="flex justify-between gap-2 border-b py-2 last:border-0">
                  <span>
                    {a.action} <span className="text-muted-foreground">{a.entityType}</span>
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{new Date(a.time).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </ShellCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ShellCard>
          <CardHeader>
            <CardTitle>Top customers</CardTitle>
            <CardDescription>Highest spend this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {!topCust.data?.length ? <EmptyState title="No customer sales yet" /> : null}
            <Table>
              <TableBody>
                {topCustomerRows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.name}
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.count}</TableCell>
                    <TableCell className="text-right tabular-nums">৳ {money(c.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...topCustomerPager} />
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader>
            <CardTitle>Sales by cashier</CardTitle>
            <CardDescription>Register performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {cashierRows.map((c) => (
                  <TableRow key={c.cashier}>
                    <TableCell>{c.cashier}</TableCell>
                    <TableCell className="text-right">{c.count}</TableCell>
                    <TableCell className="text-right tabular-nums">৳ {money(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...cashierPager} />
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader>
            <CardTitle>Hourly / daily sales</CardTitle>
            <CardDescription>Volume by hour of day.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer>
                <AreaChart data={(hourly.data ?? []).filter((h) => h.count > 0 || Number(h.hour) >= 8)}>
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="sales" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </ShellCard>
      </div>
    </AppShell>
  );
}
