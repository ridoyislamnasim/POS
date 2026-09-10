"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { DataTable, ErrorState, PageHeader, SummaryCards, Table, TableBody, TableCell, TablePagination, TableRow } from "@/components/ui";
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
      <SummaryCards
        items={[
          { label: "Revenue", value: `৳ ${d?.revenue ?? "0.00"}`, accent: "emerald", loading: q.isLoading },
          { label: "COGS", value: `৳ ${d?.cogs ?? "0.00"}`, accent: "amber", loading: q.isLoading },
          { label: "Gross profit", value: `৳ ${d?.grossProfit ?? "0.00"}`, accent: "lime", loading: q.isLoading },
          { label: "Tax / VAT", value: `৳ ${d?.tax ?? "0.00"}`, accent: "violet", loading: q.isLoading },
          { label: "Other income", value: `৳ ${d?.otherIncome ?? "0.00"}`, accent: "sky", loading: q.isLoading },
          { label: "Expenses", value: `৳ ${d?.expenses ?? "0.00"}`, accent: "rose", loading: q.isLoading },
          { label: "Net profit", value: `৳ ${d?.netProfit ?? "0.00"}`, accent: "orange", loading: q.isLoading },
        ]}
      />
      <DataTable>
        <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Expense categories</div>
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
      </DataTable>
    </AppShell>
  );
}
