"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { useMe } from "@/lib/auth";
import { useVariantOptions } from "@/lib/lookups";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, Field, PageHeader, SummaryCards, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellNumeric, tableCellActions } from "@/components/ui";
import { toastCreated, toastError, toastSuccess } from "@/lib/toast";
import { moneyCell, moneyText, statusBadge, sumField } from "@/components/erp-page";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { X } from "lucide-react";

type SO = { id: string; number: string; total: string; status: string; customer?: { name: string }; branch: { name: string } };

export default function OrdersPage() {
  const { me } = useMe();
  const customers = useQuery({ queryKey: ["customers-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/customers?limit=100") });
  const variantsQ = useVariantOptions();
  const variants = variantsQ.data ?? [];
  const list = useServerList<SO>("so", "/api/v1/commerce/sales-orders");
  const [open, setOpen] = useState(false);
  const [cancelRow, setCancelRow] = useState<SO | null>(null);
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
  const cancelSo = useMutation({
    mutationFn: (id: string) => api(`/api/v1/commerce/sales-orders/${id}`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }),
    onSuccess: () => {
      toastSuccess("Sales order cancelled");
      setCancelRow(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not cancel sales order"),
  });
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }
  return (
    <AppShell>
      <PageHeader title="Sales Orders" description="Confirm orders before they hit the register.">
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create order
        </Button>
      </PageHeader>
      <SummaryCards
        items={[
          { label: "Orders", value: list.pager.total, accent: "sky" },
          { label: "Total", value: moneyText(sumField(list.rows, "total")), accent: "emerald", description: "This page" },
          { label: "Open", value: list.rows.filter((r) => r.status === "DRAFT" || r.status === "CONFIRMED").length, accent: "amber" },
        ]}
      />
      <ListFrame
        list={list}
        searchPlaceholder="Search order or customer"
        dateFilter
        statusOptions={[
          { value: "DRAFT", label: "Draft" },
          { value: "CONFIRMED", label: "Confirmed" },
          { value: "CONVERTED", label: "Converted" },
          { value: "CANCELLED", label: "Cancelled" },
        ]}
        columnCount={5}
        emptyTitle="No records found"
        emptyHint="Create an order to confirm it before the register."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className={tableCellNumeric}>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.number}</TableCell>
                <TableCell>{o.customer?.name ?? "—"}</TableCell>
                <TableCell className={tableCellNumeric}>{moneyCell(o.total)}</TableCell>
                <TableCell>{statusBadge(o.status)}</TableCell>
                  <TableCell className={tableCellActions}>
                    {o.status !== "CANCELLED" && o.status !== "CONVERTED" ? (
                      <IconActionButton icon={<X className="h-3.5 w-3.5" />} label="Cancel order" variant="destructive" onClick={() => setCancelRow(o)} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
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
      <ConfirmDialog
        open={Boolean(cancelRow)}
        title="Cancel this sales order?"
        description={cancelRow ? `${cancelRow.number} will be cancelled.` : "Cancel this order."}
        confirmLabel="Cancel order"
        loading={cancelSo.isPending}
        onClose={() => setCancelRow(null)}
        onConfirm={() => cancelRow && cancelSo.mutate(cancelRow.id)}
      />
    </AppShell>
  );
}
