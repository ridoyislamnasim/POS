"use client";

import { ResourcePage, moneyCell, moneyText, sumField } from "@/components/erp-page";

export default function CustomerDuePage() {
  return (
    <ResourcePage
      title="Customer Due"
      description="Open credit balances on customer accounts."
      path="/api/v1/finance/customer-dues"
      queryKey="customer-dues"
      searchPlaceholder="Search customer"
      summary={({ rows, total }) => [
        { label: "Accounts", value: total, accent: "sky" },
        { label: "Due", value: moneyText(sumField(rows, "creditDue")), accent: "rose", description: "This page" },
        { label: "Limit", value: moneyText(sumField(rows, "creditLimit")), accent: "amber", description: "This page" },
      ]}
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
