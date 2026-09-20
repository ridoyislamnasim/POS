"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ResourcePage } from "@/components/erp-page";

export default function SubcategoriesPage() {
  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<{ id: string; name: string }[]>("/api/v1/catalog/categories?limit=100"),
  });
  return (
    <ResourcePage
      title="Subcategories"
      description="Optional on products. Filtered by the selected category."
      path="/api/v1/catalog/subcategories"
      queryKey="subcategories"
      searchPlaceholder="Search subcategory"
      entityName="subcategory"
      fields={[
        {
          key: "categoryId",
          label: "Category",
          type: "select",
          required: true,
          options: (cats.data ?? []).map((c) => ({ value: c.id, label: c.name })),
        },
        { key: "name", label: "Name", required: true },
        { key: "slug", label: "Slug" },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "category", label: "Category", render: (r) => (r as { category?: { name: string } }).category?.name ?? "—" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={[
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ]}
    />
  );
}
