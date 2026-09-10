"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import {
  DataTable,
  ErrorState,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  btnGhost,
  inputClass,
  tableCellNumeric,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ProductForm, type ProductLoaded } from "@/components/catalog/product-form";
import { printBarcodeLabels } from "@/lib/print-barcodes";
import { toastError, toastSuccess, toastWarn } from "@/lib/toast";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => api<ProductLoaded>(`/api/v1/catalog/products/${id}`),
  });
  const [archiveOpen, setArchiveOpen] = useState(false);
  const archive = useMutation({
    mutationFn: () => api(`/api/v1/catalog/products/${id}/archive`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Product archived", product.data?.name);
      setArchiveOpen(false);
      qc.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (e) => toastError(e),
  });
  const patchVariant = useMutation({
    mutationFn: (input: { id: string; sku?: string; price?: string; cost?: string; status?: string }) =>
      api(`/api/v1/catalog/variants/${input.id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      toastSuccess("Variant updated");
      qc.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (e) => toastError(e),
  });

  if (product.isLoading) {
    return (
      <AppShell>
        <Skeleton rows={10} />
      </AppShell>
    );
  }
  if (product.isError || !product.data) {
    return (
      <AppShell>
        <ErrorState message="Product not found or could not load." onRetry={() => product.refetch()} />
      </AppShell>
    );
  }
  const p = product.data;

  return (
    <AppShell>
      <PageHeader title={p.name} description={`${p.code} · ${p.type}`}>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            const labels = (p.variants ?? []).flatMap((v) => {
              const codes = v.barcodes.length ? v.barcodes.map((b) => b.code) : [v.sku];
              return codes.map((code) => ({
                code,
                sku: v.sku,
                name: p.name,
                price: Number(v.price).toFixed(2),
                kind: "CODE128",
              }));
            });
            if (!printBarcodeLabels(labels)) toastWarn("Allow pop-ups to print barcode labels");
          }}
        >
          Print barcodes
        </button>
        {p.status !== "ARCHIVED" ? (
          <button type="button" className={btnGhost} onClick={() => setArchiveOpen(true)}>
            Archive
          </button>
        ) : null}
      </PageHeader>
      <ProductForm product={p} />
      {(p.variants ?? []).length ? (
        <DataTable className="mt-3">
          <div className="border-b border-border px-2 py-1.5 sm:px-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved variants</h3>
          </div>
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className={tableCellNumeric}>Price</TableHead>
                <TableHead className={tableCellNumeric}>Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.variants!.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.attributes.map((a) => a.option.label).join(" / ") || "Default"}</TableCell>
                  <TableCell>
                    <input
                      className={inputClass + " h-8 w-36 text-xs"}
                      defaultValue={v.sku}
                      onBlur={(e) => e.target.value !== v.sku && patchVariant.mutate({ id: v.id, sku: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="text-xs">{v.barcodes.map((b) => b.code).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <input
                      className={inputClass + " h-8 w-24 text-xs"}
                      defaultValue={v.price}
                      onBlur={(e) => e.target.value !== v.price && patchVariant.mutate({ id: v.id, price: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      className={inputClass + " h-8 w-24 text-xs"}
                      defaultValue={v.cost}
                      onBlur={(e) => e.target.value !== v.cost && patchVariant.mutate({ id: v.id, cost: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      className={inputClass + " h-8 w-28 text-xs"}
                      defaultValue={v.status}
                      onChange={(e) => patchVariant.mutate({ id: v.id, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      ) : null}
      <ConfirmDialog
        open={archiveOpen}
        title="Archive product?"
        description={`“${p.name}” will be hidden from POS until you restore it.`}
        confirmLabel="Archive"
        variant="warning"
        loading={archive.isPending}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => archive.mutate()}
      />
    </AppShell>
  );
}
