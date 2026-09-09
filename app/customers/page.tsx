"use client";

import { ResourcePage } from "@/components/erp-page";
import { moneyCell } from "@/components/erp-page";

export default function CustomersPage() {
  return (
    <ResourcePage
      title="Customers"
      description="Profiles, credit, and loyalty live on each customer record."
      path="/api/v1/customers"
      queryKey="customers"
      createLabel="Add customer"
      entityName="customer"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "phone", label: "Phone", required: true },
        { key: "email", label: "Email" },
        { key: "address", label: "Address" },
        { key: "creditLimit", label: "Credit limit", type: "number" },
      ]}
      rowHref={(r) => `/customers/${r.id}`}
      columns={[
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "loyaltyPoints", label: "Points" },
        { key: "creditDue", label: "Due", render: (r) => moneyCell((r as { creditDue: string }).creditDue) },
      ]}
    />
  );
}
