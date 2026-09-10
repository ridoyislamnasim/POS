import { create } from "zustand";

export type CartLine = {
  variantId: string;
  productId: string;
  name: string;
  variantLabel: string;
  sku: string;
  barcode?: string;
  unitPrice: string;
  qty: number;
  discountAmount: string;
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
  setLocale: (l: "en" | "bn") => void;
  setStation: (b: string, r: string, d: string) => void;
  addLine: (line: CartLine) => void;
  setQty: (variantId: string, qty: number) => void;
  setDiscount: (variantId: string, amount: string, reason?: string) => void;
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
  setLocale: (locale) => set({ locale }),
  setStation: (branchId, registerId, deviceId) => {
    if (typeof window !== "undefined") window.localStorage.setItem("pos_active_branch_id", branchId);
    set({ branchId, registerId, deviceId });
  },
  addLine: (line) =>
    set((s) => {
      const existing = s.cart.find((c) => c.variantId === line.variantId);
      if (existing) {
        return {
          checkoutKey: null,
          cart: s.cart.map((c) =>
            c.variantId === line.variantId ? { ...c, qty: c.qty + line.qty } : c,
          ),
        };
      }
      return { checkoutKey: null, cart: [...s.cart, line] };
    }),
  setQty: (variantId, qty) =>
    set((s) => ({
      checkoutKey: null,
      cart: qty <= 0 ? s.cart.filter((c) => c.variantId !== variantId) : s.cart.map((c) => (c.variantId === variantId ? { ...c, qty } : c)),
    })),
  setDiscount: (variantId, amount, reason) =>
    set((s) => ({
      checkoutKey: null,
      cart: s.cart.map((c) =>
        c.variantId === variantId ? { ...c, discountAmount: amount, discountReason: reason } : c,
      ),
    })),
  remove: (variantId) => set((s) => ({ checkoutKey: null, cart: s.cart.filter((c) => c.variantId !== variantId) })),
  clear: () => set({ cart: [], payments: [], customer: null, checkoutKey: null }),
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
