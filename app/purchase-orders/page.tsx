"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/ui/dialog";
import { Button, Field, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, inputClass, EmptyState } from "@/components/ui";
import { toastCreated, toastError } from "@/lib/toast";
import { moneyCell, statusBadge } from "@/components/erp-page";

type PO = {
  id: string;
  number: string;
  total: string;
  status: string;
  supplier: { name: string };
  branch: { name: string };
};

export default function PurchaseOrdersPage() {
  const { me } = useMe();
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers") });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => api<{ variants: { id: string; sku: string }[] }[]>("/api/v1/catalog/products"),
  });
  const list = useQuery({ queryKey: ["pos"], queryFn: () => api<PO[]>("/api/v1/purchases/orders") });
  const variants = (products.data ?? []).flatMap((p) => p.variants ?? []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ branchId: "", supplierId: "", variantId: "", qty: "1", unitCost: "" });
  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/purchases/orders", {
        method: "POST",
        body: JSON.stringify({
          branchId: form.branchId,
          supplierId: form.supplierId,
          items: [{ variantId: form.variantId, qty: Number(form.qty), unitCost: Number(form.unitCost) }],
        }),
      }),
    onSuccess: () => {
      toastCreated("purchase order");
      setOpen(false);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not create purchase order"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  const { rows, pager } = usePagedRows(list.data ?? []);

  return (
    <AppShell>
      <PageHeader title="Purchase Orders" description="Send orders to suppliers, then receive as a purchase.">
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create PO
        </Button>
      </PageHeader>
      {!list.data?.length ? <EmptyState title="No purchase orders" hint="Create a PO, then receive it as a purchase." /> : null}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.number}</TableCell>
                <TableCell>{p.supplier?.name}</TableCell>
                <TableCell>{moneyCell(p.total)}</TableCell>
                <TableCell>{statusBadge(p.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
      <Dialog
        open={open}
        title="Create purchase order"
        description="Order stock from a supplier. Receive it later on Purchases."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-po-form" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create PO
            </Button>
          </>
        }
      >
        <form id="create-po-form" className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Branch *">
            <select className={inputClass} required value={form.branchId} onChange={(e) => setForm((s) => ({ ...s, branchId: e.target.value }))}>
              <option value="">Select branch</option>
              {(me?.branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Supplier *">
            <select className={inputClass} required value={form.supplierId} onChange={(e) => setForm((s) => ({ ...s, supplierId: e.target.value }))}>
              <option value="">Select supplier</option>
              {(suppliers.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="SKU *">
            <select className={inputClass} required value={form.variantId} onChange={(e) => setForm((s) => ({ ...s, variantId: e.target.value }))}>
              <option value="">Select SKU</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{v.sku}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity *">
            <input className={inputClass} type="number" min="1" required placeholder="Qty" value={form.qty} onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Unit cost *">
              <input className={inputClass} type="number" required placeholder="Unit cost" value={form.unitCost} onChange={(e) => setForm((s) => ({ ...s, unitCost: e.target.value }))} />
            </Field>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
