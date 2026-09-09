"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, downloadDocument, printDocument } from "@/lib/api";
import { usePOSStore } from "@/lib/pos-store";
import { dict } from "@/lib/i18n";
import { AppShell } from "@/components/app-shell";
import { useMe } from "@/lib/auth";
import { Modal, btnGhost, btnPrimary, inputClass } from "@/components/ui";
import { getApiErrorMessage, toastPos, toastWarn } from "@/lib/toast";

type Product = {
  id: string;
  name: string;
  code: string;
  variants: {
    id: string;
    sku: string;
    price: string;
    attributes: { option: { value: string; label: string; definition: { key: string } } }[];
    barcodes: { code: string; primary: boolean }[];
    stock: { locationId: string; quantity: string }[];
  }[];
};

type Held = { id: string; payload: { cart?: ReturnType<typeof usePOSStore.getState>["cart"]; customer?: { id: string; name: string; phone: string } | null } };
type Customer = { id: string; name: string; phone: string };

export default function PosPage() {
  const qc = useQueryClient();
  const scanRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [matrixProduct, setMatrixProduct] = useState<Product | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [mfs, setMfs] = useState("");
  const [phone, setPhone] = useState("");
  const [custName, setCustName] = useState("");
  const [discVariant, setDiscVariant] = useState<string | null>(null);
  const [discAmt, setDiscAmt] = useState("0");
  const store = usePOSStore();
  const t = dict[store.locale];
  const { me, can } = useMe();

  useEffect(() => {
    const b = me?.branches[0];
    const r = b?.registers[0];
    if (!b || !r) return;
    const deviceId = r.devices[0]?.hardwareId ?? `REG-${r.id}`;
    if (store.branchId !== b.id || store.registerId !== r.id || !store.deviceId) {
      store.setStation(b.id, r.id, deviceId);
    }
  }, [me, store]);

  const products = useQuery({
    queryKey: ["products", q],
    queryFn: () => api<Product[]>(`/api/v1/catalog/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });
  const shift = useQuery({
    queryKey: ["shift"],
    queryFn: () => api<{ id: string } | null>("/api/v1/shifts/current"),
  });
  const holds = useQuery({
    queryKey: ["holds"],
    queryFn: () => api<Held[]>("/api/v1/sales/holds/open"),
    enabled: holdsOpen,
  });

  function station() {
    const b = me?.branches[0];
    const r = b?.registers[0];
    return {
      branchId: store.branchId ?? b?.id ?? "",
      registerId: store.registerId ?? r?.id ?? "",
      deviceId: store.deviceId ?? r?.devices[0]?.hardwareId ?? (r ? `REG-${r.id}` : ""),
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
        cash ? { method: "CASH", amount: cash } : null,
        card ? { method: "CARD", amount: card } : null,
        mfs ? { method: "MFS", amount: mfs } : null,
      ].filter(Boolean) as { method: string; amount: string }[];
      if (!payments.length) throw new Error("Add cash, card, or MFS");
      return api<{ id: string; invoiceNumber: string }>("/api/v1/sales", {
        method: "POST",
        idempotencyKey: crypto.randomUUID(),
        body: JSON.stringify({
          branchId: station().branchId,
          registerId: station().registerId,
          deviceId: station().deviceId,
          clientTransactionId: crypto.randomUUID(),
          customerId: store.customer?.id,
          items: store.cart.map((c) => ({
            variantId: c.variantId,
            qty: c.qty,
            discountAmount: c.discountAmount || undefined,
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

  const lookupCustomer = useMutation({
    mutationFn: async () => {
      const found = await api<Customer | null>(`/api/v1/customers?phone=${encodeURIComponent(phone)}`);
      if (found) return found;
      if (!custName) throw new Error("Enter name to create customer");
      return api<Customer>("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({ name: custName, phone }),
      });
    },
    onSuccess: (c) => {
      if (!c) return toastWarn("Customer not found");
      store.setCustomer(c);
      setCustomerOpen(false);
      toastPos("success", `Customer ${c.name}`);
    },
    onError: (e) => toastPos("error", getApiErrorMessage(e, "Customer lookup failed")),
  });

  const cartTotal = useMemo(
    () => store.cart.reduce((n, l) => n + Number(l.unitPrice) * l.qty - Number(l.discountAmount || 0), 0),
    [store.cart],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        scanRef.current?.focus();
      }
      if (e.key === "F4") {
        e.preventDefault();
        setCustomerOpen(true);
      }
      if (e.key === "F8") {
        e.preventDefault();
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
        store.clear();
        setPayOpen(false);
        setCustomerOpen(false);
        setDiscountOpen(false);
        setHoldsOpen(false);
      }
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        if (store.cart.length) pay.mutate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, hold, pay]);

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
      if (hit) setMatrixProduct(hit);
      else toastPos("info", "No product match");
    }
  }

  function addVariant(product: Product, v: Product["variants"][0]) {
    const colour = v.attributes.find((a) => a.option.definition.key === "colour")?.option.label ?? "";
    const size = v.attributes.find((a) => a.option.definition.key === "size")?.option.label ?? "";
    store.addLine({
      variantId: v.id,
      productId: product.id,
      name: product.name,
      variantLabel: `${colour} / ${size}`.replace(/^ \/ | \/ $/g, ""),
      sku: v.sku,
      unitPrice: String(v.price),
      qty: 1,
      discountAmount: "0",
    });
    setMatrixProduct(null);
    scanRef.current?.focus();
  }

  async function onPrint(kind: "bill" | "invoice", mode: "print" | "download") {
    if (!store.lastSaleId) return toastWarn("No last sale");
    try {
      if (mode === "print") await printDocument(store.lastSaleId, kind);
      else await downloadDocument(store.lastSaleId, kind);
      toastPos("success", mode === "print" ? "Sent to printer" : "Download started");
    } catch (e) {
      toastPos("error", getApiErrorMessage(e, "Document failed"));
    }
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
            {me?.branches[0]?.name ?? "No branch"} · {me?.branches[0]?.registers[0]?.name ?? "No register"}
          </p>
          <button
            className={btnPrimary + " h-12 px-6"}
            type="button"
            disabled={openShift.isPending || !station().branchId || !station().registerId}
            onClick={() => openShift.mutate()}
          >
            {openShift.isPending ? "Opening…" : "Open shift"}
          </button>
        </div>
      ) : (
        <div className="grid h-[calc(100vh-4rem)] grid-cols-1 overflow-hidden lg:grid-cols-[1fr_360px]">
          <section className="flex min-h-0 flex-col border-r bg-card">
            <form onSubmit={onScan} className="border-b p-2">
              <input
                ref={scanRef}
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`${t.search}  (F2)`}
                className={inputClass + " h-12"}
              />
            </form>
            {matrixProduct ? (
              <Matrix product={matrixProduct} onPick={(v) => addVariant(matrixProduct, v)} onClose={() => setMatrixProduct(null)} />
            ) : (
              <div className="grid grid-cols-2 gap-2 overflow-auto p-2 sm:grid-cols-3">
                {(products.data ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setMatrixProduct(p)}
                    className="min-h-[80px] rounded-lg border p-3 text-left transition-all hover:shadow-md hover:border-primary"
                  >
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.code}</div>
                  </button>
                ))}
              </div>
            )}
          </section>
          <aside className="flex min-h-0 flex-col bg-background">
            <div className="flex-1 overflow-auto p-2">
              {store.customer ? (
                <div className="mb-2 rounded-md border bg-card px-2 py-1 text-xs shadow-sm">
                  {store.customer.name} · {store.customer.phone}
                </div>
              ) : null}
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
            <div className="border-t bg-card p-3 shadow-sm">
              <div className="flex justify-between text-sm">
                <span>{t.total}</span>
                <span className="text-xl font-semibold tabular-nums">৳ {cartTotal.toFixed(2)}</span>
              </div>
              {store.lastSaleId ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={btnGhost} onClick={() => onPrint("bill", "print")}>
                    {t.printBill}
                  </button>
                  <button type="button" className={btnGhost} onClick={() => onPrint("invoice", "print")}>
                    {t.printInvoice}
                  </button>
                  <button type="button" className={btnGhost + " col-span-2"} onClick={() => onPrint("invoice", "download")}>
                    {t.downloadPdf}
                  </button>
                </div>
              ) : null}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" className={btnGhost} onClick={() => (store.cart.length ? hold.mutate() : setHoldsOpen(true))}>
                  {t.hold} (F9)
                </button>
                <button type="button" className={btnPrimary} onClick={() => setPayOpen(true)} disabled={!store.cart.length}>
                  {t.pay} (F10)
                </button>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">F4 customer · F8 discount · Ctrl+Enter complete · ESC clear</div>
            </div>
          </aside>
        </div>
      )}

      {payOpen ? (
        <Modal title={t.pay} onClose={() => setPayOpen(false)}>
          <div className="text-2xl tabular-nums">৳ {cartTotal.toFixed(2)}</div>
          <label className="mt-3 block text-sm">Cash</label>
          <input className={inputClass + " mt-1"} value={cash} onChange={(e) => setCash(e.target.value)} />
          <label className="mt-2 block text-sm">Card</label>
          <input className={inputClass + " mt-1"} value={card} onChange={(e) => setCard(e.target.value)} />
          <label className="mt-2 block text-sm">MFS</label>
          <input className={inputClass + " mt-1"} value={mfs} onChange={(e) => setMfs(e.target.value)} />
          <div className="mt-3 flex gap-2">
            <button type="button" className={btnGhost + " flex-1"} onClick={() => setPayOpen(false)}>
              Cancel
            </button>
            <button type="button" className={btnPrimary + " flex-1"} onClick={() => pay.mutate()} disabled={pay.isPending}>
              Complete
            </button>
          </div>
        </Modal>
      ) : null}

      {customerOpen ? (
        <Modal title="Customer (F4)" onClose={() => setCustomerOpen(false)}>
          <input className={inputClass} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={inputClass + " mt-2"} placeholder="Name if new" value={custName} onChange={(e) => setCustName(e.target.value)} />
          <button type="button" className={btnPrimary + " mt-3 w-full"} onClick={() => lookupCustomer.mutate()}>
            Apply
          </button>
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
    </AppShell>
  );
}

function Matrix({
  product,
  onPick,
  onClose,
}: {
  product: Product;
  onPick: (v: Product["variants"][0]) => void;
  onClose: () => void;
}) {
  const colours = [
    ...new Set(product.variants.map((v) => v.attributes.find((a) => a.option.definition.key === "colour")?.option.value).filter(Boolean)),
  ] as string[];
  const sizes = [
    ...new Set(product.variants.map((v) => v.attributes.find((a) => a.option.definition.key === "size")?.option.value).filter(Boolean)),
  ] as string[];
  function cell(c: string, s: string) {
    return product.variants.find((v) => {
      const col = v.attributes.find((a) => a.option.definition.key === "colour")?.option.value;
      const sz = v.attributes.find((a) => a.option.definition.key === "size")?.option.value;
      return col === c && sz === s;
    });
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
                const qty = v ? Number(v.stock[0]?.quantity ?? 0) : 0;
                return (
                  <td key={s} className="p-1">
                    <button
                      type="button"
                      disabled={!v || qty <= 0}
                      onClick={() => v && onPick(v)}
                      className={`h-12 w-full rounded-lg border ${!v || qty <= 0 ? "bg-muted text-muted-foreground" : "bg-card hover:border-primary"}`}
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
