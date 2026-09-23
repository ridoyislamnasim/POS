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
import { ListFrame } from "@/components/ui/list-frame";
import { Button, Field, PageHeader, SummaryCards, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellNumeric } from "@/components/ui";
import { toastCreated, toastError } from "@/lib/toast";
import { moneyCell, moneyText, statusBadge, sumField } from "@/components/erp-page";
import { DocumentActions } from "@/components/documents/document-actions";
import { SendSmsButton } from "@/components/sms/send-sms-dialog";
import { VariantPicker } from "@/components/purchase/variant-picker";
import { moneyLabel, roundMoney } from "@/lib/money";
import { useHelpCreateAction } from "@/lib/help";

type Purchase = {
  id: string;
  invoiceNumber: string;
  total: string;
  paid: string;
  due: string;
  status: string;
  supplier: { id: string; name: string; phone?: string };
  branch: { name: string };
  items: { id: string; variantId: string; qty: string; unitCost: string }[];
};

type PurchaseReturn = { id: string; number: string; reason: string; total: string; purchase?: { invoiceNumber: string; supplier?: { id: string; name: string; phone?: string } } };

type POLineOpt = {
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
  };
  productName?: string;
};

type PODetail = {
  id: string;
  number: string;
  status: string;
  supplierId: string;
  supplier: { id: string; name: string };
  branch: { name: string; locationId?: string };
  items: POLineOpt[];
  purchases: { items: { variantId: string; qty: string }[] }[];
};

type ReceiveLine = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  variantLabel: string;
  qty: string; // receive now
  unitCost: string;
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

export default function PurchasesPage() {
  const { me } = useMe();
  const suppliers = useQuery({ queryKey: ["suppliers-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers?limit=100") });
  const list = useServerList<Purchase>("purchases", "/api/v1/purchases");
  const returns = useServerList<PurchaseReturn>("purchase-returns", "/api/v1/purchases/returns", { namespace: "prn" });
  const [open, setOpen] = useState(false);
  useHelpCreateAction(() => setOpen(true));
  const [ret, setRet] = useState<Purchase | null>(null);
  const [retQty, setRetQty] = useState("1");
  const [retItem, setRetItem] = useState("");
  const [retReason, setRetReason] = useState("Damaged goods");

  // receive form
  const [branchId, setBranchId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [paid, setPaid] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [poSearch, setPoSearch] = useState("");

  const branches = me?.branches ?? [];
  const defaultLocation = branches.find((b) => b.id === branchId)?.locationId ?? "";

  const poOptions = useQuery({
    queryKey: ["po-lookup", poSearch],
    queryFn: () => api<{ id: string; number: string; status: string; supplier: { name: string }; supplierId: string }[]>(`/api/v1/purchases/orders?limit=100&search=${encodeURIComponent(poSearch)}`),
    enabled: open,
  });

  const poDetail = useQuery({
    queryKey: ["po-detail", purchaseOrderId],
    queryFn: () => api<PODetail>(`/api/v1/purchases/orders/${purchaseOrderId}`),
    enabled: Boolean(purchaseOrderId),
  });

  // prefill from PO when selected
  const handleSelectPO = async (id: string) => {
    setPurchaseOrderId(id);
    if (!id) {
      setLines([]);
      return;
    }
    try {
      const po = await api<PODetail>(`/api/v1/purchases/orders/${id}`);
      if (po.supplierId) setSupplierId(po.supplierId);
      if (po.branch) {
        // find branch id by name? fallback to first
        const b = branches.find((x) => x.name === po.branch.name);
        if (b) {
          setBranchId(b.id);
          setLocationId(b.locationId ?? "");
        }
      }
      // build lines: ordered - previouslyReceived = remaining
      const newLines: ReceiveLine[] = po.items.map((it) => {
        const ordered = Number(it.qty) || 0;
        const received = Number(it.receivedQty) || 0;
        const remaining = Math.max(ordered - received, 0);
        const variantLabel = it.variant.attributes.map((a) => a.option.label).join(" / ") || it.variant.sku;
        const barcode = it.variant.barcodes[0]?.code ?? "";
        const productName = it.variant.product?.name ?? it.productName ?? "Product";
        const retail = it.variant.retailPrice ?? it.variant.price ?? "";
        const wholesale = it.variant.wholesalePrice ?? "";
        const stockQty = (it.variant as unknown as { stock?: { quantity: string }[] }).stock?.[0]?.quantity ?? "";
        return {
          variantId: it.variantId,
          productId: it.variant.product?.id ?? it.variantId,
          productName,
          sku: it.variant.sku,
          barcode,
          variantLabel,
          qty: String(remaining),
          unitCost: String(it.unitCost ?? "0"),
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

  function handlePick(variant: { id: string; sku: string; price: string; cost?: string | null; retailPrice?: string | null; wholesalePrice?: string | null; imageUrl?: string | null; attributes: { option: { label: string; definition: { name: string } } }[]; barcodes: { code: string }[]; stock: { quantity: string }[] }, product: { id: string; name: string }) {
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
        taxRate: "0",
        retailPrice: retailDef,
        wholesalePrice: wholesaleDef,
        imageUrl: variant.imageUrl ?? undefined,
        orderedQty: undefined,
        previouslyReceived: "0",
        remainingQty: undefined,
        poUnitCost: undefined,
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
    let tax = 0;
    for (const l of lines) {
      const qty = Number(l.qty) || 0;
      const cost = Number(l.unitCost) || 0;
      const taxRate = Number(l.taxRate) || 0;
      const line = qty * cost;
      const lineTax = line * (taxRate / 100);
      totalQty += qty;
      subtotal += line;
      tax += lineTax;
    }
    const total = subtotal + tax;
    const paidNum = Number(paid) || 0;
    const due = Math.max(total - paidNum, 0);
    return {
      totalQty: roundMoney(totalQty),
      lineCount: lines.length,
      productCount: new Set(lines.map((l) => l.productId)).size,
      subtotal: roundMoney(subtotal),
      tax: roundMoney(tax),
      total: roundMoney(total),
      paid: roundMoney(paidNum),
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
            taxRate: Number(l.taxRate) || 0,
            retailPrice: l.retailPrice ? Number(l.retailPrice) : undefined,
            wholesalePrice: l.wholesalePrice ? Number(l.wholesalePrice) : undefined,
          })),
        }),
      }),
    onSuccess: () => {
      toastCreated("purchase", "Stock was increased");
      setOpen(false);
      setLines([]);
      setBranchId("");
      setLocationId("");
      setSupplierId("");
      setPurchaseOrderId("");
      setPaid("0");
      setNotes("");
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not receive purchase"),
  });

  const purchaseReturn = useMutation({
    mutationFn: () =>
      api(`/api/v1/purchases/${ret?.id}/returns`, {
        method: "POST",
        body: JSON.stringify({
          reason: retReason,
          items: [{ purchaseItemId: retItem, qty: Number(retQty) }],
        }),
      }),
    onSuccess: () => {
      toastCreated("purchase return", "Stock was reduced");
      setRet(null);
      list.refetch();
      returns.refetch();
    },
    onError: (e) => toastError(e, "Purchase return failed"),
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
      if (Number(l.unitCost) < 0) {
        toastError(new Error(`Unit cost >=0 for ${l.sku}`), "Validation");
        return;
      }
      if (l.isFromPO && l.remainingQty && Number(l.qty) > Number(l.remainingQty)) {
        toastError(new Error(`Over-receiving ${l.sku}: remaining ${l.remainingQty}, tried ${l.qty}`), "Validation");
        return;
      }
      if (l.retailPrice && Number(l.retailPrice) < 0) {
        toastError(new Error(`Retail price >=0 for ${l.sku}`), "Validation");
        return;
      }
      if (l.wholesalePrice && Number(l.wholesalePrice) < 0) {
        toastError(new Error(`Wholesale price >=0 for ${l.sku}`), "Validation");
        return;
      }
    }
    const paidNum = Number(paid) || 0;
    if (paidNum < 0) {
      toastError(new Error("Paid cannot be negative"), "Validation");
      return;
    }
    if (paidNum > summary.total) {
      toastError(new Error("Paid cannot exceed total"), "Validation");
      return;
    }
    create.mutate();
  }

  const autoFillAll = () => {
    // fix: only fills correct field, never cross-fills; restores inherited where cleared
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        retailPrice: l.retailPrice && String(l.retailPrice).trim() !== "" ? l.retailPrice : l.originalRetailPrice ?? l.retailPrice,
        wholesalePrice: l.wholesalePrice && String(l.wholesalePrice).trim() !== "" ? l.wholesalePrice : l.originalWholesalePrice ?? l.wholesalePrice,
      })),
    );
  };

  return (
    <AppShell>
      <PageHeader title="Purchases" description="Goods received — stock is increased on save. Variant-aware, partial receiving supported.">
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Receive purchase
        </Button>
      </PageHeader>
      <SummaryCards
        items={[
          { label: "GRNs", value: list.pager.total, accent: "sky" },
          { label: "Total", value: moneyText(sumField(list.rows, "total")), accent: "orange", description: "This page" },
          { label: "Due", value: moneyText(sumField(list.rows, "due")), accent: "rose", description: "This page" },
          { label: "Returns", value: returns.pager.total, accent: "violet" },
        ]}
      />
      <ListFrame
        list={list}
        searchPlaceholder="Search GRN or supplier"
        dateFilter
        statusOptions={[
          { value: "DRAFT", label: "Draft" },
          { value: "ORDERED", label: "Ordered" },
          { value: "PARTIAL", label: "Partial" },
          { value: "RECEIVED", label: "Received" },
          { value: "CANCELLED", label: "Cancelled" },
        ]}
        columnCount={7}
        emptyTitle="No records found"
        emptyHint="Receive goods to add stock."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className={tableCellNumeric}>Total</TableHead>
              <TableHead className={tableCellNumeric}>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.invoiceNumber}</TableCell>
                <TableCell>{p.supplier?.name}</TableCell>
                <TableCell>{p.branch?.name}</TableCell>
                <TableCell className={tableCellNumeric}>{moneyCell(p.total)}</TableCell>
                <TableCell className={tableCellNumeric}>{moneyCell(p.due)}</TableCell>
                <TableCell>{statusBadge(p.status)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <DocumentActions type="purchase" id={p.id} number={p.invoiceNumber} />
                    <SendSmsButton
                      target={{
                        recipientType: "SUPPLIER",
                        recipientId: p.supplier?.id,
                        phone: p.supplier?.phone,
                        name: p.supplier?.name,
                        referenceType: "Purchase",
                        referenceId: p.id,
                        templateKey: "PURCHASE_RECEIVED",
                        vars: { invoiceNo: p.invoiceNumber, amount: p.total, dueAmount: p.due, paidAmount: p.paid },
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRet(p);
                        setRetItem(p.items?.[0]?.id ?? "");
                      }}
                    >
                      Return
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Purchase returns</h2>
        <ListFrame
          list={returns}
          searchPlaceholder="Search return number"
          dateFilter
          columnCount={5}
          emptyTitle="No purchase returns"
          emptyHint="Supplier returns appear here."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return</TableHead>
                <TableHead>GRN</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className={tableCellNumeric}>Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.number}</TableCell>
                  <TableCell>{r.purchase?.invoiceNumber ?? "—"}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell className={tableCellNumeric}>{moneyCell(r.total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <DocumentActions type="purchase-return" id={r.id} number={r.number} />
                      {r.purchase?.supplier ? (
                        <SendSmsButton
                          target={{
                            recipientType: "SUPPLIER",
                            recipientId: r.purchase.supplier.id,
                            phone: r.purchase.supplier.phone,
                            name: r.purchase.supplier.name,
                            referenceType: "PurchaseReturn",
                            referenceId: r.id,
                            templateKey: "PURCHASE_RETURN",
                            vars: { invoiceNo: r.purchase.invoiceNumber, orderNo: r.number, refundAmount: r.total },
                          }}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListFrame>
      </div>

      <Dialog
        open={open}
        title="Receive purchase"
        description="Stock, StockMovement (PURCHASE) and Receipt (PURCHASE/RECEIVED) are created on save. Use PO to prefill remaining, or receive standalone."
        size="xl"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="receive-purchase-form" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Receive · {moneyLabel(summary.total)} · {summary.totalQty} pcs
            </Button>
          </>
        }
      >
        <form id="receive-purchase-form" className="space-y-3" onSubmit={onSubmit}>
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
                <option value="">Default ({defaultLocation ? defaultLocation.slice(0,8) : "auto"})</option>
                {(me?.branches ?? []).map((b) => (
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

          <div className="rounded-lg border bg-muted/20 p-2">
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
                {purchaseOrderId ? (
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleSelectPO("")}>
                    Clear
                  </Button>
                ) : null}
              </div>
              {poDetail.data ? (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  PO {poDetail.data.number} · {poDetail.data.status} · {poDetail.data.items.length} variants · Supplier {poDetail.data.supplier?.name}
                </div>
              ) : null}
            </Field>
          </div>

          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b bg-muted/20 px-2 py-1.5">
              <span className="text-xs font-semibold">Add variants — exact SKU, never parent product</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={autoFillAll}>
                Auto Fill All
              </Button>
            </div>
            <div className="p-2">
              <VariantPicker locationId={locationId || defaultLocation} onPick={handlePick} compact />
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="flex items-center gap-2 border-b bg-muted/20 px-2 py-1.5">
              <span className="text-xs font-semibold">Lines · {lines.length}</span>
              <span className="text-[11px] text-muted-foreground">{summary.productCount} products · {summary.totalQty} pcs · {moneyLabel(summary.total)}</span>
            </div>
            <div className="max-h-[36vh] overflow-auto">
              {!lines.length ? (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">No lines — pick variant or select PO to prefill remaining. PO example: Black/M 20 → receive 18, Black/L 15 → 15.</div>
              ) : (
                <div className="divide-y">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => {
                      const qty = Number(l.qty) || 0;
                      const cost = Number(l.unitCost) || 0;
                      const taxRate = Number(l.taxRate) || 0;
                      const line = qty * cost;
                      const tax = line * (taxRate / 100);
                      const lineTotal = line + tax;
                      const isOver = l.remainingQty ? qty > Number(l.remainingQty) : false;
                      return (
                        <motion.div key={l.variantId} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`grid gap-1.5 p-2 ${isOver ? "bg-destructive/5" : ""} sm:grid-cols-[auto_1fr_auto]`} >
                          <div className="flex gap-2">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted/20">
                              {l.imageUrl ? <img src={fileUrl(l.imageUrl)} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">{l.sku.slice(0,4)}</span>}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium">{l.productName}</div>
                              <div className="truncate text-[11px] font-medium text-primary">{l.variantLabel}</div>
                              <div className="truncate font-mono text-[11px] text-muted-foreground">{l.sku} {l.barcode ? `· ${l.barcode}` : ""}</div>
                              {l.isFromPO ? (
                                <div className="mt-0.5 flex flex-wrap gap-1 text-[11px]">
                                  <span className="rounded bg-muted px-1">Ordered {l.orderedQty}</span>
                                  <span className="rounded bg-amber-50 px-1 text-amber-700">Prev {l.previouslyReceived}</span>
                                  <span className={`rounded px-1 ${isOver ? "bg-destructive text-destructive-foreground" : "bg-emerald-50 text-emerald-700"}`}>Rem {l.remainingQty}</span>
                                  <span className="rounded bg-muted px-1">PO cost {moneyLabel(Number(l.poUnitCost))}</span>
                                </div>
                              ) : null}
                              {isOver ? <div className="text-[11px] font-medium text-destructive">Over-receiving: remaining {l.remainingQty}, tried {l.qty} — requires warning</div> : null}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                            <Field label="Receive *">
                              <div className="flex items-center gap-1">
                                <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateLine(l.variantId, { qty: String(Math.max(1, (Number(l.qty) || 0) - 1)) })}>-</Button>
                                <input className={inputClass + ` h-8 flex-1 text-center text-xs font-semibold tabular-nums ${isOver ? "border-destructive text-destructive" : ""}`} type="number" min="1" step="1" required value={l.qty} onChange={(e) => updateLine(l.variantId, { qty: e.target.value })} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                                <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateLine(l.variantId, { qty: String((Number(l.qty) || 0) + 1) })}>+</Button>
                              </div>
                            </Field>
                            <Field label="Unit cost *">
                              <input className={inputClass + " h-8 text-xs"} type="number" min="0" step="0.01" required value={l.unitCost} onChange={(e) => updateLine(l.variantId, { unitCost: e.target.value })} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                            </Field>
                            <Field label={<span className="flex items-center gap-1">Retail {l.retailPrice !== l.originalRetailPrice ? <span className="rounded bg-amber-500 px-1 py-0 text-[10px] text-white">edited</span> : <span className="rounded bg-muted px-1 py-0 text-[10px]">inherited</span>}</span>}>
                              <input className={inputClass + ` h-8 text-xs ${l.retailPrice !== l.originalRetailPrice ? "border-amber-300 bg-amber-50/50" : ""}`} type="number" min="0" step="0.01" placeholder={l.originalRetailPrice || "—"} value={l.retailPrice} onChange={(e) => updateLine(l.variantId, { retailPrice: e.target.value })} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                            </Field>
                            <Field label={<span className="flex items-center gap-1">Wholesale {l.wholesalePrice !== l.originalWholesalePrice ? <span className="rounded bg-sky-500 px-1 py-0 text-[10px] text-white">edited</span> : <span className="rounded bg-muted px-1 py-0 text-[10px]">inherited</span>}</span>}>
                              <input className={inputClass + ` h-8 text-xs ${l.wholesalePrice !== l.originalWholesalePrice ? "border-sky-300 bg-sky-50/50" : ""}`} type="number" min="0" step="0.01" placeholder={l.originalWholesalePrice || "—"} value={l.wholesalePrice} onChange={(e) => updateLine(l.variantId, { wholesalePrice: e.target.value })} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                            </Field>
                            <Field label="Tax %">
                              <input className={inputClass + " h-8 text-xs"} type="number" min="0" step="0.01" value={l.taxRate} onChange={(e) => updateLine(l.variantId, { taxRate: e.target.value })} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                            </Field>
                            <Field label="Line total">
                              <div className="flex h-8 items-center rounded-md border bg-muted/30 px-2 text-xs tabular-nums">{moneyLabel(lineTotal)}</div>
                            </Field>
                          </div>
                          <div className="flex items-start justify-end">
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => removeLine(l.variantId)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
            {lines.length ? (
              <div className="grid grid-cols-2 gap-2 border-t bg-gradient-to-r from-sky-50/50 to-indigo-50/30 px-2 py-1.5 text-xs dark:from-sky-950/10 sm:grid-cols-4">
                <span>{summary.productCount} products · {summary.lineCount} variants</span>
                <span className="tabular-nums">{summary.totalQty} pcs received</span>
                <span className="tabular-nums">Sub {moneyLabel(summary.subtotal)} · Tax {moneyLabel(summary.tax)}</span>
                <span className="font-semibold tabular-nums">Grand {moneyLabel(summary.total)}</span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
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
        </form>
      </Dialog>
      <Dialog
        open={!!ret}
        title="Purchase return"
        description="Stock leaves the location and supplier due is reduced when this GRN still has due."
        onClose={() => setRet(null)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setRet(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={purchaseReturn.isPending || !retItem} onClick={() => purchaseReturn.mutate()}>
              Post return
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Line">
            <select className={inputClass} value={retItem} onChange={(e) => setRetItem(e.target.value)}>
              {(ret?.items ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.variantId.slice(0, 8)} · qty {i.qty}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qty">
            <input className={inputClass} type="number" min="1" value={retQty} onChange={(e) => setRetQty(e.target.value)} />
          </Field>
          <Field label="Reason">
            <input className={inputClass} value={retReason} onChange={(e) => setRetReason(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </AppShell>
  );
}
