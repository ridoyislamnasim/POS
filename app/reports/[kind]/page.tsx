"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Factory, Users } from "lucide-react";
import { apiEnvelope } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Badge,
  ErrorState,
  KPI_ACCENT_ORDER,
  PageHeader,
  SummaryCards,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Truncate,
  tableCellNumeric,
} from "@/components/ui";
import { useServerEnvelope } from "@/lib/use-list-state";
import { moneyLabel } from "@/lib/money";
import { cn } from "@/lib/cn";

const TITLES: Record<string, string> = {
  sales: "Sales Report",
  purchases: "Purchase Report",
  inventory: "Inventory Report",
  profit: "Profit Report",
  expenses: "Expense Report",
  dues: "Due Report",
  tax: "Tax / VAT Report",
  cashier: "Cashier Report",
  products: "Product Performance",
  returns: "Returns Report",
  receiving: "Receiving Report",
  damage: "Damage Report",
};

type DuePerson = { id: string; name: string; phone?: string | null; creditDue: string };

function useDueSummary(key: string, path: string, total: unknown) {
  const q = useQuery({
    queryKey: [key, "due-summary"],
    queryFn: () => apiEnvelope<DuePerson[]>(`${path}?limit=8`),
  });
  return {
    amount: Number(total ?? 0),
    count: q.data?.pagination.total ?? 0,
    rows: q.data?.data ?? [],
    loading: q.isLoading,
  };
}

function DueSkeletonRow() {
  return <div className="h-3 animate-pulse rounded bg-muted" />;
}

function DueGridSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            <div className="h-4 w-14 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-3 space-y-1.5">
            <DueSkeletonRow />
            <DueSkeletonRow />
            <DueSkeletonRow />
          </div>
        </div>
      ))}
    </div>
  );
}

function DueCard({
  side,
  amount,
  count,
  rows,
  href,
  loading,
}: {
  side: "customer" | "supplier";
  amount: number;
  count: number;
  rows: DuePerson[];
  href: string;
  loading: boolean;
}) {
  const isCustomer = side === "customer";
  const outstanding = amount > 0;
  const labeled = isCustomer ? "customer" : "supplier";

  return (
    <Link href={href} className="group flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
            isCustomer ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400",
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md",
              isCustomer ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
            )}
          >
            {isCustomer ? <Users className="h-3 w-3" /> : <Factory className="h-3 w-3" />}
          </span>
          {isCustomer ? "Customer Due" : "Supplier Due"}
        </span>
        <Badge variant={outstanding ? "warning" : "outline"}>{outstanding ? "Outstanding" : "No balance"}</Badge>
      </div>

      <div className="px-3 py-2.5">
        <div className="text-2xl font-bold leading-none tracking-tight tabular-nums">{moneyLabel(amount)}</div>
        {loading ? (
          <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted" />
        ) : (
          <div className="mt-1.5 text-[11px] leading-tight text-muted-foreground">
            {outstanding
              ? `${count} ${labeled}${count === 1 ? "" : "s"}`
              : `No outstanding ${labeled} balance`}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-1.5 border-t px-3 py-2">
          <DueSkeletonRow />
          <DueSkeletonRow />
          <DueSkeletonRow />
        </div>
      ) : outstanding && rows.length ? (
        <div className="space-y-1.5 border-t px-3 py-2">
          {rows.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate">{r.name}</span>
              <span className="shrink-0 font-medium tabular-nums text-muted-foreground">{moneyLabel(Number(r.creditDue))}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between border-t px-3 py-2 text-xs font-semibold text-primary">
        <span>{isCustomer ? "Customers owe the business" : "Business owes suppliers"}</span>
        <span className="group-hover:underline">
          View {isCustomer ? "customer" : "supplier"} due <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}

function DueReportSection({
  payload,
  loading,
  error,
  onRetry,
}: {
  payload: Record<string, unknown>;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const customer = useDueSummary("cust", "/api/v1/finance/customer-dues", payload.customerDue);
  const supplier = useDueSummary("sup", "/api/v1/finance/supplier-dues", payload.supplierDue);
  const busy = loading || customer.loading || supplier.loading;

  if (error && !loading) {
    return <ErrorState message={(error as Error)?.message ?? "Could not load due balances."} onRetry={onRetry} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <DueCard side="customer" href="/dues/customers" amount={customer.amount} count={customer.count} rows={customer.rows} loading={busy} />
      <DueCard side="supplier" href="/dues/suppliers" amount={supplier.amount} count={supplier.count} rows={supplier.rows} loading={busy} />
    </div>
  );
}

export default function ReportKindPage() {
  const { kind } = useParams<{ kind: string }>();
  const q = useServerEnvelope<Record<string, unknown> | unknown[]>(["report", kind], `/api/v1/reports/${kind}`);
  const data = (q.payload ?? {}) as Record<string, unknown>;
  const fullRows = Array.isArray(q.payload)
    ? (q.payload as Record<string, unknown>[])
    : Array.isArray(data.rows)
      ? (data.rows as Record<string, unknown>[])
      : Array.isArray(data.customers)
        ? (data.customers as Record<string, unknown>[])
        : [];
  const keys = fullRows[0] ? Object.keys(fullRows[0]).slice(0, 8) : [];
  const list = { ...q, rows: fullRows };
  const numericKey = /^(total|paid|due|tax|amount|qty|available|cost|value|count|revenue|returnedQty|returnValue)$/i;
  const isDues = kind === "dues";

  return (
    <AppShell>
      <PageHeader title={TITLES[kind] ?? kind} description="Live figures from this tenant — not sample data." />
      {isDues ? (
        q.isLoading ? (
          <DueGridSkeleton />
        ) : (
          <DueReportSection
            payload={data}
            loading={q.isLoading}
            error={q.isError ? q.error : null}
            onRetry={() => void q.refetch()}
          />
        )
      ) : (
        <>
          {!q.isLoading && !q.isError ? (
            <SummaryCards
              items={Object.entries(data)
                .filter(([, v]) => typeof v === "string" || typeof v === "number")
                .slice(0, 6)
                .map(([k, v], i) => ({
                  label: k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
                  value: String(v),
                  accent: KPI_ACCENT_ORDER[i % KPI_ACCENT_ORDER.length],
                }))}
            />
          ) : null}
          <ListFrame
            list={list}
            searchPlaceholder="Search report rows"
            dateFilter
            columnCount={Math.max(keys.length, 4)}
            emptyTitle="No records found"
            emptyHint="There is no data in the selected range yet."
          >
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  {keys.map((k) => (
                    <TableHead key={k} className={numericKey.test(k) ? tableCellNumeric : undefined}>{k}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fullRows.map((row, i) => (
                  <TableRow key={String(row.id ?? row.invoiceNumber ?? row.sku ?? row.code ?? i)}>
                    {keys.map((k) => (
                      <TableCell key={k} className={`max-w-[220px] text-sm${numericKey.test(k) ? ` ${tableCellNumeric}` : ""}`}>
                        <Truncate title={typeof row[k] === "object" ? JSON.stringify(row[k]) : String(row[k] ?? "—")}>
                          {typeof row[k] === "object" ? JSON.stringify(row[k]) : String(row[k] ?? "—")}
                        </Truncate>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListFrame>
        </>
      )}
    </AppShell>
  );
}