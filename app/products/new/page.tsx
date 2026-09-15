"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Skeleton, btnGhost } from "@/components/ui";
import { ProductForm } from "@/components/catalog/product-form";
import { Suspense } from "react";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <AppShell>
      <button type="button" className={btnGhost + " mb-2 h-8 px-2 text-xs"} onClick={() => router.push("/products")}>
        <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden />
        Back to products
      </button>
      <PageHeader title="Create product" description="Category is required. Subcategory, brand, and variants are optional." />
      <Suspense fallback={<Skeleton rows={10} />}>
        <ProductForm />
      </Suspense>
    </AppShell>
  );
}
