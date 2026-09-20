"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, fileUrl } from "@/lib/api";
import { usePOSStore, type DiscountType } from "@/lib/pos-store";
import { dict } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { useMe } from "@/lib/auth";
import { Modal, btnGhost, btnPrimary, inputClass, EmptyState, ActionTooltip } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PosCustomerPicker } from "@/components/pos/pos-customer-picker";
import { DocumentActions } from "@/components/documents/document-actions";
import { getApiErrorMessage, toastPos } from "@/lib/toast";
import { itemDiscountAmount, lineCharge, moneyLabel, roundMoney, transactionDiscountAmount } from "@/lib/money";
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
  const [cartOpen, setCartOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closingCash, setClosingCash] = useState("");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [mfs, setMfs] = useState("");
  const store = usePOSStore();
  const t = dict[store.locale];
  const { me, can } = useMe();
  const canDiscount = can("discount.apply");

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
  const totalUnits = useMemo(() => store.cart.reduce((s, l) => s + (Number(l.qty) || 0), 0), [store.cart]);
  const catalog = products.data ?? [];
  const paidNow = Number(cash || 0) + Number(card || 0) + Number(mfs || 0);
  const dueNow = Math.max(cartTotal - paidNow, 0);

  function cartMarkup(touch: boolean) {
    const qtyCls = touch ? "h-11 w-11" : "h-9 w-9";
    const rmCls = touch ? "h-10 w-10" : "h-8 w-8";
    return store.cart.map((l) => {
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
      const chip =
        dType === "percent" && pct > 0 ? `−${pct}%` : `−${moneyLabel(Number(l.discountAmount || 0))}`;
      const chipOn =
        "ml-1.5 shrink-0 rounded-full border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] tabular-nums backdrop-blur-sm transition-colors " +
        (hasDisc
          ? "border-amber-400/40 bg-amber-50/70 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          : "text-muted-foreground/80");
      return (
        <div
          key={l.variantId}
          className="group relative mb-1 flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card py-1 pl-2 pr-1 transition-all duration-200 hover:border-primary/25 hover:bg-accent/40 hover:shadow-sm animate-in fade-in slide-in-from-top-1 sm:mb-1.5"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary/60 to-primary/10 transition-opacity duration-200 group-hover:from-primary/80 group-hover:to-primary/40"
          />
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-medium leading-tight">{l.name}</span>
            <ActionTooltip label={`Remove ${l.name}`} variant="destructive" side="top">
              <button
                type="button"
                aria-label={`Remove ${l.name}`}
                className={`flex shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-150 hover:scale-110 hover:bg-red-500/10 hover:text-red-500 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-red-400 ${rmCls}`}
                onClick={() => store.remove(l.variantId)}
              >
                ×
              </button>
            </ActionTooltip>
          </div>
          <div className="flex items-center gap-1 pl-1 text-[10px] leading-tight text-muted-foreground">
            <span className="truncate">{l.variantLabel || l.sku}</span>
            {l.variantLabel && l.sku ? <span className="shrink-0 font-mono opacity-70">{l.sku}</span> : null}
            <span className="ml-auto hidden shrink-0 tabular-nums sm:inline">{moneyLabel(Number(l.unitPrice))}/ea</span>
          </div>
          <div className="flex items-center gap-1.5 pl-1">
            <ActionTooltip label={`Decrease quantity for ${l.name}`} side="top">
              <button
                type="button"
                aria-label={`Decrease qty for ${l.name}`}
                className={`rounded-full bg-primary/5 text-muted-foreground transition-all duration-150 hover:scale-105 hover:bg-primary/15 hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${qtyCls}`}
                onClick={() => store.setQty(l.variantId, l.qty - 1)}
              >
                −
              </button>
            </ActionTooltip>
            <span className={`text-center text-sm font-semibold tabular-nums ${touch ? "w-9" : "w-8"}`}>{l.qty}</span>
            <ActionTooltip label={`Increase quantity for ${l.name}`} side="top">
              <button
                type="button"
                aria-label={`Increase qty for ${l.name}`}
                className={`rounded-full bg-primary/5 text-muted-foreground transition-all duration-150 hover:scale-105 hover:bg-primary/15 hover:text-primary active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${qtyCls}`}
                onClick={() => store.setQty(l.variantId, l.qty + 1)}
              >
                +
              </button>
            </ActionTooltip>
            <span className="ml-auto flex items-baseline gap-1 tabular-nums transition-colors duration-200">
              {hasDisc ? (
                <>
                  <span className="text-[10px] text-muted-foreground line-through">{moneyLabel(calc.extended)}</span>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {moneyLabel(calc.extended - calc.discount)}
                  </span>
                </>
              ) : (
                <span className="text-xs font-semibold">{moneyLabel(calc.extended)}</span>
              )}
            </span>
            {canDiscount ? (
              <button
                type="button"
                data-help="pos-item-discount"
                className={`${chipOn} cursor-pointer hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-500/15`}
                onClick={() => openLineDiscount(l.variantId)}
              >
                {chip}
              </button>
            ) : hasDisc ? (
              <span className={chipOn}>{chip}</span>
            ) : null}
          </div>
        </div>
      );
    });
  }

  function posTotals(onPay?: () => void) {
    const totalDiscount = roundMoney(cartParts.lineDiscount + cartParts.billDiscount);
    return (
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums text-foreground/90">{moneyLabel(cartParts.subtotal)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs">
          {canDiscount ? (
            <button
              type="button"
              data-help="pos-bill-discount"
              className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={openBillDiscount}
            >
              {t.discount} (F8)
            </button>
          ) : (
            <span className="shrink-0 text-muted-foreground">{t.discount}</span>
          )}
          <span
            className={`tabular-nums ${totalDiscount > 0 ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}
          >
            {totalDiscount > 0 ? `−${moneyLabel(totalDiscount)}` : moneyLabel(0)}
          </span>
        </div>
        {cartParts.lineDiscount > 0 && cartParts.billDiscount > 0 ? (
          <div className="text-right text-[10px] leading-tight text-muted-foreground">
            items −{moneyLabel(cartParts.lineDiscount)} · bill −{moneyLabel(cartParts.billDiscount)}
          </div>
        ) : null}
        {cartParts.tax > 0 ? (
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">VAT</span>
            <span className="tabular-nums text-foreground/90">{moneyLabel(cartParts.tax)}</span>
          </div>
        ) : null}
        {store.lastSaleId ? (
          <div className="mt-2">
            <DocumentActions type="sale" id={store.lastSaleId} number={store.lastInvoice ?? undefined} size="xs" compact preview />
          </div>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            data-help="pos-hold"
            className={btnGhost + " h-11"}
            onClick={() => (store.cart.length ? hold.mutate() : setHoldsOpen(true))}
          >
            {t.hold} (F9)
          </button>
          <button
            type="button"
            data-help="pos-pay"
            className={btnPrimary + " h-11"}
            onClick={() => (onPay ? onPay() : setPayOpen(true))}
            disabled={!store.cart.length}
          >
            {t.pay} {moneyLabel(cartTotal)}
          </button>
        </div>
      </div>
    );
  }

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
        setCartOpen(false);
        openBillDiscount();
      }
      if (e.key === "F9") {
        e.preventDefault();
        if (store.cart.length) hold.mutate();
        else setHoldsOpen(true);
      }
      if (e.key === "F10") {
        e.preventDefault();
        if (store.cart.length) {
          setCartOpen(false);
          setPayOpen(true);
        }
      }
      if (e.key === "Escape") {
        if (payOpen || discEdit || holdsOpen || closeOpen || cartOpen || shortcutsOpen) {
          setPayOpen(false);
          setDiscEdit(null);
          setHoldsOpen(false);
          setCloseOpen(false);
          setCartOpen(false);
          setShortcutsOpen(false);
          return;
        }
        store.clear();
      }
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        if (!store.cart.length || pay.isPending) return;
        if (!payOpen) {
          setCartOpen(false);
          setPayOpen(true);
          return;
        }
        pay.mutate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, hold, pay, canDiscount, payOpen, discEdit, holdsOpen, closeOpen, cartOpen, shortcutsOpen]);

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
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[1fr_340px]">
            <section className="flex min-h-0 flex-col bg-card lg:border-r lg:border-border/60">
              <form
                onSubmit={onScan}
                className="flex shrink-0 items-center gap-1.5 border-b border-border/60 px-2 py-1.5 bg-background"
              >
                <input
                  ref={scanRef}
                  data-help="pos-scan"
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`${t.search}  (F2)`}
                  className={inputClass + " h-11 flex-1 text-[15px] sm:h-10 sm:text-sm"}
                />
                <PageHelpButton className="h-10 w-10 shrink-0 sm:h-9 sm:w-9" />
              </form>
              <div className="shrink-0 border-b border-border/60 bg-background px-2 py-1.5 lg:hidden">
                <div data-help="pos-customer">
                  <PosCustomerPicker openSignal={customerFocus} />
                </div>
              </div>
              {matrixProduct ? (
                <div className="min-h-0 flex-1 overflow-auto">
                  <Matrix
                    product={matrixProduct}
                    locationId={station().locationId}
                    onPick={(v) => addVariant(matrixProduct, v)}
                    onClose={() => setMatrixProduct(null)}
                  />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
                  <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(105px,1fr))]">
                    {!catalog.length ? (
                      <div className="col-span-full">
                        <EmptyState title="No products" hint={emptyHintFor("/pos")} />
                      </div>
                    ) : null}
                    {catalog.map((p) => {
                      const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || p.variants[0]?.imageUrl;
                      const price = Number(p.variants[0]?.price ?? 0);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => pickProduct(p)}
                          className="group flex min-h-[76px] flex-col overflow-hidden rounded-md border border-border/80 bg-card text-left transition-colors hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        >
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={fileUrl(img)} alt="" className="h-12 w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-12 w-full border-b border-border/60 bg-muted/40" />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-1.5 py-1">
                            <span className="truncate text-xs font-medium leading-tight">{p.name}</span>
                            <span className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                              <span className="truncate">{p.code}</span>
                              <span className="shrink-0 font-semibold tabular-nums text-foreground/80">
                                {moneyLabel(price)}
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                </div>
              )}
              <button
          type="button"
          data-help="pos-close-shift"
          className="mt-1.5 w-full text-[11px] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setCloseOpen(true)}
        >
          Close shift
        </button>
        <div
          data-help="pos-shortcuts"
          className="mt-1.5 border-t border-dashed pt-1.5 text-center text-[10px] text-muted-foreground"
        >
          F2 scan · F4 customer · F8 discount · F9 hold · F10 pay · ESC clear
        </div>
            </section>
            <aside className="hidden min-h-0 flex-col bg-background lg:flex">
              <div className="shrink-0 border-b border-border/60 p-1.5">
                <div data-help="pos-customer">
                  <PosCustomerPicker openSignal={customerFocus} />
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 px-1.5 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Cart{store.cart.length ? ` · ${store.cart.length}` : ""}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-1.5" data-help="pos-cart">
                  {store.cart.length ? (
                    cartMarkup(false)
                  ) : (
                    <p className="px-1 py-2 text-xs text-muted-foreground">Empty — scan or tap a product</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 border-t border-border/60 bg-background p-2">{posTotals()}</div>
            </aside>
          </div>
          <div className="shrink-0 border-t border-border/60 bg-background p-1.5 lg:hidden">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className={btnGhost + " h-12 shrink-0 px-3 tabular-nums"}
                onClick={() => (store.cart.length ? setCartOpen(true) : setHoldsOpen(true))}
              >
                {store.cart.length ? (
                  <>
                    {store.cart.length} item{store.cart.length === 1 ? "" : "s"}{" "}
                    <span className="text-[9px] -pb-6 font-normal text-muted-foreground">({totalUnits})</span>
                  </>
                ) : (
                  "Recall holds"
                )}
              </button>
              <button
                type="button"
                className={btnPrimary + " h-12 flex-1 text-base"}
                onClick={() => setPayOpen(true)}
                disabled={!store.cart.length}
              >
                {t.pay} {moneyLabel(cartTotal)}
              </button>
            </div>
            <div className="mt-1 flex items-center justify-center gap-3 border-t border-dashed pt-1">
              <button
                type="button"
                className="text-[11px] text-muted-foreground transition-colors hover:text-primary active:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setCloseOpen(true)}
              >
                Close shift
              </button>
              <span aria-hidden className="h-3 w-px bg-border" />
              <button
                type="button"
                className="text-[11px] text-muted-foreground transition-colors hover:text-primary active:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setShortcutsOpen(true)}
              >
                Shortcuts
              </button>
            </div>
          </div>
        </div>
      )}

      {payOpen ? (
        <Modal title={t.pay} onClose={() => setPayOpen(false)}>
          <div className="text-2xl font-semibold tabular-nums">{moneyLabel(cartTotal)}</div>
          {cartParts.tax > 0 ? (
            <p className="text-xs text-muted-foreground">
              Subtotal {moneyLabel(cartParts.subtotal)} · VAT {moneyLabel(cartParts.tax)}
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
            Paid {moneyLabel(paidNow)}
            {dueNow > 0 ? ` · Due ${moneyLabel(dueNow)}${store.customer ? "" : " (add customer)"}` : ""}
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
          zIndex={60}
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
      {cartOpen ? (
        <Modal title={`Cart${store.cart.length ? ` (${store.cart.length})` : ""}`} size="xl" onClose={() => setCartOpen(false)}>
          {store.cart.length ? (
            <div className="max-h-[52vh] overflow-y-auto">{cartMarkup(true)}</div>
          ) : (
            <p className="text-sm text-muted-foreground">Cart is empty.</p>
          )}
          <div className="mt-3">
            {posTotals(() => {
              setCartOpen(false);
              setPayOpen(true);
            })}
          </div>
        </Modal>
      ) : null}
      {shortcutsOpen ? (
        <Modal title="Keyboard shortcuts" size="sm" onClose={() => setShortcutsOpen(false)}>
          <ul className="space-y-1.5 text-sm">
            {[
              ["F2", "Focus scan / search"],
              ["F4", "Find or add customer"],
              ["F8", "Bill discount (with permission)"],
              ["F9", "Hold cart / recall holds"],
              ["F10", "Pay"],
              ["Ctrl+Enter", "Complete sale"],
              ["ESC", "Clear cart / close dialogs"],
            ].map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{label}</span>
                <kbd className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
                  {key}
                </kbd>
              </li>
            ))}
          </ul>
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
