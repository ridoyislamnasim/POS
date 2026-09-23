"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, Loader2, Package, Minus, Plus, ShoppingBag, MapPin, Tag, Percent, X, Lock } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Button, Field, inputClass } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { OrderCustomerPicker, type OrderCustomer } from "@/components/orders/order-customer-picker";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyLabel, roundMoney, itemDiscountAmount } from "@/lib/money";
import { useDebounced } from "@/lib/use-debounce";

type Product = {
  id: string;
  name: string;
  code: string;
  sellingPrice?: string | null;
  purchasePrice?: string | null;
  wholesalePrice?: string | null;
  retailPrice?: string | null;
  taxCategory?: { rate: string } | null;
  images?: { url: string; isPrimary: boolean }[];
  variants: {
    id: string;
    sku: string;
    price: string;
    wholesalePrice?: string | null;
    retailPrice?: string | null;
    cost?: string | null;
    discount?: string | null;
    imageUrl?: string | null;
    attributes: { option: { value: string; label: string; definition: { key: string; name: string } } }[];
    barcodes: { code: string; primary: boolean }[];
    stock: { locationId: string; quantity: string; reservedQuantity?: string }[];
  }[];
};

type Line = {
  variantId: string;
  productId: string;
  name: string;
  sku: string;
  variantLabel: string;
  variantSnapshot?: string;
  qty: number;
  unitPrice: string;
  originalPrice: string;
  discountAmount: string;
  discountPercent: string;
  discountReason?: string;
  taxRate: string;
  imageUrl?: string;
};

export default function NewOrderPage() {
  const router = useRouter();
  const { me, can } = useMe();
  const canDiscount = can("discount.apply");
  const canPriceOverride = can("price.override");
  const [branchId, setBranchId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [customer, setCustomer] = useState<OrderCustomer | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [reference, setReference] = useState("");
  const [matrixProduct, setMatrixProduct] = useState<Product | null>(null);
  const [pricingMode, setPricingMode] = useState<"retail" | "wholesale">("retail");
  const [discEdit, setDiscEdit] = useState<{ variantId: string } | null>(null);
  const [discType, setDiscType] = useState<"flat" | "percent">("flat");
  const [discValue, setDiscValue] = useState("0");
  const [discReason, setDiscReason] = useState("");

  const branches = me?.branches ?? [];
  const activeBranch = branches.find((b) => b.id === branchId) ?? branches[0] ?? null;
  const effectiveLocation = locationId || activeBranch?.locationId || "";

  useMemo(() => {
    if (!branchId && branches.length) {
      setBranchId(branches[0].id);
      setLocationId(branches[0].locationId ?? "");
    }
  }, [branches, branchId]);

  const debouncedQ = useDebounced(q, 350);

  const productsQ = useQuery({
    queryKey: ["so-products", debouncedQ],
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => api<Product[]>(`/api/v1/catalog/products?status=ACTIVE&pos=1&search=${encodeURIComponent(debouncedQ)}&limit=40`, { signal }),
  });

  const createMut = useMutation({
    mutationFn: (status: "DRAFT" | "CONFIRMED") =>
      api("/api/v1/commerce/sales-orders", {
        method: "POST",
        body: JSON.stringify({
          branchId: branchId || activeBranch?.id,
          locationId: effectiveLocation || undefined,
          customerId: customer?.id ?? undefined,
          customerNotes: customerNotes || undefined,
          internalNotes: internalNotes || undefined,
          deliveryNotes: deliveryNotes || undefined,
          expectedDeliveryAt: expectedDeliveryAt || undefined,
          reference: reference || undefined,
          status,
          notes: internalNotes || undefined,
          items: lines.map((l) => ({
            variantId: l.variantId,
            qty: l.qty,
            unitPrice: l.unitPrice,
            originalPrice: l.originalPrice,
            discountAmount: l.discountAmount,
            discountPercent: l.discountPercent,
            taxRate: l.taxRate,
          })),
        }),
      }),
    onSuccess: (_d, status) => {
      toastSuccess(status === "DRAFT" ? "Draft saved" : "Sales order confirmed");
      router.push("/orders");
    },
    onError: (e) => toastError(e, "Could not create sales order"),
  });

  function variantLabel(v: Product["variants"][0]) {
    return v.attributes.map((a) => a.option.label).join(" / ") || v.sku;
  }

  function priceForVariant(v: Product["variants"][0], product: Product): string {
    if (pricingMode === "wholesale" && v.wholesalePrice) return String(v.wholesalePrice);
    if (pricingMode === "wholesale" && product.wholesalePrice) return String(product.wholesalePrice);
    return String(v.price);
  }

  function pickProduct(p: Product) {
    if (p.variants.length === 1) {
      addVariant(p, p.variants[0]);
      return;
    }
    setMatrixProduct(p);
  }

  function addVariant(product: Product, v: Product["variants"][0]) {
    const effPrice = priceForVariant(v, product);
    setLines((prev) => {
      const ex = prev.find((l) => l.variantId === v.id);
      if (ex) return prev.map((l) => (l.variantId === v.id ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        {
          variantId: v.id,
          productId: product.id,
          name: product.name,
          sku: v.sku,
          variantLabel: variantLabel(v),
          variantSnapshot: v.attributes.map((a) => `${a.option.definition.name} ${a.option.label}`).join(" / "),
          qty: 1,
          unitPrice: effPrice,
          originalPrice: String(v.price),
          discountAmount: "0",
          discountPercent: "0",
          taxRate: String(product.taxCategory?.rate ?? 0),
          imageUrl: v.imageUrl ?? product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? undefined,
        },
      ];
    });
    setMatrixProduct(null);
  }

  function setQty(variantId: string, qty: number) {
    if (qty <= 0) setLines((p) => p.filter((l) => l.variantId !== variantId));
    else setLines((p) => p.map((l) => (l.variantId === variantId ? { ...l, qty } : l)));
  }

  function setLinePrice(variantId: string, price: string) {
    setLines((p) => p.map((l) => (l.variantId === variantId ? { ...l, unitPrice: price } : l)));
  }

  function openDisc(variantId: string) {
    const line = lines.find((l) => l.variantId === variantId);
    if (!line) return;
    const isPct = Number(line.discountPercent || 0) > 0;
    setDiscType(isPct ? "percent" : "flat");
    setDiscValue(isPct ? line.discountPercent : line.discountAmount);
    setDiscReason(line.discountReason ?? "");
    setDiscEdit({ variantId });
  }

  function applyDisc() {
    if (!discEdit) return;
    if (!canDiscount) {
      toastError(new Error("Discount permission required"), "No permission");
      return;
    }
    const val = String(Math.max(0, Number(discValue) || 0));
    if (discType === "percent" && Number(val) > 100) {
      toastError(new Error("Percent cannot exceed 100"), "Invalid discount");
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        l.variantId === discEdit.variantId
          ? {
              ...l,
              discountAmount: discType === "flat" ? val : "0",
              discountPercent: discType === "percent" ? val : "0",
              discountReason: discReason.trim() || undefined,
            }
          : l,
      ),
    );
    setDiscEdit(null);
    setDiscReason("");
  }

  function clearDisc() {
    if (!discEdit) return;
    setLines((prev) => prev.map((l) => (l.variantId === discEdit.variantId ? { ...l, discountAmount: "0", discountPercent: "0", discountReason: undefined } : l)));
    setDiscEdit(null);
    setDiscReason("");
  }

  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    for (const l of lines) {
      const extended = Number(l.unitPrice) * l.qty;
      const d = itemDiscountAmount({ unitPrice: Number(l.unitPrice), qty: l.qty, flat: Number(l.discountAmount || 0), percent: Number(l.discountPercent || 0) });
      const taxable = Math.max(extended - d, 0);
      const t = roundMoney(taxable * (Number(l.taxRate || 0) / 100));
      subtotal += taxable;
      discount += d;
      tax += t;
    }
    subtotal = roundMoney(subtotal);
    discount = roundMoney(discount);
    tax = roundMoney(tax);
    const grand = roundMoney(subtotal + tax);
    return { subtotal, discount, tax, grand };
  }, [lines]);

  const canSave = Boolean((branchId || activeBranch?.id) && lines.length > 0 && lines.every((l) => l.qty > 0 && Number(l.unitPrice) >= 0));
  const totalUnits = lines.reduce((s, l) => s + l.qty, 0);

  // compact summary component (reused desktop + mobile)
  function Summary({ compact }: { compact?: boolean }) {
    return (
      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Subtotal</span>
          <motion.span key={totals.subtotal} initial={{ scale: 0.97 }} animate={{ scale: 1 }} className="tabular-nums font-medium">{moneyLabel(totals.subtotal)}</motion.span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Discount</span>
          <span className="tabular-nums font-medium text-amber-600">{totals.discount > 0 ? `−${moneyLabel(totals.discount)}` : moneyLabel(0)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">VAT</span>
          <span className="tabular-nums">{moneyLabel(totals.tax)}</span>
        </div>
        <p className="text-[11px] leading-tight text-muted-foreground">No payment — payment when Converted to Sale.</p>
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <Button type="button" variant="outline" size="sm" className="h-9 text-xs" disabled={!canSave || createMut.isPending} onClick={() => createMut.mutate("DRAFT")}>
            {createMut.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}Save Draft
          </Button>
          <Button type="button" size="sm" className="h-9 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-semibold hover:from-emerald-600 hover:to-teal-600" disabled={!canSave || createMut.isPending} onClick={() => createMut.mutate("CONFIRMED")}>
            {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            <span>Confirm</span>
            <motion.span key={totals.grand} initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-emerald-700 shadow-sm">
              {moneyLabel(totals.grand)}
            </motion.span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell pos>
      {/* compact top bar like POS header */}
      <div className="flex items-center justify-between gap-2 border-b bg-card px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="hidden h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm sm:flex"><ShoppingBag className="h-3.5 w-3.5" /></span>
          <h1 className="text-sm font-semibold">Create Sales Order</h1>
          <span className="hidden text-xs text-muted-foreground sm:inline">· {lines.length} items · {totalUnits} units</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push("/orders")}>Back</Button>
      </div>

      <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col lg:grid lg:grid-cols-[1fr_340px]">
        {/* Left: products + lines */}
        <section className="flex min-h-0 flex-1 flex-col bg-card lg:border-r lg:border-border/60">
          {/* branch / customer compact */}
          <div className="grid gap-2 border-b bg-muted/20 p-2 sm:grid-cols-3">
            <Field label="Branch *">
              <select className={inputClass + " h-8 text-xs"} value={branchId} onChange={(e) => { const b = branches.find((x) => x.id === e.target.value); if (b) { setBranchId(b.id); setLocationId(b.locationId); } else setBranchId(e.target.value); }}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <div className="relative sm:col-span-2">
              <Field label="Customer — walk-in allowed">
                <OrderCustomerPicker value={customer} onChange={setCustomer} />
              </Field>
            </div>
          </div>

          {/* search + pricing */}
          <div className="flex items-center gap-1.5 border-b bg-background p-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product, SKU, barcode… (POS style)" className={inputClass + " h-9 pl-7 text-xs"} />
            </div>
            <div className="flex rounded-full border bg-muted/30 p-0.5">
              <button type="button" onClick={() => setPricingMode("retail")} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${pricingMode === "retail" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}>Retail</button>
              <button type="button" onClick={() => setPricingMode("wholesale")} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${pricingMode === "wholesale" ? "bg-emerald-500 text-white shadow" : "text-muted-foreground"}`}>Wholesale</button>
            </div>
          </div>

          {/* product grid compact like POS */}
          <div className="min-h-0 flex-1 overflow-auto p-1.5">
            {!productsQ.data?.length ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 py-8 text-center">
                <Package className="h-6 w-6 text-muted-foreground/40" />
                <p className="mt-1 text-xs font-medium">Search products</p>
                <p className="text-[11px] text-muted-foreground">POS er moto compact card e dekhabe</p>
              </div>
            ) : (
              <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
                {productsQ.data.map((p, idx) => {
                  const firstV = p.variants[0];
                  const price = firstV ? priceForVariant(firstV, p) : "0";
                  const isMulti = p.variants.length > 1;
                  const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || firstV?.imageUrl;
                  const totalStock = p.variants.reduce((s, v) => s + Number(v.stock.find((x) => x.locationId === effectiveLocation)?.quantity ?? v.stock[0]?.quantity ?? 0), 0);
                  const low = totalStock <= 5 && totalStock > 0;
                  const oos = totalStock <= 0;
                  return (
                    <motion.button
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15, delay: idx * 0.01 }}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => pickProduct(p)}
                      className="group flex gap-2 overflow-hidden rounded-lg border bg-card p-1.5 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow"
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                        {img ? <img src={fileUrl(img)} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/40" /></div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium leading-tight">{p.name}</div>
                        <div className="truncate text-[11px] leading-tight text-muted-foreground">{p.code} {isMulti ? `· ${p.variants.length} var` : `· ${firstV?.sku ?? ""}`}</div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="text-xs font-semibold tabular-nums">{moneyLabel(Number(price))}</span>
                          <span className={`rounded-full border px-1 py-0 text-[10px] font-medium ${oos ? "bg-destructive/10 text-destructive border-destructive/20" : low ? "bg-amber-500/10 text-amber-700 border-amber-500/20" : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"}`}>{oos ? "OOS" : low ? "Low" : `${totalStock}`}</span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* compact order lines — mobile only, pc te right aside te jabe */}
          <div className="border-t bg-background lg:hidden">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lines · {lines.length}</span>
              {lines.length ? <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{totalUnits} units</span> : null}
              <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setMoreOpen((v) => !v)}>{moreOpen ? "Less" : "More"}</button>
            </div>
            <div className="max-h-[22vh] overflow-auto">
              {lines.length ? (
                <div className="divide-y">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => {
                      const disc = itemDiscountAmount({ unitPrice: Number(l.unitPrice), qty: l.qty, flat: Number(l.discountAmount || 0), percent: Number(l.discountPercent || 0) });
                      const after = Math.max(Number(l.unitPrice) * l.qty - disc, 0);
                      const taxAmt = roundMoney(after * (Number(l.taxRate || 0) / 100));
                      const total = roundMoney(after + taxAmt);
                      const extended = Number(l.unitPrice) * l.qty;
                      const hasDisc = disc > 0;
                      const discLabel = Number(l.discountPercent) > 0 ? `${l.discountPercent}%` : hasDisc ? moneyLabel(Number(l.discountAmount)) : "";
                      return (
                        <motion.div key={l.variantId} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-1 px-2 py-1.5 hover:bg-muted/20">
                          <div className="flex items-center gap-1.5">
                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded border bg-muted/20">
                              {l.imageUrl ? <img src={fileUrl(l.imageUrl)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Package className="h-3.5 w-3.5 text-muted-foreground/40" /></div>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium leading-tight">{l.name}</div>
                              <div className="truncate text-[11px] leading-tight text-muted-foreground">{l.variantLabel} · <span className="font-mono">{l.sku}</span></div>
                            </div>
                            <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => setLines((p) => p.filter((x) => x.variantId !== l.variantId))}><Trash2 className="h-3 w-3" /></button>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="flex items-center gap-1">
                              <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-xs hover:bg-muted" onClick={() => setQty(l.variantId, l.qty - 1)}><Minus className="h-3 w-3" /></button>
                              <span className="w-6 text-center text-xs font-semibold tabular-nums">{l.qty}</span>
                              <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90" onClick={() => setQty(l.variantId, l.qty + 1)}><Plus className="h-3 w-3" /></button>
                            </div>
                            <div className="flex h-7 items-center gap-1 rounded-md border bg-muted/40 px-1.5 text-xs tabular-nums dark:bg-card" title="Main price locked — use discount">
                              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="font-medium">{moneyLabel(Number(l.unitPrice))}</span>
                            </div>
                            <button
                              type="button"
                              disabled={!canDiscount && !hasDisc}
                              onClick={() => canDiscount && openDisc(l.variantId)}
                              className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition ${hasDisc ? "bg-amber-500 text-white border-amber-500" : "bg-white hover:bg-amber-50 hover:border-amber-200 dark:bg-card"} disabled:opacity-60`}
                              title={hasDisc ? `Discount ${discLabel}` : "Add discount"}
                            >
                              {hasDisc ? <Percent className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                              {hasDisc ? discLabel : "Disc"}
                            </button>
                            <span className="ml-auto flex items-center gap-1 text-xs font-semibold tabular-nums">
                              {hasDisc ? <span className="text-[11px] font-normal text-muted-foreground line-through">{moneyLabel(extended)}</span> : null}
                              <span className={hasDisc ? "text-amber-600" : ""}>{moneyLabel(total)}</span>
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">No lines — add from cards above</div>
              )}
            </div>
            <AnimatePresence>
              {moreOpen ? (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid gap-2 border-t bg-muted/20 p-2 lg:hidden">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Expected delivery"><input type="date" className={inputClass + " h-8 text-xs"} value={expectedDeliveryAt} onChange={(e) => setExpectedDeliveryAt(e.target.value)} /></Field>
                    <Field label="Reference"><input className={inputClass + " h-8 text-xs"} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO / ref" /></Field>
                    <Field label="Customer note"><textarea className={inputClass + " min-h-[50px] text-xs"} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Print e show hobe" /></Field>
                    <Field label="Internal note"><textarea className={inputClass + " min-h-[50px] text-xs"} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Staff only" /></Field>
                  </div>
                  <Field label="Delivery note"><textarea className={inputClass + " min-h-[50px] text-xs"} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Address / instructions" /></Field>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </section>

        {/* Right: PC te selected products Order Summary er oupore — POS cart er moto */}
        <aside className="hidden min-h-0 flex-col bg-background lg:flex">
          <div className="shrink-0 border-b bg-gradient-to-br from-indigo-50 to-violet-50 p-2 dark:from-indigo-950/20 dark:to-violet-950/20">
            <div className="flex items-center gap-1.5 text-xs font-semibold"><MapPin className="h-3 w-3 text-primary" /> Order Summary</div>
            <div className="text-[11px] text-muted-foreground">{customer?.name ?? "Walk-in"} · {activeBranch?.name ?? ""} · {lines.length} items</div>
          </div>

          {/* Selected products — PC te Summary er oupore */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 flex items-center justify-between border-b bg-muted/20 px-2 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Selected · {lines.length}</span>
              {lines.length ? <span className="text-[11px] tabular-nums text-muted-foreground">{totalUnits} units</span> : null}
              <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setMoreOpen((v) => !v)}>{moreOpen ? "Less" : "More"}</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {lines.length ? (
                <div className="divide-y">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => {
                      const disc = itemDiscountAmount({ unitPrice: Number(l.unitPrice), qty: l.qty, flat: Number(l.discountAmount || 0), percent: Number(l.discountPercent || 0) });
                      const after = Math.max(Number(l.unitPrice) * l.qty - disc, 0);
                      const taxAmt = roundMoney(after * (Number(l.taxRate || 0) / 100));
                      const total = roundMoney(after + taxAmt);
                      const extended = Number(l.unitPrice) * l.qty;
                      const hasDisc = disc > 0;
                      const discLabel = Number(l.discountPercent) > 0 ? `${l.discountPercent}%` : hasDisc ? moneyLabel(Number(l.discountAmount)) : "";
                      return (
                        <motion.div key={l.variantId} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="group flex flex-col gap-1 px-2 py-1.5 hover:bg-muted/30">
                          <div className="flex items-center gap-1.5">
                            <div className="h-8 w-8 shrink-0 overflow-hidden rounded border bg-muted/20">
                              {l.imageUrl ? <img src={fileUrl(l.imageUrl)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Package className="h-3.5 w-3.5 text-muted-foreground/40" /></div>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-medium leading-tight">{l.name}</div>
                              <div className="truncate text-[11px] leading-tight text-muted-foreground">{l.variantLabel} · <span className="font-mono">{l.sku}</span></div>
                            </div>
                            <button type="button" className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => setLines((p) => p.filter((x) => x.variantId !== l.variantId))}><Trash2 className="h-3 w-3" /></button>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="flex items-center gap-1">
                              <button type="button" className="flex h-6 w-6 items-center justify-center rounded-full border bg-white text-xs hover:bg-muted" onClick={() => setQty(l.variantId, l.qty - 1)}><Minus className="h-3 w-3" /></button>
                              <span className="w-5 text-center text-xs font-semibold tabular-nums">{l.qty}</span>
                              <button type="button" className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90" onClick={() => setQty(l.variantId, l.qty + 1)}><Plus className="h-3 w-3" /></button>
                            </div>
                            <div className="flex h-6 items-center gap-1 rounded-md border bg-muted/40 px-1.5 text-xs tabular-nums dark:bg-card" title="Main price locked — use discount">
                              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="font-medium">{moneyLabel(Number(l.unitPrice))}</span>
                            </div>
                            <button
                              type="button"
                              disabled={!canDiscount && !hasDisc}
                              onClick={() => canDiscount && openDisc(l.variantId)}
                              className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium ${hasDisc ? "bg-amber-500 text-white border-amber-500" : "bg-white hover:border-amber-300 dark:bg-card"} disabled:opacity-60`}
                            >
                              {hasDisc ? <Percent className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                              {hasDisc ? discLabel : "Disc"}
                            </button>
                            <span className="ml-auto flex items-center gap-1 text-xs font-semibold tabular-nums">
                              {hasDisc ? <span className="text-[11px] font-normal text-muted-foreground line-through">{moneyLabel(extended)}</span> : null}
                              <span className={hasDisc ? "text-amber-600" : ""}>{moneyLabel(total)}</span>
                            </span>
                          </div>
                          {hasDisc && l.discountReason ? <div className="truncate text-[10px] text-amber-600">"{l.discountReason}"</div> : null}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                  <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                  <p className="mt-1 text-xs text-muted-foreground">No products yet</p>
                  <p className="text-[11px] text-muted-foreground">Left theke card e tap korun</p>
                </div>
              )}
            </div>
            <AnimatePresence>
              {moreOpen ? (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t bg-muted/20 p-2">
                  <div className="grid gap-2">
                    <Field label="Expected delivery"><input type="date" className={inputClass + " h-7 text-xs"} value={expectedDeliveryAt} onChange={(e) => setExpectedDeliveryAt(e.target.value)} /></Field>
                    <Field label="Reference"><input className={inputClass + " h-7 text-xs"} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO / ref" /></Field>
                    <Field label="Customer note"><textarea className={inputClass + " min-h-[40px] text-xs"} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Print e show hobe" /></Field>
                    <Field label="Delivery note"><textarea className={inputClass + " min-h-[40px] text-xs"} value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} /></Field>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Summary — niche, sticky */}
          <div className="shrink-0 border-t bg-card p-2">
            <Summary compact />
          </div>
        </aside>
      </div>

      {/* Mobile sticky — space optimize: Total amount button e */}
      <div className="sticky bottom-0 z-10 border-t bg-background p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{lines.length} items · {totalUnits} units</span>
          <span className="tabular-nums">{moneyLabel(totals.subtotal)} → {moneyLabel(totals.grand)}</span>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" disabled={!canSave || createMut.isPending} onClick={() => createMut.mutate("DRAFT")}>Save Draft</Button>
          <Button type="button" size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-semibold" disabled={!canSave || createMut.isPending} onClick={() => createMut.mutate("CONFIRMED")}>
            {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            <span>Confirm</span>
            <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-emerald-700 shadow-sm">{moneyLabel(totals.grand)}</span>
          </Button>
        </div>
      </div>

      {/* Product-wise Discount Editor — POS style */}
      <Dialog
        open={Boolean(discEdit)}
        title="Product discount"
        description={discEdit ? lines.find((l) => l.variantId === discEdit.variantId)?.name ?? "" : "Set discount for this item"}
        size="sm"
        onClose={() => setDiscEdit(null)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={clearDisc} className="mr-auto">
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
            <Button type="button" variant="outline" onClick={() => setDiscEdit(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyDisc}>
              Apply
            </Button>
          </>
        }
      >
        {discEdit ? (
          (() => {
            const line = lines.find((l) => l.variantId === discEdit.variantId);
            const extended = line ? Number(line.unitPrice) * line.qty : 0;
            const preview = discType === "percent" ? (extended * (Number(discValue) || 0)) / 100 : Number(discValue) || 0;
            const clamped = Math.min(preview, extended);
            return (
              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/20 p-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Extended</span><span className="font-medium tabular-nums">{moneyLabel(extended)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-semibold text-amber-600 tabular-nums">{moneyLabel(clamped)}</span></div>
                  <div className="flex justify-between border-t pt-1 font-semibold"><span>After discount</span><span className="tabular-nums">{moneyLabel(Math.max(extended - clamped, 0))}</span></div>
                </div>
                <div className="flex rounded-full border bg-muted/20 p-1">
                  <button type="button" onClick={() => setDiscType("flat")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-semibold transition ${discType === "flat" ? "bg-white shadow text-foreground dark:bg-card" : "text-muted-foreground"}`}>
                    <Tag className="h-3.5 w-3.5" /> Flat
                  </button>
                  <button type="button" onClick={() => setDiscType("percent")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-semibold transition ${discType === "percent" ? "bg-amber-500 text-white shadow" : "text-muted-foreground"}`}>
                    <Percent className="h-3.5 w-3.5" /> Percent
                  </button>
                </div>
                <Field label={discType === "percent" ? "Percent %" : "Flat amount (৳)"}>
                  <input type="number" min={0} max={discType === "percent" ? 100 : undefined} className={inputClass + " h-9"} value={discValue} onChange={(e) => setDiscValue(e.target.value)} placeholder={discType === "percent" ? "10" : "50"} />
                </Field>
                <Field label="Reason (optional)">
                  <input className={inputClass + " h-9 text-xs"} value={discReason} onChange={(e) => setDiscReason(e.target.value)} placeholder="e.g. loyalty, bundle, damage" />
                </Field>
                {!canDiscount ? <p className="text-xs text-amber-600">You need discount.apply permission — preview only.</p> : null}
              </div>
            );
          })()
        ) : null}
      </Dialog>

      {/* Variant picker colorful but compact */}
      <AnimatePresence>
        {matrixProduct ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-sm" onClick={() => setMatrixProduct(null)}>
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.18 }} className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-2 dark:from-violet-950/20 dark:to-indigo-950/20">
                <div><div className="text-sm font-semibold">{matrixProduct.name}</div><div className="text-[11px] text-muted-foreground">Exact variant choose korun — image shoho</div></div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMatrixProduct(null)}>Close</Button>
              </div>
              <div className="max-h-[60vh] overflow-auto p-2">
                <div className="grid gap-1.5">
                  {matrixProduct.variants.map((v) => {
                    const price = priceForVariant(v, matrixProduct);
                    const label = variantLabel(v);
                    const avail = effectiveLocation ? v.stock.find((s) => s.locationId === effectiveLocation)?.quantity : v.stock[0]?.quantity;
                    const vImg = v.imageUrl ?? matrixProduct.images?.find((i) => i.isPrimary)?.url ?? matrixProduct.images?.[0]?.url ?? null;
                    return (
                      <button key={v.id} type="button" onClick={() => addVariant(matrixProduct, v)} className="flex items-center gap-2 rounded-lg border bg-card p-1.5 text-left transition hover:border-primary/30 hover:bg-accent/40">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                          {vImg ? <img src={fileUrl(vImg)} alt={label} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/40" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium">{label}</div>
                          <div className="truncate font-mono text-[11px] text-muted-foreground">{v.sku}</div>
                          <div className="text-[11px] tabular-nums text-muted-foreground">Avail: {avail ?? "—"}</div>
                        </div>
                        <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">{moneyLabel(Number(price))}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}
