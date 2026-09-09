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
};

type Pay = { method: string; amount: string };

type Customer = { id: string; name: string; phone: string } | null;

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
  setLocale: (l: "en" | "bn") => void;
  setStation: (b: string, r: string, d: string) => void;
  addLine: (line: CartLine) => void;
  setQty: (variantId: string, qty: number) => void;
  setDiscount: (variantId: string, amount: string, reason?: string) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  setPayments: (p: Pay[]) => void;
  setLastSale: (id: string | null, invoice?: string | null) => void;
  setCustomer: (c: Customer) => void;
};

export const usePOSStore = create<POSState>((set) => ({
  locale: "en",
  branchId: null,
  registerId: null,
  deviceId: null,
  cart: [],
  payments: [],
  lastSaleId: null,
  lastInvoice: null,
  customer: null,
  setLocale: (locale) => set({ locale }),
  setStation: (branchId, registerId, deviceId) => set({ branchId, registerId, deviceId }),
  addLine: (line) =>
    set((s) => {
      const existing = s.cart.find((c) => c.variantId === line.variantId);
      if (existing) {
        return {
          cart: s.cart.map((c) =>
            c.variantId === line.variantId ? { ...c, qty: c.qty + line.qty } : c,
          ),
        };
      }
      return { cart: [...s.cart, line] };
    }),
  setQty: (variantId, qty) =>
    set((s) => ({
      cart: qty <= 0 ? s.cart.filter((c) => c.variantId !== variantId) : s.cart.map((c) => (c.variantId === variantId ? { ...c, qty } : c)),
    })),
  setDiscount: (variantId, amount, reason) =>
    set((s) => ({
      cart: s.cart.map((c) =>
        c.variantId === variantId ? { ...c, discountAmount: amount, discountReason: reason } : c,
      ),
    })),
  remove: (variantId) => set((s) => ({ cart: s.cart.filter((c) => c.variantId !== variantId) })),
  clear: () => set({ cart: [], payments: [], customer: null }),
  setPayments: (payments) => set({ payments }),
  setLastSale: (lastSaleId, lastInvoice = null) => set({ lastSaleId, lastInvoice }),
  setCustomer: (customer) => set({ customer }),
}));
