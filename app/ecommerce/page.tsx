"use client";

import { ResourcePage, moneyCell, statusBadge } from "@/components/erp-page";

export default function EcommercePage() {
  return (
    <ResourcePage
      title="E-commerce Orders"
      description="Inbound tickets from an online store or marketplace."
      path="/api/v1/commerce/ecommerce"
      queryKey="ecom"
      fields={[
        { key: "channel", label: "Channel", required: true },
        { key: "externalId", label: "External ID", required: true },
        { key: "total", label: "Total", type: "number", required: true },
      ]}
      columns={[
        { key: "channel", label: "Channel" },
        { key: "externalId", label: "External ID" },
        { key: "total", label: "Total", render: (r) => moneyCell((r as { total: string }).total) },
        { key: "status", label: "Status", render: (r) => statusBadge((r as { status: string }).status) },
      ]}
    />
  );
}
