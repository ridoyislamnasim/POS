"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, ErrorState, Field, PageHeader, Skeleton, TablePagination, btnGhost, btnPrimary, inputClass } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError, toastSuccess } from "@/lib/toast";

type Product = {
  id: string;
  name: string;
  code: string;
  category: string | null;
  status: string;
  variants: {
    id: string;
    sku: string;
    price: string;
    cost: string;
    status: string;
    attributes: { option: { label: string } }[];
    barcodes: { id: string; code: string; primary: boolean }[];
  }[];
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => api<Product>(`/api/v1/catalog/products/${id}`),
  });
  const [name, setName] = useState("");
  const [barcodeFor, setBarcodeFor] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/v1/catalog/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name || product.data?.name }),
      }),
    onSuccess: () => {
      toastSuccess("Product updated");
      qc.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (e) => toastError(e),
  });
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
    mutationFn: (input: { id: string; sku?: string; price?: string; cost?: string }) =>
      api(`/api/v1/catalog/variants/${input.id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      toastSuccess("Variant updated");
      qc.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (e) => toastError(e),
  });
  const { rows, pager } = usePagedRows(product.data?.variants ?? []);
  const addBarcode = useMutation({
    mutationFn: () =>
      api(`/api/v1/catalog/variants/${barcodeFor}/barcodes`, {
        method: "POST",
        body: JSON.stringify({ code: barcode, primary: true }),
      }),
    onSuccess: () => {
      toastSuccess("Barcode saved");
      setBarcode("");
      setBarcodeFor(null);
      qc.invalidateQueries({ queryKey: ["product", id] });
    },
    onError: (e) => toastError(e, "Could not save barcode"),
  });

  if (product.isLoading) {
    return (
      <AppShell>
        <Skeleton rows={8} />
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
      <PageHeader title={p.name}>
        <button type="button" className={btnPrimary} onClick={() => save.mutate()}>
          Save
        </button>
        {p.status !== "ARCHIVED" ? (
          <button type="button" className={btnGhost} onClick={() => setArchiveOpen(true)}>
            Archive
          </button>
        ) : null}
      </PageHeader>
      <Card className="mb-3 grid gap-3 md:grid-cols-3">
        <Field label="Name">
          <input className={inputClass} defaultValue={p.name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Code">
          <input className={inputClass} value={p.code} readOnly />
        </Field>
        <Field label="Status">
          <input className={inputClass} value={p.status} readOnly />
        </Field>
      </Card>
      {!p.variants.length ? <EmptyState title="No variants" hint="Generate Colour × Size from New product." /> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2">Variant</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>Price</th>
              <th>Cost</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-t border-line">
                <td className="py-2">{v.attributes.map((a) => a.option.label).join(" / ") || "—"}</td>
                <td>
                  <input
                    className={inputClass + " w-40"}
                    defaultValue={v.sku}
                    onBlur={(e) => e.target.value !== v.sku && patchVariant.mutate({ id: v.id, sku: e.target.value })}
                  />
                </td>
                <td>
                  {v.barcodes.map((b) => b.code).join(", ") || "—"}
                  <button type="button" className="ml-2 text-xs underline" onClick={() => setBarcodeFor(v.id)}>
                    Add
                  </button>
                </td>
                <td>
                  <input
                    className={inputClass + " w-24"}
                    defaultValue={v.price}
                    onBlur={(e) => e.target.value !== v.price && patchVariant.mutate({ id: v.id, price: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={inputClass + " w-24"}
                    defaultValue={v.cost}
                    onBlur={(e) => e.target.value !== v.cost && patchVariant.mutate({ id: v.id, cost: e.target.value })}
                  />
                </td>
                <td className="text-xs text-muted-foreground">{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination {...pager} />
      </div>
      {barcodeFor ? (
        <Card className="mt-3 flex max-w-md items-end gap-2">
          <Field label="New barcode">
            <input className={inputClass} value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </Field>
          <button type="button" className={btnPrimary} onClick={() => addBarcode.mutate()}>
            Save
          </button>
          <button type="button" className={btnGhost} onClick={() => setBarcodeFor(null)}>
            Cancel
          </button>
        </Card>
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
