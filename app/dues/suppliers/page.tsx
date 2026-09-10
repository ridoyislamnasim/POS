"use client";

import { ResourcePage, moneyCell, moneyText, sumField } from "@/components/erp-page";

export default function SupplierDuePage() {
  return (
    <ResourcePage
      title="Supplier Due"
      description="Amounts owed to suppliers."
      path="/api/v1/finance/supplier-dues"
      queryKey="supplier-dues"
      searchPlaceholder="Search supplier"
      summary={({ rows, total }) => [
        { label: "Suppliers", value: total, accent: "sky" },
        { label: "Due", value: moneyText(sumField(rows, "creditDue")), accent: "amber", description: "This page" },
      ]}
      rowHref={(r) => `/suppliers/${r.id}`}
      columns={[
        { key: "name", label: "Supplier" },
        { key: "phone", label: "Phone" },
        { key: "creditDue", label: "Due", render: (r) => moneyCell((r as { creditDue: string }).creditDue) },
      ]}
    />
  );
}
