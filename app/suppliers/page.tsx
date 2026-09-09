"use client";

import { ResourcePage, moneyCell } from "@/components/erp-page";

export default function SuppliersPage() {
  return (
    <ResourcePage
      title="Suppliers"
      description="Vendor master, purchase history, and outstanding payables."
      path="/api/v1/suppliers"
      queryKey="suppliers"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "address", label: "Address" },
        { key: "taxId", label: "Tax ID" },
      ]}
      rowHref={(r) => `/suppliers/${r.id}`}
      columns={[
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "creditDue", label: "Due", render: (r) => moneyCell((r as { creditDue: string }).creditDue) },
      ]}
    />
  );
}
