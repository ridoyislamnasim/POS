"use client";

import { ResourcePage, statusBadge } from "@/components/erp-page";
import { useMe } from "@/lib/auth";

export default function DeliveriesPage() {
  const { me } = useMe();
  return (
    <ResourcePage
      title="Deliveries"
      description="Last-mile status for sales orders and e-commerce tickets."
      path="/api/v1/commerce/deliveries"
      queryKey="deliveries"
      fields={[
        { key: "branchId", label: "Branch", type: "select", required: true, options: (me?.branches ?? []).map((b) => ({ value: b.id, label: b.name })) },
        { key: "address", label: "Address", required: true },
        { key: "phone", label: "Phone" },
        { key: "courier", label: "Courier" },
        { key: "tracking", label: "Tracking" },
      ]}
      columns={[
        { key: "address", label: "Address" },
        { key: "courier", label: "Courier" },
        { key: "tracking", label: "Tracking" },
        { key: "status", label: "Status", render: (r) => statusBadge((r as { status: string }).status) },
      ]}
    />
  );
}
