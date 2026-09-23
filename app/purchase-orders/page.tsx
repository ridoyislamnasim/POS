"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, fileUrl } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, Field, PageHeader, SummaryCards, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellNumeric, tableCellActions, IconActionButton } from "@/components/ui";
import { WaveInput } from "@/components/ui/wave-input";
import { toastCreated, toastError, toastSuccess } from "@/lib/toast";
import { moneyCell, moneyText, statusBadge, sumField } from "@/components/erp-page";
import { DocumentActions } from "@/components/documents/document-actions";
import { VariantPicker } from "@/components/purchase/variant-picker";
import { roundMoney } from "@/lib/money";
import { X } from "lucide-react";

type PO = {
  id: string;
  number: string;
  total: string;
  status: string;
  supplier: { name: string };
  branch: { name: string };
};

type POLine = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  variantLabel: string;
  qty: string;
  unit?: string;
  imageUrl?: string;
  stockLabel?: string;
};

export default function PurchaseOrdersPage() {
  const { me } = useMe();
  const suppliers = useQuery({ queryKey: ["suppliers-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers?limit=100") });
  const list = useServerList<PO>("purchase-orders", "/api/v1/purchases/orders");
  const [open, setOpen] = useState(false);
  const [cancelRow, setCancelRow] = useState<PO | null>(null);
  const [form, setForm] = useState({ branchId: "", supplierId: "", notes: "", expectedAt: "" });
  const [lines, setLines] = useState<POLine[]>([]);
  const [q, setQ] = useState("");

  const branches = me?.branches ?? [];
  const locationId = branches.find((b) => b.id === form.branchId)?.locationId ?? "";

  const summary = useMemo(() => {
    let totalQty = 0;
    for (const l of lines) totalQty += Number(l.qty) || 0;
    return { totalQty: roundMoney(totalQty), lineCount: lines.length, productCount: new Set(lines.map((l) => l.productId)).size };
  }, [lines]);

  function handlePick(variant: { id: string; sku: string; price: string; imageUrl?: string | null; unitId?: string | null; attributes: { option: { value: string; label: string; definition: { key: string; name: string } } }[]; barcodes: { code: string }[]; stock: { quantity: string }[] }, product: { id: string; name: string; code: string; images?: { url: string }[] }) {
    const variantLabel = variant.attributes.map((a) => a.option.label).join(" / ") || variant.sku;
    const barcode = variant.barcodes[0]?.code ?? "";
    const sku = variant.sku;
    const existing = lines.find((l) => l.variantId === variant.id);
    if (existing) {
      setLines((prev) => prev.map((l) => (l.variantId === variant.id ? { ...l, qty: String(Number(l.qty) + 1) } : l)));
      return;
    }
    const stockQty = variant.stock[0]?.quantity ?? "";
    setLines((prev) => [
      ...prev,
      {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        sku,
        barcode,
        variantLabel,
        qty: "1",
        unit: variant.unitId ?? "",
        imageUrl: variant.imageUrl ?? (product.images?.[0]?.url as string | undefined),
        stockLabel: stockQty,
      },
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.variantId !== id));
  }

  function updateLine(id: string, patch: Partial<POLine>) {
    setLines((prev) => prev.map((l) => (l.variantId === id ? { ...l, ...patch } : l)));
  }

  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/purchases/orders", {
        method: "POST",
        body: JSON.stringify({
          branchId: form.branchId,
          supplierId: form.supplierId,
          notes: form.notes || undefined,
          expectedAt: form.expectedAt || undefined,
          items: lines.map((l) => ({ variantId: l.variantId, qty: Number(l.qty) })),
        }),
      }),
    onSuccess: () => {
      toastCreated("purchase order");
      setOpen(false);
      setLines([]);
      setForm({ branchId: "", supplierId: "", notes: "", expectedAt: "" });
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
    if (!lines.length) {
      toastError(new Error("Add at least one variant"), "Validation");
      return;
    }
    if (lines.some((l) => Number(l.qty) <= 0)) {
      toastError(new Error("Qty >0 required"), "Validation");
      return;
    }
    create.mutate();
  }

  const filteredLines = q ? lines.filter((l) => l.productName.toLowerCase().includes(q.toLowerCase()) || l.sku.toLowerCase().includes(q.toLowerCase()) || l.barcode?.toLowerCase().includes(q.toLowerCase()) || l.variantLabel.toLowerCase().includes(q.toLowerCase())) : lines;

  return (
    <AppShell>
      <PageHeader title="Purchase Orders" description="Send orders to suppliers — stock NOT increased until received as Purchase.">
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
        description="Variant-aware PO — exact SKU/variant, no stock until received. Compact, POS-friendly."
        size="xl"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-po-form" disabled={create.isPending || !lines.length}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create PO · {summary.totalQty} pcs · {summary.lineCount} variants
            </Button>
          </>
        }
      >
        <form id="create-po-form" className="space-y-3" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-3">
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
            <Field label="Expected delivery">
              <input className={inputClass} type="date" value={form.expectedAt} onChange={(e) => setForm((s) => ({ ...s, expectedAt: e.target.value }))} />
            </Field>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b bg-muted/20 p-2">
              <div className="text-xs font-semibold">Add Product → Exact Variant → Required Qty</div>
              <div className="text-[11px] text-muted-foreground">Search product / SKU / barcode — exact variant required. Supplier requirement only, no pricing here.</div>
            </div>
            <div className="p-2">
              <VariantPicker locationId={locationId} onPick={handlePick} compact />
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="flex items-center gap-2 border-b bg-muted/20 px-2 py-1.5">
              <span className="text-xs font-semibold">Lines · {lines.length}</span>
              <span className="text-[11px] text-muted-foreground">{summary.productCount} products · {summary.totalQty} pcs · {summary.lineCount} variants</span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="relative hidden sm:block">
                  <Search className="pointer-events-none absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter lines SKU/variant" className={inputClass + " h-7 pl-6 text-xs w-[180px]"} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                </div>
              </div>
            </div>

            <div className="max-h-[38vh] overflow-auto p-2">
              {!filteredLines.length ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">No lines — pick variant from above. For T-Shirt: Black/M 20, Black/L 15 as separate cards.</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence initial={false}>
                    {filteredLines.map((l) => (
                      <motion.div key={l.variantId} layout initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="flex flex-col gap-2 rounded-lg border bg-card p-2.5 shadow-sm hover:shadow-md">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-primary">{l.variantLabel}</span>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono">{l.sku}</span>
                            <button type="button" onClick={() => removeLine(l.variantId)} aria-label="Remove variant" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                            {l.imageUrl ? <img src={fileUrl(l.imageUrl)} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">{l.sku.slice(0,4)}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{l.productName}</div>
                            <div className="truncate font-mono text-[11px] text-muted-foreground">{l.barcode ? `${l.barcode} · ` : ""}{l.sku}</div>
                            <div className="text-[11px] text-muted-foreground">{l.unit ? l.unit : "pcs"} {l.stockLabel ? `· stock ${l.stockLabel}` : ""}</div>
                          </div>
                        </div>
                        <WaveInput label="Required Qty *" value={l.qty} onChange={(val) => updateLine(l.variantId, { qty: val })} type="number" min="0" inputMode="numeric" />
                        <WaveInput label="SKU" value={l.sku} onChange={() => {}} readOnly hideZero={false} />
                        <WaveInput label="Barcode" value={l.barcode ?? ""} onChange={() => {}} readOnly hideZero={false} />
                        <WaveInput label="Unit" value={l.unit || "pcs"} onChange={() => {}} readOnly hideZero={false} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {lines.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-gradient-to-r from-orange-50/50 to-amber-50/30 px-2 py-1.5 text-xs dark:from-orange-950/10">
                <span className="tabular-nums">{summary.productCount} products · {summary.lineCount} variants · {summary.totalQty} pcs required</span>
                <span className="text-[11px] text-muted-foreground">Price-free requirement — stock untouched</span>
              </div>
            ) : null}
          </div>

          <Field label="Notes">
            <input className={inputClass} placeholder="PO notes / delivery reference" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </Field>
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
