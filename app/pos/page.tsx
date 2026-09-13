"use client";

import { motion, useReducedMotion } from "framer-motion";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, fileUrl } from "@/lib/api";
import { usePOSStore, type DiscountType } from "@/lib/pos-store";
import { dict } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { useMe } from "@/lib/auth";
import { Modal, btnGhost, btnPrimary, inputClass, EmptyState } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PosCustomerPicker } from "@/components/pos/pos-customer-picker";
import { DocumentActions } from "@/components/documents/document-actions";
import { getApiErrorMessage, toastPos } from "@/lib/toast";
import { itemDiscountAmount, lineCharge, roundMoney, transactionDiscountAmount } from "@/lib/money";
import { useDebounced } from "@/lib/use-debounce";
import { emptyHintFor } from "@/lib/help";
import { PageHelpButton } from "@/components/help/PageHelpButton";

type Product = {
  id: string;
  name: string;
  code: string;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  taxCategory?: { rate: string } | null;
  images?: { url: string; isPrimary: boolean }[];
  variants: {
    id: string;
    sku: string;
    price: string;
    imageUrl?: string | null;
    attributes: { option: { value: string; label: string; definition: { key: string } } }[];
    barcodes: { code: string; primary: boolean }[];
    stock: { locationId: string; quantity: string }[];
  }[];
};

type Held = {
  id: string;
  payload: {
    cart?: ReturnType<typeof usePOSStore.getState>["cart"];
    customer?: { id: string; name: string; phone: string } | null;
    txDiscountType?: DiscountType;
    txDiscountAmount?: string;
    txDiscountPercent?: string;
    txDiscountReason?: string | null;
  };
};

type DiscEdit = { kind: "line"; variantId: string } | { kind: "bill" };

export default function PosPage() {
  const qc = useQueryClient();
  const scanRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [matrixProduct, setMatrixProduct] = useState<Product | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [customerFocus, setCustomerFocus] = useState(0);
  const [discEdit, setDiscEdit] = useState<DiscEdit | null>(null);
  const [discType, setDiscType] = useState<DiscountType>("percent");
  const [discValue, setDiscValue] = useState("0");
  const [discReason, setDiscReason] = useState("");
  const [holdsOpen, setHoldsOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [mfs, setMfs] = useState("");
  const store = usePOSStore();
  const t = dict[store.locale];
  const { me, can } = useMe();
  const canDiscount = can("discount.apply");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!me?.branches.length) return;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("pos_active_branch_id") : null;
    const b = me.branches.find((x) => x.id === (store.branchId || saved)) ?? me.branches[0];
    const r = b?.registers[0];
    if (!b || !r) return;
    const deviceId = r.devices[0]?.hardwareId ?? `REG-${r.id}`;
    if (store.branchId !== b.id || store.registerId !== r.id || !store.deviceId) {
      store.setStation(b.id, r.id, deviceId);
    }
  }, [me, store]);

  const search = useDebounced(q, 400);
  const products = useQuery({
    queryKey: ["pos-products", search],
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api<Product[]>(`/api/v1/catalog/products?status=ACTIVE&pos=1&search=${encodeURIComponent(search)}&limit=50`, { signal }),
  });
  const shift = useQuery({
    queryKey: ["shift"],
    queryFn: () =>
      api<{
        id: string;
        branchId: string;
        registerId: string;
        branch?: { name: string };
        register?: { name: string };
      } | null>("/api/v1/shifts/current"),
  });
  const closeShift = useMutation({
    mutationFn: () =>
      api(`/api/v1/shifts/${shift.data!.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closingCash: closingCash || undefined }),
      }),
    onSuccess: () => {
      toastPos("success", "Shift closed");
      setCloseOpen(false);
      shift.refetch();
    },
    onError: (e) => toastPos("error", getApiErrorMessage(e, "Could not close shift")),
  });
  const holds = useQuery({
    queryKey: ["holds"],
    queryFn: () => api<Held[]>("/api/v1/sales/holds/open"),
    enabled: holdsOpen,
  });

  function station() {
    const sd = shift.data;
    if (sd?.branchId && sd?.registerId) {
      const b = me?.branches.find((x) => x.id === sd.branchId);
      const r = b?.registers.find((x) => x.id === sd.registerId) ?? b?.registers[0];
      return {
        branchId: sd.branchId,
        registerId: sd.registerId,
        deviceId: store.deviceId ?? r?.devices[0]?.hardwareId ?? `REG-${sd.registerId}`,
        locationId: b?.locationId ?? "",
      };
    }
    const b = me?.branches.find((x) => x.id === store.branchId) ?? me?.branches[0];
    const r = b?.registers[0];
    return {
      branchId: store.branchId ?? b?.id ?? "",
      registerId: store.registerId ?? r?.id ?? "",
      deviceId: store.deviceId ?? r?.devices[0]?.hardwareId ?? (r ? `REG-${r.id}` : ""),
      locationId: b?.locationId ?? "",
    };
  }

  const openShift = useMutation({
    mutationFn: () => {
      const s = station();
      if (!s.branchId || !s.registerId) throw new Error("No branch/register assigned. Sign in as a cashier or wait for /me.");
      return api("/api/v1/shifts/open", {
        method: "POST",
        body: JSON.stringify({ branchId: s.branchId, registerId: s.registerId, openingFloat: "2000" }),
      });
    },
    onSuccess: () => {
      toastPos("success", "Shift opened");
      shift.refetch();
    },
    onError: (e) => toastPos("error", getApiErrorMessage(e, "Could not open shift")),
  });

  const pay = useMutation({
    mutationFn: async () => {
      const payments = [
        Number(cash) > 0 ? { method: "CASH", amount: String(Number(cash)) } : null,
        Number(card) > 0 ? { method: "CARD", amount: String(Number(card)) } : null,
        Number(mfs) > 0 ? { method: "MFS", amount: String(Number(mfs)) } : null,
      ].filter(Boolean) as { method: string; amount: string }[];
      if (!payments.length) throw new Error("Add cash, card, or MFS");
      const paid = payments.reduce((n, p) => n + Number(p.amount), 0);
      if (paid + 0.0001 < cartTotal && !store.customer) {
        throw new Error("Walk-in sale must be paid in full. Add a customer (phone) for due / credit.");
      }
      const s = station();
      const attempt = store.beginCheckout();
      return api<{ id: string; invoiceNumber: string }>("/api/v1/sales", {
        method: "POST",
        idempotencyKey: attempt,
        body: JSON.stringify({
          branchId: s.branchId,
          registerId: s.registerId,
          deviceId: s.deviceId,
          clientTransactionId: attempt,
          ...(store.customer?.id ? { customerId: store.customer.id } : {}),
          items: store.cart.map((c) => {
            const dType = c.discountType ?? "flat";
            const flat = Number(c.discountAmount || 0);
            const pct = Number(c.discountPercent || 0);
            return {
              variantId: c.variantId,
              qty: c.qty,
              ...(dType === "flat" && flat > 0 ? { discountAmount: c.discountAmount } : {}),
              ...(dType === "percent" && pct > 0 ? { discountPercent: c.discountPercent } : {}),
              discountReason: c.discountReason,
            };
          }),
          ...(store.txDiscountType === "flat" &&
          Number(store.txDiscountAmount || 0) > 0
            ? { transactionDiscount: store.txDiscountAmount }
            : {}),
          ...(store.txDiscountType === "percent" &&
          Number(store.txDiscountPercent || 0) > 0
            ? { transactionDiscountPercent: store.txDiscountPercent }
            : {}),
          ...(store.txDiscountReason ? { transactionDiscountReason: store.txDiscountReason } : {}),
          payments,
        }),
      });
    },
    onSuccess: (sale) => {
      store.setLastSale(sale.id, sale.invoiceNumber);
      store.clear();
      setPayOpen(false);
      setCash("");
      setCard("");
      setMfs("");
      toastPos("success", `Sale ${sale.invoiceNumber} complete`);
      products.refetch();
      scanRef.current?.focus();
    },
    onError: (e) => toastPos("error", getApiErrorMessage(e, "Sale failed")),
  });

  const hold = useMutation({
    mutationFn: () =>
      api("/api/v1/sales/hold", {
        method: "POST",
        body: JSON.stringify({
          branchId: station().branchId,
          payload: {
            cart: store.cart,
            customer: store.customer,
            txDiscountType: store.txDiscountType,
            txDiscountAmount: store.txDiscountAmount,
            txDiscountPercent: store.txDiscountPercent,
            txDiscountReason: store.txDiscountReason,
          },
        }),
      }),
    onSuccess: () => {
      store.clear();
      toastPos("success", "Cart held");
      qc.invalidateQueries({ queryKey: ["holds"] });
    },
    onError: (e) => toastPos("error", getApiErrorMessage(e, "Hold failed")),
  });

const cartParts = useMemo(() => {
  const lines = store.cart.map((l) =>
    lineCharge({
      unitPrice: Number(l.unitPrice),
      qty: l.qty,
      discount: (l.discountType ?? "flat") === "flat" ? Number(l.discountAmount || 0) : 0,
      discountPercent: (l.discountType ?? "flat") === "percent" ? Number(l.discountPercent || 0) : 0,
      taxRatePercent: Number(l.taxRate || 0),
    }),
  );
  const subtotal = roundMoney(lines.reduce((s, c) => s + c.taxable, 0));
  const tax = roundMoney(lines.reduce((s, c) => s + c.tax, 0));
  const lineDiscount = roundMoney(lines.reduce((s, c) => s + c.discount, 0));
  const billDiscount = transactionDiscountAmount({
    subtotal,
    flat: store.txDiscountType === "flat" ? Number(store.txDiscountAmount || 0) : 0,
    percent: store.txDiscountType === "percent" ? Number(store.txDiscountPercent || 0) : 0,
  });
  const total = roundMoney(subtotal + tax - billDiscount);
  return { lines, subtotal, tax, lineDiscount, billDiscount, total };
}, [store.cart, store.txDiscountType, store.txDiscountAmount, store.txDiscountPercent]);
  const cartTotal = cartParts.total;
  const catalog = products.data ?? [];
  const paidNow = Number(cash || 0) + Number(card || 0) + Number(mfs || 0);
  const dueNow = Math.max(cartTotal - paidNow, 0);

  useEffect(() => {
    if (!payOpen) return;
    setCash(cartTotal.toFixed(2));
    setCard("");
    setMfs("");
  }, [payOpen, cartTotal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        scanRef.current?.focus();
      }
      if (e.key === "F4") {
        e.preventDefault();
        setCustomerFocus((n) => n + 1);
      }
      if (e.key === "F8") {
        e.preventDefault();
        openBillDiscount();
      }
      if (e.key === "F9") {
        e.preventDefault();
        if (store.cart.length) hold.mutate();
        else setHoldsOpen(true);
      }
      if (e.key === "F10") {
        e.preventDefault();
        if (store.cart.length) setPayOpen(true);
      }
      if (e.key === "Escape") {
        if (payOpen || discEdit || holdsOpen || closeOpen) {
          setPayOpen(false);
          setDiscEdit(null);
          setHoldsOpen(false);
          setCloseOpen(false);
          return;
        }
        store.clear();
      }
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        if (!store.cart.length || pay.isPending) return;
        if (!payOpen) {
          setPayOpen(true);
          return;
        }
        pay.mutate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, hold, pay, canDiscount, payOpen, discEdit, holdsOpen, closeOpen]);

  async function onScan(e: React.FormEvent) {
    e.preventDefault();
    if (!q) return;
    try {
      const row = await api<{ variant: Product["variants"][0] & { product: Product } }>(
        `/api/v1/catalog/barcode/${encodeURIComponent(q)}`,
      );
      addVariant(row.variant.product, row.variant);
      setQ("");
    } catch {
      const hit = products.data?.find(
        (p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase()),
      );
      if (hit) {
        pickProduct(hit);
        setQ("");
      } else toastPos("info", "No product match");
    }
    requestAnimationFrame(() => scanRef.current?.focus());
  }

  function variantLabel(v: Product["variants"][0]) {
    return v.attributes.map((a) => a.option.label).join(" / ") || v.sku;
  }

  function pickProduct(product: Product) {
    if (product.variants.length === 1) {
      addVariant(product, product.variants[0]);
      return;
    }
    setMatrixProduct(product);
  }

  function addVariant(product: Product, v: Product["variants"][0]) {
    store.addLine({
      variantId: v.id,
      productId: product.id,
      name: product.name,
      variantLabel: variantLabel(v),
      sku: v.sku,
      unitPrice: String(v.price),
      qty: 1,
      discountType: "flat",
      discountAmount: "0",
      discountPercent: "0",
      taxRate: String(product.taxCategory?.rate ?? 0),
    });
    setMatrixProduct(null);
    scanRef.current?.focus();
  }

  function openLineDiscount(variantId: string) {
    const line = store.cart.find((c) => c.variantId === variantId);
    if (!line) return;
    const type = line.discountType ?? "flat";
    setDiscType(type);
    setDiscValue(type === "percent" ? line.discountPercent ?? "0" : line.discountAmount ?? "0");
    setDiscReason("");
    setDiscEdit({ kind: "line", variantId });
  }

  function openBillDiscount() {
    setDiscType(store.txDiscountType);
    setDiscValue(store.txDiscountType === "percent" ? store.txDiscountPercent : store.txDiscountAmount);
    setDiscReason(store.txDiscountReason ?? "");
    setDiscEdit({ kind: "bill" });
  }

  function currentDiscAmount(kind: "line" | "bill", variantId?: string): number {
    if (kind === "bill") return cartParts.billDiscount;
    const line = store.cart.find((c) => c.variantId === variantId);
    if (!line) return 0;
    const type = line.discountType ?? "flat";
    return itemDiscountAmount({
      unitPrice: Number(line.unitPrice),
      qty: line.qty,
      flat: type === "flat" ? Number(line.discountAmount || 0) : 0,
      percent: type === "percent" ? Number(line.discountPercent || 0) : 0,
    });
  }

  function applyDiscount() {
    if (!discEdit) return;
    const value = String(Number(discValue) || 0);
    if (discEdit.kind === "line") {
      store.setDiscount(discEdit.variantId, discType, value, "POS");
    } else {
      store.setTxDiscount(discType, value, discReason.trim() || undefined);
    }
    setDiscEdit(null);
    toastPos("success", "Discount applied");
  }

  function clearDiscount() {
    if (!discEdit) return;
    if (discEdit.kind === "line") {
      store.setDiscount(discEdit.variantId, "flat", "0", "POS");
    } else {
      store.clearTxDiscount();
    }
    setDiscEdit(null);
    toastPos("success", "Discount cleared");
  }

  if (!can("sale.create") && me) {
    return (
      <AppShell>
        <div className="p-6 text-sm text-muted-foreground">POS is not permitted for this user.</div>
      </AppShell>
    );
  }

  return (
    <AppShell pos>
      {shift.isLoading ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading register…</div>
      ) : !shift.data ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">
            {(me?.branches.find((x) => x.id === store.branchId) ?? me?.branches[0])?.name ?? "No branch"} ·{" "}
            {(me?.branches.find((x) => x.id === store.branchId) ?? me?.branches[0])?.registers[0]?.name ?? "No register"}
          </p>
          <button
            data-help="pos-open-shift"
            className={btnPrimary + " h-12 px-6"}
            type="button"
            disabled={openShift.isPending || !station().branchId || !station().registerId}
            onClick={() => openShift.mutate()}
          >
            {openShift.isPending ? "Opening…" : "Open shift"}
          </button>
          <PageHelpButton className="h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_360px]">
          <section className="flex min-h-0 flex-col border-r bg-card">
            <form onSubmit={onScan} className="flex items-center gap-2 border-b border-orange-100/80 bg-gradient-to-r from-orange-50/70 to-transparent p-2 dark:border-orange-950/40 dark:from-orange-950/20">
              <input
                ref={scanRef}
                data-help="pos-scan"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`${t.search}  (F2)`}
                className={inputClass + " h-12 flex-1"}
              />
              <PageHelpButton className="h-10 w-10 shrink-0" />
            </form>
            {matrixProduct ? (
              <Matrix
                product={matrixProduct}
                locationId={station().locationId}
                onPick={(v) => addVariant(matrixProduct, v)}
                onClose={() => setMatrixProduct(null)}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2 overflow-auto p-2 sm:grid-cols-3 md:grid-cols-4">
                {!catalog.length ? (
                  <div className="col-span-full">
                    <EmptyState title="No products" hint={emptyHintFor("/pos")} />
                  </div>
                ) : null}
                {catalog.map((p) => {
                  const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || p.variants[0]?.imageUrl;
                  return (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => pickProduct(p)}
                    whileHover={reduceMotion ? undefined : { y: -2, boxShadow: "0 8px 16px rgba(194,65,12,0.12)" }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="min-h-[80px] overflow-hidden rounded-lg border border-slate-200 bg-card p-0 text-left hover:border-primary dark:border-slate-800"
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fileUrl(img)} alt="" className="h-20 w-full object-cover" />
                    ) : null}
                    <div className="p-3">
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.code}</div>
                    </div>
                  </motion.button>
                  );
                })}
              </div>
            )}
          </section>
          <aside className="flex min-h-0 flex-col bg-background">
            <div className="flex-1 overflow-auto p-2" data-help="pos-cart">
              <div data-help="pos-customer">
                <PosCustomerPicker openSignal={customerFocus} />
              </div>
              {store.cart.map((l) => {
                const dType = l.discountType ?? "flat";
                const flat = dType === "flat" ? Number(l.discountAmount || 0) : 0;
                const pct = dType === "percent" ? Number(l.discountPercent || 0) : 0;
                const calc = lineCharge({
                  unitPrice: Number(l.unitPrice),
                  qty: l.qty,
                  discount: flat,
                  discountPercent: pct,
                  taxRatePercent: Number(l.taxRate || 0),
                });
                const hasDisc = calc.discount > 0;
                const chipLabel =
                  dType === "percent" && pct > 0 ? `−${pct}%` : `−৳${Number(l.discountAmount || 0).toFixed(2)}`;
                const chipCls =
                  "rounded-full border px-2 py-0.5 text-[11px] tabular-nums " +
                  (hasDisc
                    ? "border-amber-500/60 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "border-slate-300 text-muted-foreground");
                return (
                  <div key={l.variantId} className="mb-2 rounded-lg border bg-card p-2 shadow-sm">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{l.name}</span>
                      <button type="button" className="text-muted-foreground" onClick={() => store.remove(l.variantId)}>
                        ×
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground">{l.variantLabel}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" className="h-10 w-10 rounded-md border" onClick={() => store.setQty(l.variantId, l.qty - 1)}>
                        −
                      </button>
                      <span className="w-8 text-center tabular-nums">{l.qty}</span>
                      <button type="button" className="h-10 w-10 rounded-md border" onClick={() => store.setQty(l.variantId, l.qty + 1)}>
                        +
                      </button>
                      <span className="ml-1 text-sm tabular-nums">
                        {hasDisc ? (
                          <>
                            <span className="mr-1 line-through text-muted-foreground">৳{calc.extended.toFixed(2)}</span>
                            <span className="font-medium">৳{(calc.extended - calc.discount).toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="font-medium">৳{calc.extended.toFixed(2)}</span>
                        )}
                      </span>
                      {canDiscount ? (
                        <button
                          type="button"
                          data-help="pos-item-discount"
                          className={`${chipCls} ml-auto cursor-pointer`}
                          onClick={() => openLineDiscount(l.variantId)}
                        >
                          {chipLabel}
                        </button>
                      ) : hasDisc ? (
                        <span className={`${chipCls} ml-auto`}>{chipLabel}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-orange-100 bg-gradient-to-t from-orange-50/60 to-card p-3 shadow-sm dark:border-orange-950/40 dark:from-orange-950/25">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">৳ {cartParts.subtotal.toFixed(2)}</span>
              </div>
              {cartParts.lineDiscount > 0 ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Item discount</span>
                  <span className="tabular-nums">−৳ {cartParts.lineDiscount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-xs">
                {canDiscount ? (
                  <button type="button" data-help="pos-bill-discount" className="cursor-pointer text-muted-foreground hover:text-primary" onClick={openBillDiscount}>
                    {t.discount} (F8)
                  </button>
                ) : (
                  <span className="text-muted-foreground">{t.discount} (F8)</span>
                )}
                <span className={`tabular-nums ${cartParts.billDiscount > 0 ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                  −৳ {cartParts.billDiscount.toFixed(2)}
                </span>
              </div>
              {cartParts.tax > 0 ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>VAT</span>
                  <span className="tabular-nums">৳ {cartParts.tax.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm">
                <span>{t.total}</span>
                <span className="text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">৳ {cartTotal.toFixed(2)}</span>
              </div>
              {store.lastSaleId ? (
                <div className="mt-2">
                  <DocumentActions type="sale" id={store.lastSaleId} number={store.lastInvoice ?? undefined} size="sm" compact={false} preview />
                </div>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" data-help="pos-hold" className={btnGhost} onClick={() => (store.cart.length ? hold.mutate() : setHoldsOpen(true))}>
                  {t.hold} (F9)
                </button>
                <button type="button" data-help="pos-pay" className={btnPrimary} onClick={() => setPayOpen(true)} disabled={!store.cart.length}>
                  {t.pay} (F10)
                </button>
                <button type="button" data-help="pos-close-shift" className={btnGhost + " col-span-2"} onClick={() => setCloseOpen(true)}>
                  Close shift
                </button>
              </div>
              <div data-help="pos-shortcuts" className="mt-2 text-[10px] text-muted-foreground">F4 customer · F8 discount · Ctrl+Enter complete · ESC clear</div>
            </div>
          </aside>
        </div>
      )}

      {payOpen ? (
        <Modal title={t.pay} onClose={() => setPayOpen(false)}>
          <div className="text-2xl tabular-nums">৳ {cartTotal.toFixed(2)}</div>
          {cartParts.tax > 0 ? (
            <p className="text-xs text-muted-foreground">
              Subtotal ৳ {cartParts.subtotal.toFixed(2)} · VAT ৳ {cartParts.tax.toFixed(2)}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {store.customer ? `${store.customer.name} · ${store.customer.phone}` : "Walk-in (no customer)"}
          </p>
          <label className="mt-3 block text-sm">Cash</label>
          <input className={inputClass + " mt-1"} value={cash} onChange={(e) => setCash(e.target.value)} />
          <label className="mt-2 block text-sm">Card</label>
          <input className={inputClass + " mt-1"} value={card} onChange={(e) => setCard(e.target.value)} />
          <label className="mt-2 block text-sm">MFS</label>
          <input className={inputClass + " mt-1"} value={mfs} onChange={(e) => setMfs(e.target.value)} />
          <div className="mt-2 text-sm text-muted-foreground">
            Paid ৳ {paidNow.toFixed(2)}
            {dueNow > 0 ? ` · Due ৳ ${dueNow.toFixed(2)}${store.customer ? "" : " (add customer)"}` : ""}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={btnGhost + " flex-1"} onClick={() => setPayOpen(false)}>
              Cancel
            </button>
            <button type="button" className={btnPrimary + " flex-1"} onClick={() => pay.mutate()} disabled={pay.isPending || !store.cart.length}>
              Complete
            </button>
          </div>
        </Modal>
      ) : null}

      {discEdit ? (
        <Modal
          title={discEdit.kind === "line" ? "Item discount" : "Bill discount"}
          onClose={() => setDiscEdit(null)}
        >
          <DiscountEditor
            canDiscount={canDiscount}
            type={discType}
            setType={setDiscType}
            value={discValue}
            setValue={setDiscValue}
            reason={discReason}
            setReason={setDiscReason}
            withReason={discEdit.kind === "bill"}
            currentAmount={currentDiscAmount(
              discEdit.kind,
              discEdit.kind === "line" ? discEdit.variantId : undefined,
            )}
          />
          {canDiscount ? (
            <div className="mt-3 flex gap-2">
              <button type="button" className={btnGhost + " flex-1"} onClick={clearDiscount}>
                Clear
              </button>
              <button type="button" className={btnPrimary + " flex-1"} onClick={applyDiscount}>
                Apply
              </button>
            </div>
          ) : null}
          <button type="button" className={btnGhost + " mt-2 w-full"} onClick={() => setDiscEdit(null)}>
            Cancel
          </button>
        </Modal>
      ) : null}

      {holdsOpen ? (
        <Modal title="Recall hold" onClose={() => setHoldsOpen(false)}>
          {(holds.data ?? []).length === 0 ? <div className="text-sm text-muted-foreground">No held carts</div> : null}
          {(holds.data ?? []).map((h) => (
            <button
              key={h.id}
              type="button"
              className={btnGhost + " mb-2 w-full justify-start"}
              onClick={async () => {
                const payload = h.payload ?? {};
                store.clear();
                for (const line of payload.cart ?? []) store.addLine(line);
                if (payload.customer) store.setCustomer(payload.customer);
                if (payload.txDiscountAmount && payload.txDiscountPercent) {
                  store.setTxDiscount(
                    payload.txDiscountType ?? "flat",
                    payload.txDiscountType === "percent" ? payload.txDiscountPercent : payload.txDiscountAmount,
                    payload.txDiscountReason ?? undefined,
                  );
                }
                await api(`/api/v1/sales/holds/${h.id}`, { method: "DELETE" }).catch((e) =>
                  toastPos("error", getApiErrorMessage(e, "Could not release hold")),
                );
                setHoldsOpen(false);
                toastPos("success", "Hold recalled");
              }}
            >
              {h.id.slice(-6)} · {(h.payload?.cart ?? []).length} lines
            </button>
          ))}
        </Modal>
      ) : null}
      <ConfirmDialog
        open={closeOpen}
        title="Close this shift?"
        description="The till will lock until you open a new shift. Counted cash is optional."
        confirmLabel="Close shift"
        variant="warning"
        loading={closeShift.isPending}
        onClose={() => setCloseOpen(false)}
        onConfirm={() => closeShift.mutate()}
      >
        <label className="mt-2 block text-sm">Counted cash</label>
        <input className={inputClass + " mt-1"} type="number" placeholder="Optional" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} />
      </ConfirmDialog>
    </AppShell>
  );
}

const QUICK_PERCENTS = [5, 10, 15, 20, 25];

function DiscountEditor({
  canDiscount,
  type,
  setType,
  value,
  setValue,
  reason,
  setReason,
  withReason,
  currentAmount,
}: {
  canDiscount: boolean;
  type: DiscountType;
  setType: (t: DiscountType) => void;
  value: string;
  setValue: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  withReason: boolean;
  currentAmount: number;
}) {
  if (!canDiscount) {
    return (
      <div className="text-sm text-muted-foreground">
        Current discount: ৳ {currentAmount.toFixed(2)} — you need discount permission to change it.
      </div>
    );
  }
  return (
    <div>
      <div className="flex gap-1">
        <button type="button" className={type === "flat" ? btnPrimary : btnGhost} onClick={() => setType("flat")}>
          ৳
        </button>
        <button type="button" className={type === "percent" ? btnPrimary : btnGhost} onClick={() => setType("percent")}>
          %
        </button>
      </div>
      <input
        type="number"
        min="0"
        inputMode="decimal"
        className={inputClass + " mt-2"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {type === "percent" ? (
        <div className="mt-2 grid grid-cols-5 gap-1">
          {QUICK_PERCENTS.map((p) => (
            <button key={p} type="button" className={btnGhost} onClick={() => setValue(String(p))}>
              {p}%
            </button>
          ))}
        </div>
      ) : null}
      {withReason ? (
        <>
          <label className="mt-2 block text-sm">{dict.en.reason}</label>
          <input
            className={inputClass + " mt-1"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional"
          />
        </>
      ) : null}
    </div>
  );
}

function Matrix({
  product,
  locationId,
  onPick,
  onClose,
}: {
  product: Product;
  locationId?: string;
  onPick: (v: Product["variants"][0]) => void;
  onClose: () => void;
}) {
  const keys = [...new Set(product.variants.flatMap((v) => v.attributes.map((a) => a.option.definition.key)))];
  const rowKey = keys[0];
  const colKey = keys[1];
  const colours = [
    ...new Set(product.variants.map((v) => v.attributes.find((a) => a.option.definition.key === rowKey)?.option.value).filter(Boolean)),
  ] as string[];
  const sizes = [
    ...new Set(product.variants.map((v) => v.attributes.find((a) => a.option.definition.key === colKey)?.option.value).filter(Boolean)),
  ] as string[];
  function stockOf(v: Product["variants"][0]) {
    const row = locationId ? v.stock.find((s) => s.locationId === locationId) : v.stock[0];
    return Number(row?.quantity ?? 0);
  }
  const tracking = product.trackInventory !== false;
  const allowZero = !tracking || product.allowNegativeStock;
  function cell(c: string, s: string) {
    return product.variants.find((v) => {
      const col = v.attributes.find((a) => a.option.definition.key === rowKey)?.option.value;
      const sz = v.attributes.find((a) => a.option.definition.key === colKey)?.option.value;
      return col === c && sz === s;
    });
  }
  if (!colours.length || !sizes.length) {
    return (
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-medium">{product.name}</div>
          <button type="button" className="text-sm text-muted-foreground" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid gap-2">
          {product.variants.map((v) => {
            const qty = stockOf(v);
            const label = v.attributes.map((a) => a.option.label).join(" / ") || v.sku;
            return (
              <button
                key={v.id}
                type="button"
                disabled={!allowZero && qty <= 0}
                onClick={() => onPick(v)}
                className={`flex h-12 items-center justify-between rounded-lg border px-3 text-left ${!allowZero && qty <= 0 ? "bg-muted text-muted-foreground" : "bg-card hover:border-primary"}`}
              >
                <span>{label}</span>
                <span className="tabular-nums">{qty}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-medium">{product.name}</div>
        <button type="button" className="text-sm text-muted-foreground" onClick={onClose}>
          Close
        </button>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-1" />
            {sizes.map((s) => (
              <th key={s} className="p-1 uppercase">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colours.map((c) => (
            <tr key={c}>
              <td className="p-1 font-medium capitalize">{c}</td>
              {sizes.map((s) => {
                const v = cell(c, s);
                const qty = v ? stockOf(v) : 0;
                return (
                  <td key={s} className="p-1">
                    <button
                      type="button"
                      disabled={!v || (!allowZero && qty <= 0)}
                      onClick={() => v && onPick(v)}
                      className={`h-12 w-full rounded-lg border ${!v || (!allowZero && qty <= 0) ? "bg-muted text-muted-foreground" : "bg-card hover:border-primary"}`}
                    >
                      {v ? qty : "—"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
