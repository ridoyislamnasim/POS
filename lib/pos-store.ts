import { create } from "zustand";

export type DiscountType = "flat" | "percent";

export type CartLine = {
  variantId: string;
  productId: string;
  name: string;
  variantLabel: string;
  sku: string;
  barcode?: string;
  unitPrice: string;
  qty: number;
  discountType: DiscountType;
  discountAmount: string;
  discountPercent: string;
  discountReason?: string;
  taxRate?: string;
};

type Pay = { method: string; amount: string };

export type PosCustomer = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  creditDue?: string | number | null;
} | null;

type Customer = PosCustomer;

type POSState = {
  locale: "en" | "bn";
  branchId: string | null;
  registerId: string | null;
  deviceId: string | null;
  cart: CartLine[];
  payments: Pay[];
  lastSaleId: string | null;
  lastInvoice: string | null;
  customer: Customer;
  checkoutKey: string | null;
  txDiscountType: DiscountType;
  txDiscountAmount: string;
  txDiscountPercent: string;
  txDiscountReason?: string;
  setLocale: (l: "en" | "bn") => void;
  setStation: (b: string, r: string, d: string) => void;
  addLine: (line: CartLine) => void;
  setQty: (variantId: string, qty: number) => void;
  setDiscount: (variantId: string, type: DiscountType, value: string, reason?: string) => void;
  setTxDiscount: (type: DiscountType, value: string, reason?: string) => void;
  clearTxDiscount: () => void;
  remove: (variantId: string) => void;
  clear: () => void;
  beginCheckout: () => string;
  setPayments: (p: Pay[]) => void;
  setLastSale: (id: string | null, invoice?: string | null) => void;
  setCustomer: (c: Customer) => void;
};

export const usePOSStore = create<POSState>((set, get) => ({
  locale: "en",
  branchId: null,
  registerId: null,
  deviceId: null,
  cart: [],
  payments: [],
  lastSaleId: null,
  lastInvoice: null,
  customer: null,
  checkoutKey: null,
  txDiscountType: "flat",
  txDiscountAmount: "0",
  txDiscountPercent: "0",
  txDiscountReason: undefined,
  setLocale: (locale) => set({ locale }),
  setStation: (branchId, registerId, deviceId) => {
    if (typeof window !== "undefined") window.localStorage.setItem("pos_active_branch_id", branchId);
    set({ branchId, registerId, deviceId });
  },
  addLine: (line) =>
    set((s) => {
      const existing = s.cart.find((c) => c.variantId === line.variantId);
      const norm: CartLine = {
        ...line,
        discountType: line.discountType ?? "flat",
        discountAmount: line.discountAmount ?? "0",
        discountPercent: line.discountPercent ?? "0",
      };
      if (existing) {
        return {
          checkoutKey: null,
          cart: s.cart.map((c) =>
            c.variantId === line.variantId ? { ...c, qty: c.qty + norm.qty } : c,
          ),
        };
      }
      return { checkoutKey: null, cart: [...s.cart, norm] };
    }),
  setQty: (variantId, qty) =>
    set((s) => ({
      checkoutKey: null,
      cart: qty <= 0 ? s.cart.filter((c) => c.variantId !== variantId) : s.cart.map((c) => (c.variantId === variantId ? { ...c, qty } : c)),
    })),
  setDiscount: (variantId, type, value, reason) =>
    set((s) => ({
      checkoutKey: null,
      cart: s.cart.map((c) =>
        c.variantId === variantId
          ? {
              ...c,
              discountType: type,
              discountAmount: type === "flat" ? value : "0",
              discountPercent: type === "percent" ? value : "0",
              discountReason: reason ?? c.discountReason,
            }
          : c,
      ),
    })),
  setTxDiscount: (type, value, reason) =>
    set({
      checkoutKey: null,
      txDiscountType: type,
      txDiscountAmount: type === "flat" ? value : "0",
      txDiscountPercent: type === "percent" ? value : "0",
      txDiscountReason: reason,
    }),
  clearTxDiscount: () =>
    set({
      checkoutKey: null,
      txDiscountType: "flat",
      txDiscountAmount: "0",
      txDiscountPercent: "0",
      txDiscountReason: undefined,
    }),
  remove: (variantId) => set((s) => ({ checkoutKey: null, cart: s.cart.filter((c) => c.variantId !== variantId) })),
  clear: () => set({ cart: [], payments: [], customer: null, checkoutKey: null, txDiscountType: "flat", txDiscountAmount: "0", txDiscountPercent: "0", txDiscountReason: undefined }),
  beginCheckout: () => {
    const current = get().checkoutKey;
    if (current) return current;
    const checkoutKey = crypto.randomUUID();
    set({ checkoutKey });
    return checkoutKey;
  },
  setPayments: (payments) => set({ payments }),
  setLastSale: (lastSaleId, lastInvoice = null) => set({ lastSaleId, lastInvoice }),
  setCustomer: (customer) => set({ customer }),
}));
