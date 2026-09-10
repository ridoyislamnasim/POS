"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { ErrorState, PageHeader, SummaryCards } from "@/components/ui";

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
      <SummaryCards
        items={[
          { label: "Inflows", value: `৳ ${d?.inflows ?? "0.00"}`, accent: "emerald", loading: q.isLoading },
          { label: "Outflows", value: `৳ ${d?.outflows ?? "0.00"}`, accent: "rose", loading: q.isLoading },
          { label: "Net", value: `৳ ${d?.net ?? "0.00"}`, accent: "sky", loading: q.isLoading },
          { label: "Sales", value: `৳ ${d?.salesIn ?? "0.00"}`, accent: "orange", loading: q.isLoading },
          { label: "Income", value: `৳ ${d?.income ?? "0.00"}`, accent: "lime", loading: q.isLoading },
          { label: "Dues in", value: `৳ ${d?.duesCollected ?? "0.00"}`, accent: "violet", loading: q.isLoading },
          { label: "Expenses", value: `৳ ${d?.expenses ?? "0.00"}`, accent: "amber", loading: q.isLoading },
          { label: "Suppliers", value: `৳ ${d?.supplierPaid ?? "0.00"}`, accent: "teal", loading: q.isLoading },
        ]}
      />
    </AppShell>
  );
}
