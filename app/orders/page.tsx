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

type SO = { id: string; number: string; total: string; status: string; customer?: { name: string }; branch: { name: string } };

export default function OrdersPage() {
  const { me } = useMe();
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/customers") });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api<{ variants: { id: string; sku: string }[] }[]>("/api/v1/catalog/products") });
  const list = useQuery({ queryKey: ["so"], queryFn: () => api<SO[]>("/api/v1/commerce/sales-orders") });
  const variants = (products.data ?? []).flatMap((p) => p.variants ?? []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ branchId: "", customerId: "", variantId: "", qty: "1" });
  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/commerce/sales-orders", {
        method: "POST",
        body: JSON.stringify({
          branchId: form.branchId,
          customerId: form.customerId || undefined,
          items: [{ variantId: form.variantId, qty: Number(form.qty) }],
        }),
      }),
    onSuccess: () => {
      toastCreated("sales order");
      setOpen(false);
      setForm({ branchId: "", customerId: "", variantId: "", qty: "1" });
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not create sales order"),
  });
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }
  const { rows, pager } = usePagedRows(list.data ?? []);
  return (
    <AppShell>
      <PageHeader title="Sales Orders" description="Confirm orders before they hit the register.">
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create order
        </Button>
      </PageHeader>
      {!list.data?.length ? <EmptyState title="No sales orders" hint="Create an order to confirm it before the register." /> : null}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.number}</TableCell>
                <TableCell>{o.customer?.name ?? "—"}</TableCell>
                <TableCell>{moneyCell(o.total)}</TableCell>
                <TableCell>{statusBadge(o.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
      <Dialog
        open={open}
        title="Create sales order"
        description="Pick a branch, optional customer, and one SKU to start."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-so-form" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create order
            </Button>
          </>
        }
      >
        <form id="create-so-form" className="grid gap-3" onSubmit={onSubmit}>
          <Field label="Branch *">
            <select className={inputClass} required value={form.branchId} onChange={(e) => setForm((s) => ({ ...s, branchId: e.target.value }))}>
              <option value="">Select branch</option>
              {(me?.branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer">
            <select className={inputClass} value={form.customerId} onChange={(e) => setForm((s) => ({ ...s, customerId: e.target.value }))}>
              <option value="">Walk-in / none</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SKU *">
            <select className={inputClass} required value={form.variantId} onChange={(e) => setForm((s) => ({ ...s, variantId: e.target.value }))}>
              <option value="">Select SKU</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity *">
            <input className={inputClass} type="number" min="1" required value={form.qty} onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))} />
          </Field>
        </form>
      </Dialog>
    </AppShell>
  );
}
