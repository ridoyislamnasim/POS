"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader, Skeleton } from "@/components/ui";
import { ProductForm } from "@/components/catalog/product-form";
import { Suspense } from "react";

export default function NewProductPage() {
  return (
    <AppShell>
      <PageHeader title="Create product" description="Category is required. Subcategory, brand, and variants are optional." />
      <Suspense fallback={<Skeleton rows={10} />}>
        <ProductForm />
      </Suspense>
    </AppShell>
  );
}
