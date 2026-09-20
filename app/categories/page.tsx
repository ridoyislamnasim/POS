"use client";

import { ResourcePage } from "@/components/erp-page";

export default function CategoriesPage() {
  return (
    <ResourcePage
      title="Categories"
      description="Required on every product. Create categories here — not inline on product create."
      path="/api/v1/catalog/categories"
      queryKey="categories"
      searchPlaceholder="Search name or code"
      entityName="category"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug" },
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
        { key: "slug", label: "Slug" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={[
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ]}
    />
  );
}
