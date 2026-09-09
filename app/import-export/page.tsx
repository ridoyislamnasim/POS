"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button, PageHeader, ShellCard, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

export default function ImportExportPage() {
  const [productCsv, setProductCsv] = useState("name,code,sku,price,cost,category\nCotton Kurta,KURTA-02,KURTA-02-RED-M,1890,850,Women");
  const [customerCsv, setCustomerCsv] = useState("name,phone,email,address\nRafi Hasan,+8801711222333,rafi@example.com,Uttara");
  const products = useMutation({
    mutationFn: () => api("/api/v1/extras/import/products", { method: "POST", body: JSON.stringify({ csv: productCsv }) }),
    onSuccess: (d) => toastSuccess(`Imported ${(d as { created: number }).created} products`),
    onError: (e) => toastError(e, "Product import failed"),
  });
  const customers = useMutation({
    mutationFn: () => api("/api/v1/extras/import/customers", { method: "POST", body: JSON.stringify({ csv: customerCsv }) }),
    onSuccess: (d) => toastSuccess(`Imported ${(d as { created: number }).created} customers`),
    onError: (e) => toastError(e, "Customer import failed"),
  });
  async function exportKind(kind: string) {
    try {
      const data = await api(`/api/v1/extras/export?kind=${kind}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${kind}.json`;
      a.click();
    } catch (e) {
      toastError(e, "Export failed");
    }
  }
  return (
    <AppShell>
      <PageHeader title="Import / Export" description="Excel/CSV-style paste for products and customers. Backup JSON from Organization." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader><CardTitle>Product import (CSV)</CardTitle></CardHeader>
          <CardContent>
            <textarea className="mb-2 min-h-40 w-full rounded-md border p-2 font-mono text-xs" value={productCsv} onChange={(e) => setProductCsv(e.target.value)} />
            <Button onClick={() => products.mutate()}>Import products</Button>
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Customer import (CSV)</CardTitle></CardHeader>
          <CardContent>
            <textarea className="mb-2 min-h-40 w-full rounded-md border p-2 font-mono text-xs" value={customerCsv} onChange={(e) => setCustomerCsv(e.target.value)} />
            <Button onClick={() => customers.mutate()}>Import customers</Button>
          </CardContent>
        </ShellCard>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => exportKind("products")}>Export products</Button>
        <Button variant="outline" onClick={() => exportKind("customers")}>Export customers</Button>
      </div>
    </AppShell>
  );
}
