"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Search, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, fileUrl } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Button, Field, inputClass } from "@/components/ui";
import { WaveInput } from "@/components/ui/wave-input";
import { toastCreated, toastError } from "@/lib/toast";
import { VariantPicker } from "@/components/purchase/variant-picker";
import { moneyLabel, roundMoney } from "@/lib/money";

type ReceiveLine = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  variantLabel: string;
  qty: string;
  unitCost: string;
  discount: string;
  taxRate: string;
  retailPrice: string;
  wholesalePrice: string;
  imageUrl?: string;
  orderedQty?: string;
  previouslyReceived?: string;
  remainingQty?: string;
  poUnitCost?: string;
  isFromPO?: boolean;
  originalRetailPrice?: string;
  originalWholesalePrice?: string;
  stockQty?: string;
};

type PODetail = {
  id: string;
  number: string;
  status: string;
  supplierId: string;
  supplier: { id: string; name: string };
  branch: { name: string; locationId?: string };
  items: {
    id: string;
    variantId: string;
    qty: string;
    receivedQty: string;
    unitCost: string;
    variant: {
      id: string;
      sku: string;
      price: string;
      cost?: string | null;
      retailPrice?: string | null;
      wholesalePrice?: string | null;
      imageUrl?: string | null;
      product: { id: string; name: string; code: string };
      attributes: { option: { label: string; definition: { name: string } } }[];
      barcodes: { code: string }[];
      stock?: { quantity: string }[];
    };
  }[];
};

export default function ReceivePurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPO = searchParams.get("poId") ?? "";
  const { me } = useMe();
  const suppliers = useQuery({ queryKey: ["suppliers-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers?limit=100") });
  const branches = me?.branches ?? [];

  const [branchId, setBranchId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState(initialPO);
  const [paid, setPaid] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [poSearch, setPoSearch] = useState("");

  const defaultLocation = branches.find((b) => b.id === branchId)?.locationId ?? "";

  const poOptions = useQuery({
    queryKey: ["po-lookup", poSearch],
    queryFn: () => api<{ id: string; number: string; status: string; supplier: { name: string }; supplierId: string }[]>(`/api/v1/purchases/orders?limit=100&search=${encodeURIComponent(poSearch)}`),
  });

  const poDetail = useQuery({
    queryKey: ["po-detail", purchaseOrderId],
    queryFn: () => api<PODetail>(`/api/v1/purchases/orders/${purchaseOrderId}`),
    enabled: Boolean(purchaseOrderId),
  });

  useEffect(() => {
    if (purchaseOrderId) handleSelectPO(purchaseOrderId);
  }, [purchaseOrderId]);

  const handleSelectPO = async (id: string) => {
    setPurchaseOrderId(id);
    if (!id) {
      setLines([]);
      return;
    }
    try {
      const po = await api<PODetail>(`/api/v1/purchases/orders/${id}`);
      if (po.supplierId) setSupplierId(po.supplierId);
      const b = branches.find((x) => x.name === po.branch.name);
      if (b) {
        setBranchId(b.id);
        setLocationId(b.locationId ?? "");
      }
      const newLines: ReceiveLine[] = po.items.map((it) => {
        const ordered = Number(it.qty) || 0;
        const received = Number(it.receivedQty) || 0;
        const remaining = Math.max(ordered - received, 0);
        const variantLabel = it.variant.attributes.map((a) => a.option.label).join(" / ") || it.variant.sku;
        const barcode = it.variant.barcodes[0]?.code ?? "";
        const retail = it.variant.retailPrice ?? it.variant.price ?? "";
        const wholesale = it.variant.wholesalePrice ?? "";
        const stockQty = (it.variant as unknown as { stock?: { quantity: string }[] }).stock?.[0]?.quantity ?? "";
        return {
          variantId: it.variantId,
          productId: it.variant.product?.id ?? it.variantId,
          productName: it.variant.product?.name ?? "Product",
          sku: it.variant.sku,
          barcode,
          variantLabel,
          qty: String(remaining),
          unitCost: String(it.unitCost ?? "0"),
          discount: "0",
          taxRate: "0",
          retailPrice: String(retail ?? ""),
          wholesalePrice: String(wholesale ?? ""),
          imageUrl: it.variant.imageUrl ?? undefined,
          orderedQty: String(ordered),
          previouslyReceived: String(received),
          remainingQty: String(remaining),
          poUnitCost: String(it.unitCost ?? "0"),
          isFromPO: true,
          originalRetailPrice: String(retail ?? ""),
          originalWholesalePrice: String(wholesale ?? ""),
          stockQty,
        };
      }).filter((l) => Number(l.remainingQty) > 0);
      setLines(newLines);
    } catch (e) {
      toastError(e as Error, "Could not load PO");
    }
  };

  function handlePick(variant: { id: string; sku: string; price: string; cost?: string | null; retailPrice?: string | null; wholesalePrice?: string | null; discount?: string | null; imageUrl?: string | null; attributes: { option: { label: string; definition: { name: string } } }[]; barcodes: { code: string }[]; stock: { quantity: string }[] }, product: { id: string; name: string }) {
    const variantLabel = variant.attributes.map((a) => a.option.label).join(" / ") || variant.sku;
    const barcode = variant.barcodes[0]?.code ?? "";
    const stockQty = variant.stock?.[0]?.quantity ?? "";
    const retailDef = String(variant.retailPrice ?? variant.price ?? "");
    const wholesaleDef = String(variant.wholesalePrice ?? "");
    if (lines.some((l) => l.variantId === variant.id)) {
      setLines((prev) => prev.map((l) => (l.variantId === variant.id ? { ...l, qty: String(Number(l.qty) + 1) } : l)));
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        sku: variant.sku,
        barcode,
        variantLabel,
        qty: "1",
        unitCost: String(variant.cost ?? variant.price ?? "0"),
        discount: String(variant.discount ?? "0"),
        taxRate: "0",
        retailPrice: retailDef,
        wholesalePrice: wholesaleDef,
        imageUrl: variant.imageUrl ?? undefined,
        isFromPO: false,
        originalRetailPrice: retailDef,
        originalWholesalePrice: wholesaleDef,
        stockQty,
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<ReceiveLine>) {
    setLines((prev) => prev.map((l) => (l.variantId === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.variantId !== id));
  }

  const summary = useMemo(() => {
    let totalQty = 0;
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    for (const l of lines) {
      const qty = Number(l.qty) || 0;
      const cost = Number(l.unitCost) || 0;
      const disc = Number(l.discount) || 0;
      const taxRate = Number(l.taxRate) || 0;
      const line = qty * cost;
      const discLine = Math.min(disc, line);
      const taxable = line - discLine;
      const lineTax = taxable * (taxRate / 100);
      totalQty += qty;
      subtotal += line;
      discount += discLine;
      tax += lineTax;
    }
    const total = subtotal - discount + tax;
    const paidNum = Number(paid) || 0;
    const due = Math.max(total - paidNum, 0);
    return {
      totalQty: roundMoney(totalQty),
      lineCount: lines.length,
      productCount: new Set(lines.map((l) => l.productId)).size,
      subtotal: roundMoney(subtotal),
      discount: roundMoney(discount),
      tax: roundMoney(tax),
      total: roundMoney(total),
      due: roundMoney(due),
    };
  }, [lines, paid]);

  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/purchases", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          locationId: locationId || undefined,
          supplierId,
          purchaseOrderId: purchaseOrderId || undefined,
          paid,
          notes: notes || undefined,
          items: lines.map((l) => ({
            variantId: l.variantId,
            qty: Number(l.qty),
            unitCost: Number(l.unitCost),
            discount: Number(l.discount) || 0,
            taxRate: Number(l.taxRate) || 0,
            retailPrice: l.retailPrice ? Number(l.retailPrice) : undefined,
            wholesalePrice: l.wholesalePrice ? Number(l.wholesalePrice) : undefined,
          })),
        }),
      }),
    onSuccess: () => {
      toastCreated("purchase", "Stock was increased");
      router.push("/purchases");
    },
    onError: (e) => toastError(e, "Could not receive purchase"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!branchId || !supplierId) {
      toastError(new Error("Branch and supplier required"), "Validation");
      return;
    }
    if (!lines.length) {
      toastError(new Error("Add at least one variant"), "Validation");
      return;
    }
    for (const l of lines) {
      if (Number(l.qty) <= 0) {
        toastError(new Error(`Qty >0 required for ${l.sku}`), "Validation");
        return;
      }
      if (l.isFromPO && l.remainingQty && Number(l.qty) > Number(l.remainingQty)) {
        toastError(new Error(`Over-receiving ${l.sku}: remaining ${l.remainingQty}, tried ${l.qty}`), "Validation");
        return;
      }
    }
    create.mutate();
  }

  return (
    <AppShell>
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/purchases")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-lg font-semibold">Receive Purchase</h1>
        <span className="text-xs text-muted-foreground">{summary.productCount} products · {summary.totalQty} pcs</span>
      </div>

      <form id="receive-purchase-form" className="space-y-3" onSubmit={onSubmit}>
        <div className="rounded-lg border bg-card p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Branch *">
              <select className={inputClass} required value={branchId} onChange={(e) => { setBranchId(e.target.value); const b = branches.find((x) => x.id === e.target.value); if (b) setLocationId(b.locationId ?? ""); }}>
                <option value="">Select branch</option>
                {(me?.branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <select className={inputClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Default ({branches.find((b) => b.id === branchId)?.locationId?.slice(0,8) ?? "auto"})</option>
                {branches.map((b) => (
                  <option key={b.locationId} value={b.locationId}>{b.name} · {b.locationId.slice(0,8)}</option>
                ))}
              </select>
            </Field>
            <Field label="Supplier *">
              <select className={inputClass} required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select supplier</option>
                {(suppliers.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-3 rounded-lg border bg-muted/20 p-2">
            <Field label="Purchase Order (optional) — prefill remaining">
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input value={poSearch} onChange={(e) => setPoSearch(e.target.value)} placeholder="Search PO number" className={inputClass + " h-8 pl-7 text-xs"} />
                  {poOptions.data?.length ? (
                    <div className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-md border bg-popover shadow">
                      {poOptions.data.slice(0, 8).map((po) => (
                        <button key={po.id} type="button" onClick={() => handleSelectPO(po.id)} className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs hover:bg-muted">
                          <span className="font-medium">{po.number}</span>
                          <span className="text-muted-foreground">{po.supplier?.name} · {po.status}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <select className={inputClass + " h-8 text-xs max-w-[180px]"} value={purchaseOrderId} onChange={(e) => handleSelectPO(e.target.value)}>
                  <option value="">No PO (standalone)</option>
                  {(poOptions.data ?? []).slice(0, 20).map((po) => (
                    <option key={po.id} value={po.id}>{po.number} · {po.status}</option>
                  ))}
                </select>
                {purchaseOrderId ? <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleSelectPO("")}>Clear</Button> : null}
              </div>
              {poDetail.data ? <div className="mt-1 text-[11px] text-muted-foreground">PO {poDetail.data.number} · {poDetail.data.status} · {poDetail.data.items.length} variants · Supplier {poDetail.data.supplier?.name}</div> : null}
            </Field>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/20 px-2 py-1.5">
              <span className="text-xs font-semibold">Add variants — exact SKU, never parent product</span>
              <span className="text-[11px] text-muted-foreground">{lines.length} lines</span>
            </div>
            <div className="p-2">
              <VariantPicker locationId={locationId || branches.find((b) => b.id === branchId)?.locationId} onPick={handlePick} compact />
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/20 px-2 py-1.5">
              <span className="text-xs font-semibold">Summary</span>
              <span className="text-[11px] tabular-nums">{summary.totalQty} pcs · {moneyLabel(summary.total)}</span>
            </div>
            <div className="p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Products</span><span className="tabular-nums">{summary.productCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Variants</span><span className="tabular-nums">{summary.lineCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{moneyLabel(summary.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="tabular-nums text-amber-600">{moneyLabel(summary.discount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{moneyLabel(summary.tax)}</span></div>
              <div className="flex justify-between border-t pt-2 font-semibold"><span>Grand Total</span><span className="tabular-nums">{moneyLabel(summary.total)}</span></div>
              <div className="grid gap-2 pt-2">
                <Field label="Paid now">
                  <input className={inputClass} type="number" min="0" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                </Field>
                <Field label="Due (auto)">
                  <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm tabular-nums">{moneyLabel(summary.due)}</div>
                </Field>
                <Field label="Notes">
                  <input className={inputClass} placeholder="Chalan / invoice ref" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/purchases")}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={create.isPending}>{create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Receive · {moneyLabel(summary.total)}</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="flex items-center gap-2 border-b bg-muted/20 px-2 py-1.5">
            <span className="text-xs font-semibold">Lines · {lines.length}</span>
            <span className="text-[11px] text-muted-foreground">{summary.productCount} products · {summary.totalQty} pcs · {moneyLabel(summary.total)}</span>
          </div>
          <div className="max-h-[50vh] overflow-auto">
            {!lines.length ? (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">No variants yet — pick from picker above or select PO to prefill remaining.</div>
            ) : (
              <div className="divide-y">
                <AnimatePresence initial={false}>
                  {lines.map((l) => {
                    const qty = Number(l.qty) || 0;
                    const cost = Number(l.unitCost) || 0;
                    const disc = Number(l.discount) || 0;
                    const taxRate = Number(l.taxRate) || 0;
                    const line = qty * cost;
                    const discLine = Math.min(disc, line);
                    const taxable = line - discLine;
                    const tax = taxable * (taxRate / 100);
                    const lineTotal = taxable + tax;
                    const isOver = l.remainingQty ? qty > Number(l.remainingQty) : false;
                    return (
                      <motion.div key={l.variantId} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`p-2.5 ${isOver ? "bg-destructive/[0.04]" : "hover:bg-muted/20"} transition-colors`}>
                        <div className="flex gap-2.5">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted/20">
                            {l.imageUrl ? <img src={fileUrl(l.imageUrl)} alt={l.variantLabel} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[10px] font-mono text-muted-foreground">{l.sku.slice(0,4)}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{l.productName}</div>
                            <div className="truncate text-xs font-medium text-primary">{l.variantLabel}</div>
                            <div className="flex flex-wrap items-center gap-1 pt-0.5 font-mono text-[11px] text-muted-foreground">
                              <span className="rounded bg-muted px-1.5 py-0.5">{l.sku}</span>
                              {l.barcode ? <span className="rounded border bg-card px-1.5 py-0.5">{l.barcode}</span> : null}
                              {l.stockQty ? <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">Stock {l.stockQty}</span> : null}
                            </div>
                            {l.isFromPO ? (
                              <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                                <span className="rounded border bg-white px-1.5 py-0.5">Ordered <b>{l.orderedQty}</b></span>
                                <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">Prev {l.previouslyReceived}</span>
                                <span className={`rounded border px-1.5 py-0.5 font-semibold ${isOver ? "border-destructive bg-destructive text-white" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>Rem {l.remainingQty}</span>
                                <span className="rounded bg-muted px-1.5 py-0.5">PO {moneyLabel(Number(l.poUnitCost))}</span>
                              </div>
                            ) : null}
                          </div>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => removeLine(l.variantId)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="mt-2 grid gap-1.5 sm:grid-cols-3 lg:grid-cols-7">
                          <WaveInput label="Received Qty *" value={l.qty} onChange={(val) => updateLine(l.variantId, { qty: val })} type="number" min="0" />
                          <WaveInput label="Unit Cost *" value={l.unitCost} onChange={(val) => updateLine(l.variantId, { unitCost: val })} type="number" min="0" />
                          <WaveInput label="Discount" value={l.discount} onChange={(val) => updateLine(l.variantId, { discount: val })} type="number" min="0" />
                          <WaveInput label="Retail Price" value={l.retailPrice} onChange={(val) => updateLine(l.variantId, { retailPrice: val })} type="number" min="0" />
                          <WaveInput label="Wholesale Price" value={l.wholesalePrice} onChange={(val) => updateLine(l.variantId, { wholesalePrice: val })} type="number" min="0" />
                          <WaveInput label="Tax %" value={l.taxRate} onChange={(val) => updateLine(l.variantId, { taxRate: val })} type="number" min="0" />
                          <div className="flex h-8 items-center justify-between rounded-md border bg-gradient-to-r from-slate-50 to-white px-2 text-xs font-semibold tabular-nums dark:from-slate-900/30">
                            <span>{moneyLabel(lineTotal)}</span>
                            {l.retailPrice !== l.originalRetailPrice || l.wholesalePrice !== l.originalWholesalePrice ? <span className="rounded bg-amber-500 px-1 py-0 text-[10px] text-white">edited</span> : <span className="rounded bg-muted px-1 py-0 text-[10px]">inherited</span>}
                          </div>
                        </div>
                        {isOver ? <div className="mt-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">Over-receiving: remaining {l.remainingQty}, tried {l.qty}.</div> : null}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </form>
    </AppShell>
  );
}


