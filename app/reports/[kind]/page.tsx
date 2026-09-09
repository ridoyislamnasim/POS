"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Kpi, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, ErrorState, Skeleton } from "@/components/ui";
import { usePagedRows } from "@/lib/use-pagination";

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
};

export default function ReportKindPage() {
  const { kind } = useParams<{ kind: string }>();
  const q = useQuery({
    queryKey: ["report", kind],
    queryFn: () => api<Record<string, unknown>>(`/api/v1/reports/${kind}`),
  });
  const data = q.data ?? {};
  const fullRows = Array.isArray(data)
    ? data
    : Array.isArray((data as { rows?: unknown[] }).rows)
      ? ((data as { rows: Record<string, unknown>[] }).rows)
      : Array.isArray((data as { customers?: unknown[] }).customers)
        ? ((data as { customers: Record<string, unknown>[] }).customers)
        : [];
  const { rows, pager } = usePagedRows(fullRows);
  const keys = fullRows[0] ? Object.keys(fullRows[0]).slice(0, 8) : [];

  return (
    <AppShell>
      <PageHeader title={TITLES[kind] ?? kind} description="Live figures from this tenant — not sample data." />
      {q.isLoading ? <Skeleton rows={8} /> : null}
      {q.isError ? <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} /> : null}
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {Object.entries(data)
          .filter(([, v]) => typeof v === "string" || typeof v === "number")
          .slice(0, 6)
          .map(([k, v]) => (
            <Kpi key={k} label={k} value={String(v)} />
          ))}
      </div>
      {keys.length ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {keys.map((k) => (
                  <TableHead key={k}>{k}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {keys.map((k) => (
                    <TableCell key={k} className="max-w-[220px] truncate text-sm">
                      {typeof row[k] === "object" ? JSON.stringify(row[k]) : String(row[k] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination {...pager} />
        </div>
      ) : null}
    </AppShell>
  );
}
