"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Kpi, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, Table, TableBody, TableCell, TablePagination, TableRow, ErrorState } from "@/components/ui";
import { usePagedRows } from "@/lib/use-pagination";

type PnL = {
  revenue: string;
  cogs: string;
  grossProfit: string;
  tax: string;
  otherIncome: string;
  expenses: string;
  netProfit: string;
  expenseBreakdown: { category: string; amount: string }[];
};

export default function ProfitLossPage() {
  const q = useQuery({ queryKey: ["pnl"], queryFn: () => api<PnL>("/api/v1/finance/profit-loss") });
  const d = q.data;
  const { rows: expenseRows, pager: expensePager } = usePagedRows(d?.expenseBreakdown);
  return (
    <AppShell>
      <PageHeader title="Profit & Loss" description="Revenue, COGS, expenses, and net for the selected business date." />
      {q.isError ? <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue" value={`৳ ${d?.revenue ?? "0.00"}`} loading={q.isLoading} tone="increase" />
        <Kpi label="COGS" value={`৳ ${d?.cogs ?? "0.00"}`} loading={q.isLoading} />
        <Kpi label="Gross profit" value={`৳ ${d?.grossProfit ?? "0.00"}`} loading={q.isLoading} />
        <Kpi label="Net profit" value={`৳ ${d?.netProfit ?? "0.00"}`} loading={q.isLoading} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Tax / VAT: ৳ {d?.tax}</div>
            <div>Other income: ৳ {d?.otherIncome}</div>
            <div>Expenses: ৳ {d?.expenses}</div>
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Expense categories</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {expenseRows.map((e) => (
                  <TableRow key={e.category}>
                    <TableCell>{e.category}</TableCell>
                    <TableCell className="text-right tabular-nums">৳ {e.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...expensePager} />
          </CardContent>
        </ShellCard>
      </div>
    </AppShell>
  );
}
