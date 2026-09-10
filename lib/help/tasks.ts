import type { TaskGuide } from "./types";

export const HELP_TASKS: TaskGuide[] = [
  {
    id: "first-sale",
    title: "Complete a sale",
    blurb: "Open the till, scan items, take payment, print the bill.",
    permission: "sale.create",
    keywords: ["pos", "checkout", "pay", "scan", "f10"],
    steps: [
      { title: "Open a shift", body: "POS will not sell until the till is open. Pick the branch in the header if you work more than one shop.", href: "/pos" },
      { title: "Scan or tap products", body: "Focus the scan box with F2. Walk-in customers must pay in full. Add a customer (F4) if they will pay later." },
      { title: "Take payment", body: "F10 opens Pay. Split cash, card, and MFS. Ctrl+Enter completes. Hold with F9 if the customer steps away." },
      { title: "Print", body: "After the sale, print a thermal receipt or A4 invoice from the document buttons." },
    ],
  },
  {
    id: "add-product",
    title: "Add a product",
    blurb: "Category is required. Variants, brand, and opening stock are optional.",
    permission: "catalog.manage",
    keywords: ["sku", "catalog", "barcode", "variant"],
    steps: [
      { title: "Create a category if you need one", body: "Every product needs a category. Brand, unit, and attributes can wait.", href: "/categories", action: "open-create" },
      { title: "Add the product", body: "Name, code, price, and tax. Variable products get combinations from attributes.", href: "/products/new" },
      { title: "Print a barcode", body: "Shelf labels print from Products or the Barcode generator.", href: "/barcodes" },
    ],
  },
  {
    id: "receive-stock",
    title: "Receive stock",
    blurb: "Two paths: a purchase posts stock on save; a receiving document posts only when you Receive it.",
    permission: "inventory.receive.view",
    keywords: ["grn", "opening stock", "purchase", "draft"],
    steps: [
      { title: "Pick the path", body: "Supplier invoice in hand → Purchases (stock goes up on save). Opening stock, transfers, or a staged GRN → Receiving (draft first)." },
      { title: "Purchases", body: "Choose branch, supplier, SKU, qty, cost, and amount paid.", href: "/purchases", action: "open-create", permission: "purchase.manage" },
      { title: "Receiving", body: "Create a draft, check the lines, then post. Drafts do not change on-hand qty.", href: "/receiving", action: "open-create", permission: "inventory.receive.create" },
      { title: "Check stock", body: "Available, reserved, and damaged live on the Stock page.", href: "/inventory" },
    ],
  },
  {
    id: "record-return",
    title: "Record a return",
    blurb: "Start from the original invoice. Condition decides restock. Approve is not automatic.",
    permission: "sale.return",
    keywords: ["refund", "exchange", "restock"],
    steps: [
      { title: "Open the sale", body: "Find the ticket in Sales, then post a return or exchange from that invoice.", href: "/sales" },
      { title: "Set condition", body: "Good / resellable goes back to available. Damaged, defective, or expired follow the damage path — they are not a silent restock." },
      { title: "Approval", body: "Cashiers submit. A manager with return/refund approval posts the refund.", href: "/returns" },
    ],
  },
  {
    id: "invite-cashier",
    title: "Invite a cashier",
    blurb: "Employees are login users. Bind a branch so they only see that shop.",
    permission: "user.manage",
    keywords: ["employee", "user", "role", "staff"],
    steps: [
      { title: "Invite", body: "Name, email, temporary password, role = Cashier.", href: "/users", action: "open-create" },
      { title: "Branch", body: "Edit the user and assign the outlet. Owner-type memberships can use all branches." },
      { title: "Permissions", body: "Changing a role on Roles & Permissions updates every user with that role.", href: "/roles" },
    ],
  },
  {
    id: "close-the-day",
    title: "Close the day",
    blurb: "Count the till, close the shift, then lock the business date.",
    permission: "shift.close",
    keywords: ["shift", "till", "daily closing", "cash"],
    steps: [
      { title: "Close the shift", body: "From POS or Shift Management. Counted cash is optional but useful for variance.", href: "/pos" },
      { title: "Daily closing", body: "Managers lock the business date for the branch after the tills are in.", href: "/daily-closing", permission: "finance.view" },
    ],
  },
];

export function taskById(id: string) {
  return HELP_TASKS.find((t) => t.id === id);
}

export function visibleTasks(can: (p: string) => boolean) {
  return HELP_TASKS.filter((t) => !t.permission || can(t.permission));
}
