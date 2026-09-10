"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ResourcePage, moneyCell, moneyText, statusBadge, sumField } from "@/components/erp-page";
import { useMe } from "@/lib/auth";

export default function ExpensesPage() {
  const { me } = useMe();
  const cats = useQuery({
    queryKey: ["expense-cats"],
    queryFn: () => api<{ id: string; name: string }[]>("/api/v1/finance/expense-categories"),
  });
  return (
    <ResourcePage
      title="Expenses"
      description="Posted operating expenses by category and branch."
      path="/api/v1/finance/expenses"
      queryKey="expenses"
      searchPlaceholder="Search vendor or notes"
      dateFilter
      summary={({ rows, total }) => [
        { label: "Records", value: total, accent: "sky" },
        { label: "Amount", value: moneyText(sumField(rows, "amount")), accent: "rose", description: "This page" },
        { label: "Posted", value: rows.filter((r) => (r as { status?: string }).status === "POSTED").length, accent: "emerald" },
      ]}
      statusOptions={[
        { value: "POSTED", label: "Posted" },
        { value: "DRAFT", label: "Draft" },
        { value: "VOIDED", label: "Voided" },
      ]}
      fields={[
        { key: "categoryId", label: "Category", type: "select", required: true, options: (cats.data ?? []).map((c) => ({ value: c.id, label: c.name })) },
        { key: "amount", label: "Amount", type: "number", required: true },
        { key: "method", label: "Method", type: "select", options: ["CASH", "CARD", "BANK", "MFS"].map((v) => ({ value: v, label: v })) },
        { key: "vendor", label: "Vendor" },
        { key: "notes", label: "Notes" },
        { key: "branchId", label: "Branch", type: "select", options: (me?.branches ?? []).map((b) => ({ value: b.id, label: b.name })) },
      ]}
      columns={[
        { key: "category", label: "Category", render: (r: { category?: { name: string } }) => r.category?.name ?? "—" },
        { key: "vendor", label: "Vendor" },
        { key: "amount", label: "Amount", render: (r) => moneyCell((r as { amount: string }).amount) },
        { key: "method", label: "Pay" },
        { key: "status", label: "Status", render: (r) => statusBadge((r as { status: string }).status) },
      ]}
    />
  );
}
