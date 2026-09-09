"use client";

import { ResourcePage, moneyCell } from "@/components/erp-page";

export default function CustomerDuePage() {
  return (
    <ResourcePage
      title="Customer Due"
      description="Open credit balances on customer accounts."
      path="/api/v1/finance/customer-dues"
      queryKey="customer-dues"
      rowHref={(r) => `/customers/${r.id}`}
      columns={[
        { key: "name", label: "Customer" },
        { key: "phone", label: "Phone" },
        { key: "creditDue", label: "Due", render: (r) => moneyCell((r as { creditDue: string }).creditDue) },
        { key: "creditLimit", label: "Limit", render: (r) => moneyCell((r as { creditLimit: string }).creditLimit) },
      ]}
    />
  );
}
