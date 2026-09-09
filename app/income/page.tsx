"use client";

import { ResourcePage, moneyCell } from "@/components/erp-page";
import { useMe } from "@/lib/auth";

export default function IncomePage() {
  const { me } = useMe();
  return (
    <ResourcePage
      title="Income"
      description="Other income outside POS sales."
      path="/api/v1/finance/income"
      queryKey="income"
      fields={[
        { key: "category", label: "Category", required: true },
        { key: "amount", label: "Amount", type: "number", required: true },
        { key: "method", label: "Method", type: "select", options: ["CASH", "CARD", "BANK", "MFS"].map((v) => ({ value: v, label: v })) },
        { key: "notes", label: "Notes" },
        { key: "branchId", label: "Branch", type: "select", options: (me?.branches ?? []).map((b) => ({ value: b.id, label: b.name })) },
      ]}
      columns={[
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount", render: (r) => moneyCell((r as { amount: string }).amount) },
        { key: "method", label: "Method" },
        { key: "notes", label: "Notes" },
      ]}
    />
  );
}
