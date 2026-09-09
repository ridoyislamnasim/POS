"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Kpi, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, ErrorState } from "@/components/ui";

type Flow = {
  from: string;
  to: string;
  inflows: string;
  outflows: string;
  net: string;
  salesIn: string;
  expenses: string;
  income: string;
  duesCollected: string;
  supplierPaid: string;
};

export default function CashFlowPage() {
  const q = useQuery({ queryKey: ["cash-flow"], queryFn: () => api<Flow>("/api/v1/finance/cash-flow") });
  const d = q.data;
  return (
    <AppShell>
      <PageHeader title="Cash Flow" description="Money in vs money out for today." />
      {q.isError ? <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} /> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Inflows" value={`৳ ${d?.inflows ?? "0.00"}`} loading={q.isLoading} tone="increase" />
        <Kpi label="Outflows" value={`৳ ${d?.outflows ?? "0.00"}`} loading={q.isLoading} tone="decrease" />
        <Kpi label="Net" value={`৳ ${d?.net ?? "0.00"}`} loading={q.isLoading} />
      </div>
      <ShellCard className="mt-6">
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>Sales collected: ৳ {d?.salesIn}</div>
          <div>Other income: ৳ {d?.income}</div>
          <div>Dues collected: ৳ {d?.duesCollected}</div>
          <div>Expenses: ৳ {d?.expenses}</div>
          <div>Supplier paid: ৳ {d?.supplierPaid}</div>
        </CardContent>
      </ShellCard>
    </AppShell>
  );
}
