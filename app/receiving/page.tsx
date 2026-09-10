"use client";

import { FormEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { useVariantOptions } from "@/lib/lookups";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, Dialog, Field, FilterSelect, PageHeader, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellNumeric } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastCreated, toastError, toastSuccess } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";
import { newIdempotencyKey, RECEIPT_KINDS } from "@/lib/stock-workflow";
import { useHelpCreateAction } from "@/lib/help";

type Receipt = {
  id: string;
  number: string;
  kind: string;
  status: string;
  totalQty: string;
  totalCost: string;
  createdAt: string;
  supplier?: { name: string } | null;
  branch: { name: string };
  saleReturnId?: string | null;
  purchaseId?: string | null;
  sourceRef?: string | null;
};

export default function ReceivingPage() {
  const { me, can } = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  useHelpCreateAction(() => setOpen(true), can("inventory.receive.create") || can("purchase.manage"));
  const [pending, setPending] = useState<{ id: string; action: "receive" | "cancel" } | null>(null);
  const [extraLines, setExtraLines] = useState<{ variantId: string; qty: string; unitCost: string; batchLot: string; expiryDate: string }[]>([]);
  const keyRef = useRef(newIdempotencyKey());
  const locs = useQuery({ queryKey: ["inv-locs"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/inventory/locations") });
  const suppliers = useQuery({ queryKey: ["suppliers-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers?limit=100") });
  const variantsQ = useVariantOptions();
  const variants = variantsQ.data ?? [];
  const list = useServerList<Receipt>("receipts", "/api/v1/inventory/receipts", {
    extraKeys: ["kind"],
    extraLabels: { kind: "Type" },
  });
  const summary = useQuery({
    queryKey: ["receipts-summary"],
    queryFn: () => api<{ receivedQty: number; receivedValue: string; count: number }>("/api/v1/inventory/receipts/summary"),
  });
  const [form, setForm] = useState({
    branchId: "",
    locationId: "",
    kind: "PURCHASE",
    supplierId: "",
    fromLocationId: "",
    variantId: "",
    qty: "1",
    unitCost: "0",
    batchLot: "",
    expiryDate: "",
    notes: "",
    post: true,
  });
  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/inventory/receipts", {
        method: "POST",
        idempotencyKey: keyRef.current,
        body: JSON.stringify({
          branchId: form.branchId,
          locationId: form.locationId || undefined,
          kind: form.kind,
          supplierId: form.supplierId || undefined,
          fromLocationId: form.fromLocationId || undefined,
          notes: form.notes,
          post: form.post,
          items: [
            { variantId: form.variantId, qty: Number(form.qty), unitCost: Number(form.unitCost), batchLot: form.batchLot || undefined, expiryDate: form.expiryDate || undefined },
            ...extraLines
              .filter((l) => l.variantId && Number(l.qty) > 0)
              .map((l) => ({ variantId: l.variantId, qty: Number(l.qty), unitCost: Number(l.unitCost), batchLot: l.batchLot || undefined, expiryDate: l.expiryDate || undefined })),
          ],
        }),
      }),
    onSuccess: () => {
      toastCreated("receiving document");
      keyRef.current = newIdempotencyKey();
      setExtraLines([]);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toastError(e, "Could not save receiving"),
  });
  const receive = useMutation({
    mutationFn: (id: string) => api(`/api/v1/inventory/receipts/${id}/receive`, { method: "POST", idempotencyKey: newIdempotencyKey() }),
    onSuccess: () => {
      toastSuccess("Stock received");
      setPending(null);
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toastError(e, "Receive failed"),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api(`/api/v1/inventory/receipts/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason: "Cancelled from UI" }) }),
    onSuccess: () => {
      toastSuccess("Receiving cancelled");
      setPending(null);
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toastError(e, "Cancel failed"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
        <PageHeader title="Stock receiving" description="Draft documents do not change stock. Only a posted RECEIVED document increases inventory.">
          {can("inventory.receive.create") || can("purchase.manage") ? (
            <Button type="button" data-help="recv-new" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New receiving</Button>
          ) : null}
        </PageHeader>
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border bg-card px-3 py-2"><div className="text-[11px] uppercase text-muted-foreground">Documents</div><div className="font-semibold">{summary.data?.count ?? "—"}</div></div>
          <div className="rounded-md border bg-card px-3 py-2"><div className="text-[11px] uppercase text-muted-foreground">Qty received</div><div className="font-semibold tabular-nums">{summary.data?.receivedQty ?? "—"}</div></div>
          <div className="rounded-md border bg-card px-3 py-2"><div className="text-[11px] uppercase text-muted-foreground">Value</div><div className="font-semibold tabular-nums">{summary.data?.receivedValue ?? "—"}</div></div>
        </div>
        <ListFrame
          list={list}
          searchPlaceholder="Search receiving number"
          dateFilter
          statusOptions={[
            { value: "DRAFT", label: "Draft" },
            { value: "RECEIVED", label: "Received" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
          extraFilters={
            <FilterSelect
              value={String(list.extras.kind ?? "")}
              onChange={(v) => list.setFilter("kind", v)}
              placeholder="Type"
              options={RECEIPT_KINDS.map((k) => ({ value: k.value, label: k.label }))}
            />
          }
          columnCount={7}
          emptyTitle="No records found"
          emptyHint="Create a draft, then post it to increase stock."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className={tableCellNumeric}>Qty</TableHead>
                <TableHead className={tableCellNumeric}>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium"><Link className="hover:underline" href={`/receiving/${r.id}`}>{r.number}</Link></TableCell>
                  <TableCell>{r.kind}</TableCell>
                  <TableCell>{r.supplier?.name ?? r.branch?.name}</TableCell>
                  <TableCell className={tableCellNumeric}>{Number(r.totalQty)}</TableCell>
                  <TableCell className={tableCellNumeric}>{moneyCell(r.totalCost)}</TableCell>
                  <TableCell><StatusBadge value={r.status} /></TableCell>
                  <TableCell className="space-x-2">
                    {r.status === "DRAFT" && (can("inventory.receive.approve") || can("purchase.manage")) ? (
                      <Button size="sm" onClick={() => setPending({ id: r.id, action: "receive" })}>Receive</Button>
                    ) : null}
                    {r.status !== "CANCELLED" && !r.saleReturnId && !(r.purchaseId && r.sourceRef === r.purchaseId) && (can("inventory.receive.approve") || can("purchase.manage")) ? (
                      <Button size="sm" variant="outline" onClick={() => setPending({ id: r.id, action: "cancel" })}>Cancel</Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListFrame>
        <Dialog
          open={open}
          title="New receiving"
          description="Save as draft or post immediately. Posting is the only action that increases stock."
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" form="rcv-form" disabled={create.isPending}>{form.post ? "Receive now" : "Save draft"}</Button>
            </>
          }
        >
          <form id="rcv-form" className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <Field label="Branch *">
              <select className={inputClass} required value={form.branchId} onChange={(e) => setForm((s) => ({ ...s, branchId: e.target.value }))}>
                <option value="">Select</option>
                {(me?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <select className={inputClass} value={form.locationId} onChange={(e) => setForm((s) => ({ ...s, locationId: e.target.value }))}>
                <option value="">Branch default</option>
                {(locs.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Type *">
              <select className={inputClass} value={form.kind} onChange={(e) => setForm((s) => ({ ...s, kind: e.target.value }))}>
                {RECEIPT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </Field>
            <Field label="Supplier">
              <select className={inputClass} value={form.supplierId} onChange={(e) => setForm((s) => ({ ...s, supplierId: e.target.value }))}>
                <option value="">None</option>
                {(suppliers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            {form.kind === "TRANSFER" ? (
              <Field label="From location *">
                <select className={inputClass} required value={form.fromLocationId} onChange={(e) => setForm((s) => ({ ...s, fromLocationId: e.target.value }))}>
                  <option value="">Select source</option>
                  {(locs.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="SKU *">
              <select className={inputClass} required value={form.variantId} onChange={(e) => setForm((s) => ({ ...s, variantId: e.target.value }))}>
                <option value="">Select</option>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}
              </select>
            </Field>
            <Field label="Qty *"><input className={inputClass} type="number" min="0.0001" step="any" required value={form.qty} onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))} /></Field>
            <Field label="Unit cost *"><input className={inputClass} type="number" step="any" required value={form.unitCost} onChange={(e) => setForm((s) => ({ ...s, unitCost: e.target.value }))} /></Field>
            <Field label="Batch / lot"><input className={inputClass} value={form.batchLot} onChange={(e) => setForm((s) => ({ ...s, batchLot: e.target.value }))} /></Field>
            <Field label="Expiry"><input className={inputClass} type="date" value={form.expiryDate} onChange={(e) => setForm((s) => ({ ...s, expiryDate: e.target.value }))} /></Field>
            <Field label="Notes"><input className={inputClass} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} /></Field>
            <div className="sm:col-span-2 space-y-2">
              {extraLines.map((line, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-4">
                  <select className={inputClass} value={line.variantId} onChange={(e) => setExtraLines((rows) => rows.map((r, i) => i === idx ? { ...r, variantId: e.target.value } : r))}>
                    <option value="">SKU</option>
                    {variants.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}
                  </select>
                  <input className={inputClass} type="number" min="0.0001" step="any" value={line.qty} onChange={(e) => setExtraLines((rows) => rows.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))} />
                  <input className={inputClass} type="number" step="any" value={line.unitCost} onChange={(e) => setExtraLines((rows) => rows.map((r, i) => i === idx ? { ...r, unitCost: e.target.value } : r))} />
                  <Button type="button" variant="outline" onClick={() => setExtraLines((rows) => rows.filter((_, i) => i !== idx))}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setExtraLines((rows) => [...rows, { variantId: "", qty: "1", unitCost: "0", batchLot: "", expiryDate: "" }])}>Add another SKU</Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.post} onChange={(e) => setForm((s) => ({ ...s, post: e.target.checked }))} />
              Post immediately (increase stock)
            </label>
          </form>
        </Dialog>
        <ConfirmDialog
          open={Boolean(pending)}
          title={pending?.action === "cancel" ? "Cancel this receiving?" : "Post receiving?"}
          description={pending?.action === "cancel" ? "If it was already received, stock will be reversed." : "This increases available stock once."}
          confirmLabel={pending?.action === "cancel" ? "Cancel document" : "Receive"}
          variant={pending?.action === "cancel" ? "danger" : "warning"}
          loading={receive.isPending || cancel.isPending}
          onClose={() => setPending(null)}
          onConfirm={() => {
            if (!pending) return;
            if (pending.action === "receive") receive.mutate(pending.id);
            else cancel.mutate(pending.id);
          }}
        />
      </motion.div>
    </AppShell>
  );
}
