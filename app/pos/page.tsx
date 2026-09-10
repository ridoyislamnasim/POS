"use client";

import { motion, useReducedMotion } from "framer-motion";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, fileUrl } from "@/lib/api";
import { usePOSStore } from "@/lib/pos-store";
import { dict } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { useMe } from "@/lib/auth";
import { Modal, btnGhost, btnPrimary, inputClass, EmptyState } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PosCustomerPicker } from "@/components/pos/pos-customer-picker";
import { DocumentActions } from "@/components/documents/document-actions";
import { getApiErrorMessage, toastPos, toastWarn } from "@/lib/toast";
import { lineCharge, roundMoney } from "@/lib/money";
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

type Held = { id: string; payload: { cart?: ReturnType<typeof usePOSStore.getState>["cart"]; customer?: { id: string; name: string; phone: string } | null } };

export default function PosPage() {
  const qc = useQueryClient();
  const scanRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [matrixProduct, setMatrixProduct] = useState<Product | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [customerFocus, setCustomerFocus] = useState(0);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [mfs, setMfs] = useState("");
  const [discVariant, setDiscVariant] = useState<string | null>(null);
  const [discAmt, setDiscAmt] = useState("0");
  const store = usePOSStore();
  const t = dict[store.locale];
  const { me, can } = useMe();
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
          items: store.cart.map((c) => ({
            variantId: c.variantId,
            qty: c.qty,
            discountAmount: c.discountAmount && Number(c.discountAmount) > 0 ? c.discountAmount : undefined,
            discountReason: c.discountReason,
          })),
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
          payload: { cart: store.cart, customer: store.customer },
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
    return store.cart.reduce(
      (acc, l) => {
        const line = lineCharge({
          unitPrice: Number(l.unitPrice),
          qty: l.qty,
          discount: Number(l.discountAmount || 0),
          taxRatePercent: Number(l.taxRate || 0),
        });
        acc.subtotal = roundMoney(acc.subtotal + line.taxable);
        acc.tax = roundMoney(acc.tax + line.tax);
        acc.total = roundMoney(acc.total + line.lineTotal);
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0 },
    );
  }, [store.cart]);
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
        if (!can("discount.apply")) {
          toastWarn("Discount permission required");
          return;
        }
        setDiscVariant(store.cart[0]?.variantId ?? null);
        setDiscountOpen(true);
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
        if (payOpen || discountOpen || holdsOpen || closeOpen) {
          setPayOpen(false);
          setDiscountOpen(false);
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
  }, [store, hold, pay, can, payOpen, discountOpen, holdsOpen, closeOpen]);

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
      discountAmount: "0",
      taxRate: String(product.taxCategory?.rate ?? 0),
    });
    setMatrixProduct(null);
    scanRef.current?.focus();
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
              <div className="grid grid-cols-2 gap-2 overflow-auto p-2 sm:grid-cols-3">
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
              {store.cart.map((l) => (
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
                    <span className="ml-auto text-sm tabular-nums">{(Number(l.unitPrice) * l.qty - Number(l.discountAmount || 0)).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-orange-100 bg-gradient-to-t from-orange-50/60 to-card p-3 shadow-sm dark:border-orange-950/40 dark:from-orange-950/25">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">৳ {cartParts.subtotal.toFixed(2)}</span>
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

      {discountOpen ? (
        <Modal title="Discount (F8)" onClose={() => setDiscountOpen(false)}>
          <select className={inputClass} value={discVariant ?? ""} onChange={(e) => setDiscVariant(e.target.value)}>
            {store.cart.map((l) => (
              <option key={l.variantId} value={l.variantId}>
                {l.name}
              </option>
            ))}
          </select>
          <input className={inputClass + " mt-2"} value={discAmt} onChange={(e) => setDiscAmt(e.target.value)} />
          <button
            type="button"
            className={btnPrimary + " mt-3 w-full"}
            onClick={() => {
              if (!discVariant) return;
              store.setDiscount(discVariant, discAmt, "POS");
              setDiscountOpen(false);
              toastPos("success", "Discount applied");
            }}
          >
            Apply
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
