"use client";

import { ResourcePage } from "@/components/erp-page";

export default function BrandsPage() {
  return (
    <ResourcePage
      title="Brands"
      description="Optional brand master used on product create."
      path="/api/v1/catalog/brands"
      queryKey="brands"
      searchPlaceholder="Search brand"
      entityName="brand"
      fields={[
        { key: "name", label: "Name", required: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ],
        },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
