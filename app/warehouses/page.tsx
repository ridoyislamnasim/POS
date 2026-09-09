"use client";

import { ResourcePage } from "@/components/erp-page";

export default function WarehousesPage() {
  return (
    <ResourcePage
      title="Warehouses"
      description="Stock locations that are not POS branches."
      path="/api/v1/org/warehouses"
      queryKey="warehouses"
      fields={[{ key: "name", label: "Warehouse name", required: true }]}
      columns={[
        { key: "name", label: "Name" },
        { key: "type", label: "Type" },
      ]}
    />
  );
}
