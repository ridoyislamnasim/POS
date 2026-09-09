"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/ui/dialog";
import { Button, Field, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, inputClass, EmptyState, Skeleton } from "@/components/ui";
import { toastCreated, toastError } from "@/lib/toast";
import { moneyCell, statusBadge } from "@/components/erp-page";

type Purchase = {
  id: string;
  invoiceNumber: string;
  total: string;
  paid: string;
  due: string;
  status: string;
  supplier: { name: string };
  branch: { name: string };
};

export default function PurchasesPage() {
  const { me } = useMe();
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers") });
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => api<{ variants: { id: string; sku: string; cost: string; product?: { name: string } }[] }[]>("/api/v1/catalog/products"),
  });
  const list = useQuery({ queryKey: ["purchases"], queryFn: () => api<Purchase[]>("/api/v1/purchases") });
  const variants = (products.data ?? []).flatMap((p) => p.variants ?? []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ branchId: "", supplierId: "", variantId: "", qty: "1", unitCost: "", paid: "0" });
  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/purchases", {
        method: "POST",
        body: JSON.stringify({
          branchId: form.branchId,
          supplierId: form.supplierId,
          paid: form.paid,
          items: [{ variantId: form.variantId, qty: Number(form.qty), unitCost: Number(form.unitCost) }],
        }),
      }),
    onSuccess: () => {
      toastCreated("purchase", "Stock was increased");
      setOpen(false);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not receive purchase"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  const { rows, pager } = usePagedRows(list.data ?? []);

  return (
    <AppShell>
      <PageHeader title="Purchases" description="Goods received — stock is increased on save.">
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Receive purchase
        </Button>
      </PageHeader>
      {list.isLoading ? <Skeleton rows={6} /> : null}
      {!list.data?.length ? <EmptyState title="No purchases yet" hint="Receive goods to add stock." /> : null}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.invoiceNumber}</TableCell>
                <TableCell>{p.supplier?.name}</TableCell>
                <TableCell>{p.branch?.name}</TableCell>
                <TableCell>{moneyCell(p.total)}</TableCell>
                <TableCell>{moneyCell(p.due)}</TableCell>
                <TableCell>{statusBadge(p.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
      <Dialog
        open={open}
        title="Receive purchase"
        description="Stock increases as soon as you save."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="receive-purchase-form" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Receive
            </Button>
          </>
        }
      >
        <form id="receive-purchase-form" className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
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
          <Field label="Unit cost *">
            <input className={inputClass} type="number" required placeholder="Unit cost" value={form.unitCost} onChange={(e) => setForm((s) => ({ ...s, unitCost: e.target.value }))} />
          </Field>
          <Field label="Paid now">
            <input className={inputClass} type="number" placeholder="Paid now" value={form.paid} onChange={(e) => setForm((s) => ({ ...s, paid: e.target.value }))} />
          </Field>
        </form>
      </Dialog>
    </AppShell>
  );
}
