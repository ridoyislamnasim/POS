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
import { Button, Field, PageHeader, SummaryCards, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellNumeric, tableCellActions, IconActionButton } from "@/components/ui";
import { toastCreated, toastError, toastSuccess } from "@/lib/toast";
import { moneyCell, moneyText, statusBadge, sumField } from "@/components/erp-page";
import { DocumentActions } from "@/components/documents/document-actions";
import { X } from "lucide-react";

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
  const suppliers = useQuery({ queryKey: ["suppliers-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers?limit=100") });
  const variantsQ = useVariantOptions();
  const variants = variantsQ.data ?? [];
  const list = useServerList<PO>("purchase-orders", "/api/v1/purchases/orders");
  const [open, setOpen] = useState(false);
  const [cancelRow, setCancelRow] = useState<PO | null>(null);
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
  const cancelPo = useMutation({
    mutationFn: (id: string) => api(`/api/v1/purchases/orders/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Purchase order cancelled");
      setCancelRow(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not cancel purchase order"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <AppShell>
      <PageHeader title="Purchase Orders" description="Send orders to suppliers, then receive as a purchase.">
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create PO
        </Button>
      </PageHeader>
      <SummaryCards
        items={[
          { label: "Orders", value: list.pager.total, accent: "sky" },
          { label: "Total", value: moneyText(sumField(list.rows, "total")), accent: "orange", description: "This page" },
          { label: "Open", value: list.rows.filter((r) => r.status !== "CANCELLED" && r.status !== "RECEIVED").length, accent: "amber" },
        ]}
      />
      <ListFrame
        list={list}
        searchPlaceholder="Search PO or supplier"
        dateFilter
        statusOptions={[
          { value: "DRAFT", label: "Draft" },
          { value: "ORDERED", label: "Ordered" },
          { value: "PARTIAL", label: "Partial" },
          { value: "RECEIVED", label: "Received" },
          { value: "CANCELLED", label: "Cancelled" },
        ]}
        columnCount={5}
        emptyTitle="No records found"
        emptyHint="Create a PO, then receive it as a purchase."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className={tableCellNumeric}>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.number}</TableCell>
                <TableCell>{p.supplier?.name}</TableCell>
                <TableCell className={tableCellNumeric}>{moneyCell(p.total)}</TableCell>
                <TableCell>{statusBadge(p.status)}</TableCell>
                <TableCell className={tableCellActions}>
                  <div className="inline-flex flex-wrap items-center justify-end gap-1">
                    <DocumentActions type="purchase-order" id={p.id} number={p.number} />
                    {p.status !== "CANCELLED" && p.status !== "RECEIVED" ? (
                      <IconActionButton icon={<X className="h-3.5 w-3.5" />} label="Cancel purchase order" variant="destructive" onClick={() => setCancelRow(p)} />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
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
      <ConfirmDialog
        open={Boolean(cancelRow)}
        title="Cancel this purchase order?"
        description={cancelRow ? `${cancelRow.number} will be marked cancelled. Receipts already posted stay.` : "Cancel this PO."}
        confirmLabel="Cancel PO"
        loading={cancelPo.isPending}
        onClose={() => setCancelRow(null)}
        onConfirm={() => cancelRow && cancelPo.mutate(cancelRow.id)}
      />
    </AppShell>
  );
}
