import type { HelpTour } from "./types";

export const HELP_TOURS: HelpTour[] = [
  {
    id: "cashier-pos",
    title: "Run the register",
    roles: ["CASHIER"],
    steps: [
      { selector: "[data-help='pos-open-shift']", href: "/pos", title: "Open the shift", body: "Nothing sells until the till is open. If this button is disabled, pick a branch in the header first." },
      { selector: "[data-help='pos-scan']", href: "/pos", title: "Scan (F2)", body: "Type a barcode or name here. F2 always returns focus to this box." },
      { selector: "[data-help='pos-customer']", href: "/pos", title: "Customer (F4)", body: "Walk-in must pay in full. Look up or add a customer when they will take due." },
      { selector: "[data-help='pos-pay']", href: "/pos", title: "Pay (F10)", body: "Split cash, card, and MFS. Ctrl+Enter completes. Hold with F9 if they step away." },
      { selector: "[data-help='pos-shortcuts']", href: "/pos", title: "Shortcuts", body: "F8 discount (if allowed), Esc clears the cart. This strip stays on the till — no second cheat sheet." },
      { selector: "[data-help='pos-close-shift']", href: "/pos", title: "Close shift", body: "Lock the till when you leave. Counted cash is optional." },
    ],
  },
  {
    id: "manager-ops",
    title: "Run the outlet",
    roles: ["OUTLET_MANAGER"],
    steps: [
      { selector: "[data-help='dash-period']", href: "/dashboard", title: "Dashboard", body: "Today vs week vs month. Branch in the header filters these numbers." },
      { selector: "[data-help='recv-new']", href: "/receiving", title: "Receiving", body: "A draft does not raise stock. Only Receive/post does. Purchases are the other path — they post stock on save." },
      { selector: "[data-help='page-header']", href: "/inventory", title: "Stock", body: "Available is what POS can sell. Adjust, transfer, and stock take live here." },
      { selector: "[data-help='pos-scan']", href: "/pos", title: "POS", body: "Same register the cashier uses. Open a shift if you need to sell or test." },
      { selector: "[data-help='page-header']", href: "/reports", title: "Reports", body: "Sales, stock, dues, and cashier mix. Open a card — these are live tenant figures." },
    ],
  },
  {
    id: "owner-setup",
    title: "Set up the shop",
    roles: ["TENANT_OWNER"],
    steps: [
      { selector: "[data-help='dash-period']", href: "/dashboard", title: "Dashboard", body: "Once sales start, this is the home screen. First week: finish setup below." },
      { selector: "[data-help='page-header']", href: "/organization", title: "Business profile", body: "Legal name and logo print on invoices and receipts." },
      { selector: "[data-help='page-header']", href: "/branches", title: "Branches", body: "Each outlet needs a branch (and usually a warehouse/location) before stock and POS work." },
      { selector: "[data-help='page-header']", href: "/products", title: "Products", body: "Category is required. Add a few SKUs so the register has something to scan." },
      { selector: "[data-help='recv-new']", href: "/receiving", title: "Opening stock", body: "Use Receiving with kind Opening, or a Purchase if a supplier invoice is in hand." },
      { selector: "[data-help='page-header']", href: "/users", title: "Invite staff", body: "Invite a cashier, bind their branch, then run a test sale on POS." },
      { selector: "[data-help='pos-scan']", href: "/pos", title: "Test sale", body: "Open a shift, scan, pay. Then come back to the dashboard." },
    ],
  },
  {
    id: "platform-saas",
    title: "Platform controls",
    roles: ["PLATFORM_SUPER_ADMIN"],
    steps: [
      { selector: "[data-help='page-header']", href: "/users", title: "Users across tenants", body: "Platform can invite anyone, including tenant owners. The Business column shows which shop they belong to." },
      { selector: "[data-help='page-header']", href: "/roles", title: "Roles", body: "Only platform assigns Platform super admin. Do not use this login for daily counter work." },
      { selector: "[data-help='page-header']", href: "/subscription", title: "Plans", body: "Tenant billing and limits live here when you need them — not on the register." },
    ],
  },
];

export function tourById(id: string) {
  return HELP_TOURS.find((t) => t.id === id);
}

export function tourForRoles(roles: string[]) {
  const set = new Set(roles);
  if (set.has("PLATFORM_SUPER_ADMIN")) return tourById("platform-saas");
  if (set.has("TENANT_OWNER")) return tourById("owner-setup");
  if (set.has("OUTLET_MANAGER")) return tourById("manager-ops");
  if (set.has("CASHIER")) return tourById("cashier-pos");
  return undefined;
}
