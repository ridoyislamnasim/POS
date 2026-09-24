import { NAV_GROUPS, PAGE_TITLES } from "@/lib/nav-config";
import type { HelpLink, HelpPage } from "./types";

type Draft = {
  href: string;
  blurb: string;
  canDo: string[];
  next?: HelpLink[];
  tasks?: string[];
  emptyHint?: string;
  keywords?: string[];
  title?: string;
  group?: string;
  permission?: string | null;
};

const GROUP_FOR = new Map<string, { group: string; permission: string | null }>();
for (const g of NAV_GROUPS) {
  for (const i of g.items) {
    GROUP_FOR.set(i.href, { group: g.title, permission: i.permission });
  }
}

export const GROUP_BLURBS: Record<string, string> = {
  Overview: "Today’s sales, stock, and till mix.",
  Billing: "Your plan, platform bills, and receipts.",
  Sell: "Checkout, tickets, returns, and orders.",
  "Sales & Finance": "Buy stock, pay bills, dues, and close the day.",
  "Customer & Supplier": "People you sell to and buy from.",
  Catalog: "Products, categories, and barcodes.",
  Inventory: "On-hand qty, receiving, damage, ledger.",
  "Staff & Security": "Logins, roles, shifts, and audit.",
  Reports: "Live figures — not sample data.",
  Commerce: "Online orders, delivery, alerts.",
  Platform: "Tenant billing, invoices, and API access.",
  Organization: "Business profile, branches, billing.",
  Settings: "Tax, printers, import, theme.",
  Help: "Guides, search, and what your role can do.",
};

function meta(href: string) {
  const nav = GROUP_FOR.get(href);
  const titles = PAGE_TITLES[href];
  return {
    group: nav?.group ?? "POS",
    permission: nav?.permission ?? null,
    title: titles?.title ?? href,
  };
}

function page(d: Draft): HelpPage {
  const m = meta(d.href);
  return {
    href: d.href,
    group: d.group ?? m.group,
    permission: d.permission !== undefined ? d.permission : m.permission,
    title: d.title ?? m.title,
    blurb: d.blurb,
    canDo: d.canDo,
    next: d.next ?? [],
    tasks: d.tasks ?? [],
    emptyHint: d.emptyHint,
    keywords: d.keywords ?? [],
  };
}

const DRAFTS: Draft[] = [
  {
    href: "/dashboard",
    blurb: "Live sales, stock, and register performance.",
    canDo: ["Read today’s mix", "Switch period and branch", "Jump into a sale or low-stock row"],
    next: [
      { href: "/pos", label: "Open POS", permission: "sale.create" },
      { href: "/reports", label: "All reports", permission: "report.view" },
    ],
    keywords: ["kpi", "today"],
  },
  {
    href: "/pos",
    blurb: "Scan, take payment, hold carts, close the till.",
    canDo: [
      "Open a shift before selling",
      "Scan (F2), customer (F4), discount (F8), hold (F9), pay (F10)",
      "Walk-in pays in full — add a customer for due",
      "Print the last receipt",
    ],
    next: [
      { href: "/sales", label: "Today’s tickets", permission: "sale.view" },
      { href: "/shifts", label: "Shift list", permission: "shift.manage" },
    ],
    tasks: ["first-sale", "close-the-day"],
    emptyHint: "No products yet — a manager must add items to the catalogue.",
    keywords: ["register", "till", "barcode", "f2", "f10"],
  },
  {
    href: "/sales",
    blurb: "Tickets from this tenant. Open an invoice to return, refund, exchange, or void.",
    canDo: ["Search invoices", "Open a ticket for print or return", "Void if you have permission"],
    next: [
      { href: "/pos", label: "New sale", permission: "sale.create" },
      { href: "/returns", label: "Returns queue", permission: "sale.view" },
    ],
    tasks: ["record-return"],
    emptyHint: "Completed tickets from POS appear here.",
    keywords: ["invoice", "void"],
  },
  {
    href: "/returns",
    blurb: "A return is not an automatic restock. Condition decides available, damaged, or quarantine.",
    canDo: ["Review submitted returns", "Approve or reject if allowed", "Track refund status"],
    next: [
      { href: "/sales", label: "Find the invoice", permission: "sale.view" },
      { href: "/damage", label: "Damage", permission: "inventory.damage.view" },
    ],
    tasks: ["record-return"],
    emptyHint: "Open a completed sale and post a return from the original invoice.",
    keywords: ["refund", "exchange"],
  },
  {
    href: "/orders",
    blurb: "Confirm orders before they hit the register.",
    canDo: ["Create a sales order", "Confirm or cancel", "Hand off to POS when ready"],
    next: [{ href: "/pos", label: "POS", permission: "sale.create" }],
    emptyHint: "Create an order to confirm it before the register.",
    keywords: ["so", "confirm"],
  },
  {
    href: "/purchases",
    blurb: "Goods received — stock is increased on save. Pay supplier per GRN (partial/full) or as advance; WAC updates variant-wise.",
    canDo: [
      "Receive a supplier invoice → pick exact variant (never parent product), set Qty / Unit Cost / Discount / Tax; WAC preview auto-shows",
      "Pay per GRN: Pay button shows due amount (e.g. Pay ৳1,200) — partial or full; supplier creditDue and purchase paid/due update together",
      "Return: create a purchase return for a line — stock leaves and supplier due reduced if that GRN still had due",
      "Print / SMS per GRN: Print icon (receipt/invoice/PDF) and SMS icon; overflow (⋯) groups them on mobile",
      "Understand pricing: Retail → Selling via discount, WAC drives costing (see formulas below)",
    ],
    next: [
      { href: "/purchases/new", label: "Receive purchase (WAC + pay)", permission: "purchase.manage" },
      { href: "/purchase-orders", label: "Purchase orders", permission: "purchase.view" },
      { href: "/suppliers", label: "Suppliers & dues", permission: "supplier.view" },
    ],
    tasks: ["receive-stock"],
    emptyHint: "Receive goods here to add stock immediately, or use Receiving if you need a draft first.",
    keywords: ["grn", "supplier", "pay", "due", "wac", "average cost", "advance"],
  },
  {
    href: "/purchases/new",
    blurb: "Receive stock variant-wise: enter supplier cost, see new WAC and profit before you save. Selling price never auto-overwritten.",
    canDo: [
      "Step 1: pick Branch / Supplier (and PO if any) → prefilled remaining qty",
      "Step 2: pick variant via search/scan → Unit Cost defaults to current WAC (variant.cost); Retail/Wholesale prefilled from variant",
      "Step 3: edit Received Qty, Unit Cost (actual paid per pc), optional Retail/Wholesale (only these update selling); Tax/Discount are line-level for this receipt",
      "Step 4: read WAC strip per line: Now WAC · Stock pcs → New WAC, Stock after, ↑/↓ cost badge, Selling (Retail - discount), Profit/Margin = Selling - New WAC",
      "Formulas: New WAC = (oldQty × oldWAC + incomingQty × unitCost) / (oldQty + incomingQty); Selling = Retail − (Retail × Discount / 100); Profit = Selling − New WAC; Margin = Profit / Selling × 100",
      "Variant-isolated: receiving Red/M never changes Red/L cost; other variants show Cost = WAC ref · variant-isolated",
      "Save creates Purchase + StockMovement (PURCHASE) + auto-sync ProductVariant.cost = Stock.unitCost (and Product.purchasePrice for SIMPLE); document via Receiving",
    ],
    next: [
      { href: "/purchases", label: "GRN list & Pay", permission: "purchase.view" },
      { href: "/suppliers", label: "Pay supplier", permission: "supplier.view" },
      { href: "/inventory", label: "See Stock.unitCost", permission: "inventory.view" },
    ],
    tasks: ["receive-stock"],
    emptyHint: "Add at least one variant — qty>0, then Save. PO lines show Ordered / Prev / Rem / PO cost to avoid over-receiving.",
    keywords: ["receive", "wac", "unit cost", "retail", "wholesale", "discount", "selling", "profit", "variant"],
  },
  {
    href: "/purchase-orders",
    blurb: "Send orders to suppliers, then receive as a purchase.",
    canDo: ["Create a PO", "Cancel an open PO", "Print the order"],
    next: [{ href: "/purchases", label: "Receive as purchase", permission: "purchase.manage" }],
    tasks: ["receive-stock"],
    emptyHint: "Create a PO, then receive it as a purchase.",
    keywords: ["po"],
  },
  {
    href: "/expenses",
    blurb: "Posted operating expenses by category and branch.",
    canDo: ["Add rent, utilities, and other costs", "Filter by date and status"],
    next: [
      { href: "/profit-loss", label: "P&L", permission: "report.finance" },
      { href: "/cash-flow", label: "Cash flow", permission: "finance.view" },
    ],
    emptyHint: "Add the first expense to start tracking operating costs.",
    keywords: ["opex"],
  },
  {
    href: "/income",
    blurb: "Other income that is not a POS ticket.",
    canDo: ["Record non-sale income", "Filter by date"],
    next: [{ href: "/cash-flow", label: "Cash flow", permission: "finance.view" }],
    emptyHint: "Use this for income that is not a sale ticket.",
    keywords: ["other income"],
  },
  {
    href: "/dues/customers",
    blurb: "Who still owes you.",
    canDo: ["See credit balances", "Open the customer to take a payment"],
    next: [
      { href: "/payments", label: "Record a payment", permission: "payment.manage" },
      { href: "/customers", label: "Customers", permission: "customer.view" },
    ],
    emptyHint: "Customer credit appears after a partial POS payment.",
    keywords: ["credit", "receivable"],
  },
  {
    href: "/dues/suppliers",
    blurb: "What you still owe suppliers.",
    canDo: ["See payables", "Jump to a supplier or payment"],
    next: [
      { href: "/payments", label: "Pay a supplier", permission: "payment.manage" },
      { href: "/suppliers", label: "Suppliers", permission: "supplier.view" },
    ],
    emptyHint: "Supplier dues appear when a purchase is not fully paid.",
    keywords: ["payable"],
  },
  {
    href: "/payments",
    blurb: "Money in (customer) or out (supplier) — with or without linking a sale/purchase. Link for per-document settle, no link for advance/prepay.",
    canDo: [
      "SUPPLIER OUT without purchaseId = advance (supplier creditDue may go negative); OUT with purchaseId = settle that GRN (partial/full) — capped to due, excess stays as advance",
      "CUSTOMER IN without saleId = unallocated receipt; IN with saleId = settle that invoice — capped to sale due",
      "Formulas: SALE settle pay → sale.paid += min(amount, sale.due); sale.due = max(sale.due − amount,0); customer creditDue = max(creditDue − amount,0). SUPPLIER OUT → purchase.paid += min(amount,purchase.due); purchase.due = max(...,0); supplier creditDue ← creditDue − amount (may be −ve for advance)",
      "Advance example: supplier due 0 → OUT 500 advance → creditDue −500 → next purchase 1000 due → new creditDue 500 (offset)",
      "Required: partyType, partyId, direction, amount>0; optional method/reference/notes/branchId/saleId/purchaseId; businessDate = ctx.businessDate",
    ],
    next: [
      { href: "/suppliers", label: "Pay supplier (per GRN or advance)", permission: "supplier.view" },
      { href: "/purchases", label: "Pay per GRN list", permission: "purchase.view" },
      { href: "/dues/suppliers", label: "Supplier dues", permission: "finance.view" },
    ],
    emptyHint: "Pick party = Supplier + OUT + Amount for advance, or add purchaseId to settle a specific GRN. Use supplier detail for guided pay with due preview.",
    keywords: ["receipt", "disbursement", "advance", "prepay", "supplier", "customer", "purchaseId", "saleId"],
  },
  {
    href: "/cash-flow",
    blurb: "Actual money movement for the selected range — Summary cards or Charts. Return ≠ refund: refunds are separate cash-outs from PaymentTransaction.",
    canDo: [
      "Toggle [Summary] vs [Charts] near date filters — same From→To range: Summary = Total Inflow/Outflow/Net + Money In/Out cards; Charts = Trend + Breakdowns + Method bars",
      "Date presets: Today / Yesterday / This Week / This Month / Custom (From→To). Trend is one point per day; single-day shows daily totals. Reuses GET /api/v1/finance/cash-flow?from=&to=",
      "Money In = Sales Collected (PaymentTransaction CAPTURED) + Dues Collected (Ledger IN) + Other Income. Money Out = Expenses (POSTED) + Supplier Paid (Ledger OUT) + Refunds (REFUNDED/PARTIALLY_REFUNDED) — never subtract returns from Sale.total",
      "Refunds are separate: Sale 10k + refund 3k = net +7k. Return without refund = no outflow. Refund method (Cash/Card/bKash/Nagad) preserved and grouped by actual refund payment",
      "Charts: Trend (Inflow emerald / Outflow rose / Net sky), Money In donut (Sales/Dues/Income), Money Out donut (Expenses/Supplier/Refunds), Method bar (Money In vs Out per method) — tooltips show exact ৳ values",
      "Branch-scoped + businessDate filtered; Ledger payments and sales branch-filtered, refunds via SaleReturn proxy (see daily closing for EOD lock)",
    ],
    next: [
      { href: "/daily-closing", label: "Daily closing", permission: "finance.view" },
      { href: "/profit-loss", label: "P&L (revenue vs profit)", permission: "report.finance" },
    ],
    keywords: ["cash", "charts", "trend", "breakdown", "method", "refunds", "inflow", "outflow", "net"],
  },
  {
    href: "/profit-loss",
    blurb: "Revenue, COGS (frozen per-sale unitCost), expenses, and net for selected business date. Historical P&L never mutates when WAC later changes.",
    canDo: [
      "Formulas: COGS (new) = Σ SaleItem.qty × SaleItem.unitCost (snapshot from locked Stock.unitCost at sale time); legacy rows fallback to variant.cost; grossProfit = revenue − netCogs; netProfit = grossProfit + otherIncome − expenses",
      "Sale snapshot: sale.unitCost locked before stock deduction (FOR UPDATE) so concurrent sales never share stale cost",
      "WAC reference only for current stock valuation — P&L prefers frozen cost",
    ],
    next: [
      { href: "/reports/profit", label: "Profit report", permission: "report.finance" },
      { href: "/inventory/movements", label: "Movements", permission: "inventory.ledger.view" },
    ],
    keywords: ["pnl", "cogs", "unitCost", "wac", "frozen cost", "margin"],
  },
  {
    href: "/daily-closing",
    blurb: "Count cash and lock the business date for a branch.",
    canDo: ["Enter counted cash", "Close the date after tills are in"],
    tasks: ["close-the-day"],
    next: [{ href: "/shifts", label: "Shifts", permission: "shift.manage" }],
    emptyHint: "Close the tills first, then lock the business date here.",
    keywords: ["eod"],
  },
  {
    href: "/customers",
    blurb: "Profiles, credit, and loyalty live on each customer record.",
    canDo: ["Add a customer", "Open history, due, and points", "POS can also add a customer at checkout"],
    next: [
      { href: "/loyalty", label: "Loyalty", permission: "loyalty.manage" },
      { href: "/dues/customers", label: "Dues", permission: "finance.view" },
    ],
    emptyHint: "Add a customer, or create one from POS when they buy on due.",
    keywords: ["crm", "phone"],
  },
  {
    href: "/loyalty",
    blurb: "Open a customer to earn, redeem, or adjust points.",
    canDo: ["See balances", "Adjust points on the customer page"],
    next: [{ href: "/customers", label: "Customers", permission: "customer.view" }],
    emptyHint: "Loyalty balances appear after points are earned.",
    keywords: ["points"],
  },
  {
    href: "/suppliers",
    blurb: "Vendors you buy from. Pay per GRN (partial/full) or advance without a purchase — advance becomes negative due and offsets next purchase.",
    canDo: [
      "Supplier detail (/suppliers/[id]): see creditDue, purchase history (GRN/Total/Due/Status) with Pay per row (Pay shows due amount) and supplier payments list",
      "Pay per GRN: amount defaults to purchase due; enter smaller amount for partial — purchase paid/due and supplier creditDue decrease together; Pay disabled when due ≤0",
      "Advance Pay (header button): pay without picking a GRN — supplier creditDue may go negative (prepayment); next purchase GRN automatically offsets: nextDue = oldCreditDue + newGRN.due",
      "Formulas: After pay(purchase): paid += min(amount, oldDue); due = max(oldDue − amount, 0); creditDue ← creditDue − amount. Advance: creditDue ← creditDue − advanceAmount (may become −ve). On next purchase: creditDue ← creditDue + newTotal−paidAmt",
      "From Payments page you can also OUT to a SUPPLIER without purchaseId for advance — same negative-due logic; capped apply for purchase-linked pays",
      "Variant-isolation still applies to stock — supplier pay never touches stock qty, only dues",
    ],
    next: [
      { href: "/purchases", label: "Pay per GRN", permission: "purchase.view" },
      { href: "/payments", label: "Record OUT to supplier", permission: "payment.manage" },
      { href: "/dues/suppliers", label: "Supplier due", permission: "finance.view" },
    ],
    emptyHint: "Add a supplier before recording a purchase. Advance pay works even before the first purchase.",
    keywords: ["vendor", "supplier", "pay", "due", "advance", "creditDue", "grn"],
  },
  {
    href: "/products",
    blurb: "Catalogue, variants, pricing, and archive. Cost = WAC ref (synced from Stock), Selling = derived, variant-isolated.",
    canDo: [
      "Add or edit a product → SIMPLE needs header Cost/Retail/Wholesale; VARIABLE carries pricing per variant",
      "Pricing fields: Cost (synced from Stock.unitCost / WAC) — edit before any stock, afterwards auto-synced on purchase receive; Retail (base before discount); Wholesale (B2B); Discount %; Selling (derived); Profit/Margin live",
      "Formulas: Selling = Retail − (Retail × Discount / 100); Profit = Selling − Cost; Margin = Profit / Selling × 100. For a line with discount, taxable = qty×unitCost − discount, tax = taxable×tax% /100",
      "Variants (e.g. T-Shirt Red/M, Red/L): each variant has its own Cost/WAC, Retail, Wholesale, Discount, Selling, Min/Reorder, opening per outlet — receiving one variant never changes another",
      "When you receive stock via Purchases → Unit Cost paid → new WAC → ProductVariant.cost auto-updated; Selling stays unchanged unless you edited Retail/Wholesale on that receipt (then price recomputed as above)",
      "Auto Fill: per-variant toggle copies first price to empty fields; Bulk Auto Fill copies Cost→Cost, Retail→Retail independently — Selling always derived",
      "Archive (not delete) hides from POS; barcodes live per variant; header purchasePrice mirrors default variant for SIMPLE",
    ],
    next: [
      { href: "/products/new", label: "Create product", permission: "catalog.manage" },
      { href: "/purchases/new", label: "Receive to set WAC", permission: "purchase.manage" },
      { href: "/barcodes", label: "Barcodes", permission: "barcode.manage" },
    ],
    tasks: ["add-product"],
    emptyHint: "Create a product with a category. Variants are optional — SIMPLE auto-creates one DEFAULT variant.",
    keywords: ["sku", "catalog", "pricing", "cost", "wac", "retail", "wholesale", "discount", "selling price", "profit", "margin", "variant"],
  },
  {
    href: "/products/new",
    blurb: "Create: SIMPLE needs header Cost/Retail/Wholesale; VARIABLE pricing per variant. Selling auto-derived, variant-isolated. Formulas same as /products.",
    group: "Catalog",
    permission: "catalog.manage",
    canDo: [
      "Formulas: Selling = Retail − Retail×Discount/100; Profit = Selling − Cost; Margin = Profit/Selling×100 (shown per header and per variant card)",
      "VARIABLE: generate axes (colour/size/weight), then each variant card — Cost/Retail/Wholesale/Discount editable, Selling read-only, profit strip live, Auto Fill per-variant & bulk",
      "Opening: per-variant per-outlet; posts Stock OPENING with WAC = unitCost, then future receives WAC-average",
      "Save validates: ACTIVE variant needs Cost≥0, Wholesale≥0, Retail≥0; header validated only for SIMPLE",
    ],
    next: [{ href: "/products", label: "Products", permission: "catalog.view" }],
    tasks: ["add-product"],
    keywords: ["create", "new sku", "selling", "cost", "wac", "variant", "profit", "margin"],
  },
  {
    href: "/categories",
    blurb: "Required on every product.",
    canDo: ["Add, rename, or remove a category"],
    next: [{ href: "/subcategories", label: "Subcategories" }, { href: "/products/new", label: "Add product" }],
    tasks: ["add-product"],
    emptyHint: "Add a category before creating products.",
    keywords: ["taxonomy"],
  },
  {
    href: "/subcategories",
    blurb: "Optional extra grouping under a category.",
    canDo: ["Add a subcategory and bind it to a category"],
    next: [{ href: "/products", label: "Products" }],
    emptyHint: "Subcategories are optional — only add them if you need another split.",
    keywords: ["taxonomy"],
  },
  {
    href: "/brands",
    blurb: "Optional brand on a product.",
    canDo: ["Maintain the brand list"],
    next: [{ href: "/products", label: "Products" }],
    emptyHint: "Brands are optional labels on products.",
    keywords: ["make"],
  },
  {
    href: "/units",
    blurb: "Pcs, kg, litre — how you count a SKU.",
    canDo: ["Add a unit of measure"],
    next: [{ href: "/products", label: "Products" }],
    emptyHint: "Add units like Pcs or Kg if the default list is not enough.",
    keywords: ["uom"],
  },
  {
    href: "/attributes",
    blurb: "Colour, size, weight, volume, or any custom axis. Used when generating product combinations.",
    canDo: ["Define an attribute and its options"],
    next: [{ href: "/products/new", label: "Variable product" }],
    emptyHint: "Add Colour, Size, Weight, or a custom name.",
    keywords: ["variant", "size", "colour"],
  },
  {
    href: "/barcodes",
    blurb: "Create codes and print scannable shelf / sticker labels.",
    canDo: ["Generate barcodes", "Print stickers for the shelf"],
    next: [{ href: "/pos", label: "Test scan on POS", permission: "sale.create" }],
    keywords: ["label", "sticker"],
  },
  {
    href: "/inventory",
    blurb: "On-hand by location: available, reserved, damaged. UnitCost = WAC per (tenant,location,variant) — variant-isolated.",
    canDo: [
      "Read cost as Stock.unitCost (WAC) fallback to variant.cost when Stock=0; availableValue = available × unitCost",
      "Understand WAC after each purchase: same formula as /purchases/new — history preserved per PurchaseItem.unitCost",
      "Filter low / out of stock, adjust/transfer/reserve (all create StockMovement with before/after qty, unitCost, value)",
      "Sale reduces available with locked WAC snapshot → SaleItem.unitCost frozen for historical P&L",
    ],
    next: [
      { href: "/purchases/new", label: "Receive to move WAC", permission: "purchase.manage" },
      { href: "/inventory/movements", label: "Ledger (WAC per move)", permission: "inventory.ledger.view" },
      { href: "/profit-loss", label: "P&L uses frozen unitCost", permission: "report.finance" },
    ],
    tasks: ["receive-stock"],
    emptyHint: "Stock appears after a purchase (on save) or a posted receiving document. Cost shown is current WAC.",
    keywords: ["available", "on hand", "wac", "unitCost", "stock value", "movement"],
  },
  {
    href: "/receiving",
    blurb: "Draft documents do not change stock. Only a posted RECEIVED document increases inventory.",
    canDo: ["Create a draft (opening, purchase, transfer…)", "Post or cancel", "This is not the same as Purchases"],
    next: [
      { href: "/purchases", label: "Purchases (stock on save)", permission: "purchase.view" },
      { href: "/inventory", label: "Stock", permission: "inventory.view" },
    ],
    tasks: ["receive-stock"],
    emptyHint: "Create a draft, then post it to increase stock.",
    keywords: ["grn", "opening", "draft"],
  },
  {
    href: "/damage",
    blurb: "Creating a report does not reduce stock. Only an approved report moves available qty into damaged stock.",
    canDo: ["Draft a damage report", "Submit, then approve if allowed"],
    next: [
      { href: "/inventory", label: "Stock", permission: "inventory.view" },
      { href: "/returns", label: "Customer returns", permission: "sale.view" },
    ],
    emptyHint: "Draft a report, submit it, then approve to move stock.",
    keywords: ["breakage", "expired"],
  },
  {
    href: "/inventory/movements",
    blurb: "Every stock change is an append-only movement with before/after qty.",
    canDo: ["Filter by type and location", "Trace a SKU through receipts, sales, damage"],
    next: [{ href: "/inventory", label: "Stock" }],
    emptyHint: "Movements appear after sales, receiving, adjustments, or damage posts.",
    keywords: ["ledger", "history"],
  },
  {
    href: "/users",
    blurb: "Login accounts for this business — cashiers, managers, owners.",
    canDo: ["Invite a user", "Edit role and branches", "Deactivate a login"],
    next: [
      { href: "/roles", label: "Roles", permission: "user.manage" },
      { href: "/help/role", label: "What can I do?" },
    ],
    tasks: ["invite-cashier"],
    emptyHint: "Invite a cashier or manager.",
    keywords: ["employee", "invite"],
  },
  {
    href: "/roles",
    blurb: "Admin, manager, and cashier access. Owner has every key.",
    canDo: ["Tick permissions for a role", "Every user on that role updates together"],
    next: [{ href: "/users", label: "Employees" }, { href: "/help/role", label: "Role guide" }],
    emptyHint: "Seeded roles appear after setup. Edit keys here — do not invent unused ones like price.override.",
    keywords: ["rbac", "permission"],
  },
  {
    href: "/attendance",
    blurb: "Who showed up, by branch.",
    canDo: ["Record attendance", "Filter by date"],
    emptyHint: "Add an attendance row for the staff who showed up.",
    keywords: ["hr"],
  },
  {
    href: "/shifts",
    blurb: "Open and closed register sessions. Close a till from here or from POS.",
    canDo: ["See who is on a till", "Close a shift", "Cashiers can also close from POS"],
    tasks: ["close-the-day"],
    next: [{ href: "/pos", label: "POS", permission: "sale.create" }],
    emptyHint: "Shifts appear when someone opens the till on POS.",
    keywords: ["till", "register"],
  },
  {
    href: "/audit",
    blurb: "Every privileged action on this tenant.",
    canDo: ["Search actions by user and time"],
    emptyHint: "Privileged edits show up here as they happen.",
    keywords: ["log"],
  },
  {
    href: "/security",
    blurb: "Failed attempts, lockouts, and active sessions.",
    canDo: ["Review login failures", "Revoke a session"],
    emptyHint: "Login attempts and sessions list here after people sign in.",
    keywords: ["lockout", "session"],
  },
  {
    href: "/reports",
    blurb: "Finance, inventory, tax, and cashier performance.",
    canDo: ["Open a live report card"],
    next: [
      { href: "/reports/sales", label: "Sales" },
      { href: "/dashboard", label: "Dashboard" },
    ],
    keywords: ["hub"],
  },
  { href: "/reports/sales", blurb: "Tickets, tax, payment mix.", canDo: ["Filter the range", "Read ticket totals"], keywords: ["tickets"] },
  { href: "/reports/purchases", blurb: "GRN totals and dues.", canDo: ["See purchase volume"], permission: "purchase.view", keywords: ["grn"] },
  { href: "/reports/inventory", blurb: "On-hand qty and stock value.", canDo: ["Read stock value"], permission: "inventory.view", keywords: ["value"] },
  { href: "/reports/profit", blurb: "Gross and net after expenses.", canDo: ["Read margin"], permission: "report.finance", keywords: ["margin"] },
  { href: "/reports/expenses", blurb: "Posted expenses by category.", canDo: ["See spend mix"], permission: "expense.view", keywords: ["opex"] },
  { href: "/reports/dues", blurb: "Customer and supplier balances.", canDo: ["See who owes whom"], permission: "finance.view", keywords: ["ar", "ap"] },
  { href: "/reports/tax", blurb: "Output vs input VAT.", canDo: ["Read VAT for the range"], permission: "report.finance", keywords: ["vat"] },
  { href: "/reports/cashier", blurb: "Sales by cashier.", canDo: ["Compare tills"], keywords: ["staff mix"] },
  { href: "/reports/products", blurb: "Best-selling SKUs.", canDo: ["See what moves"], keywords: ["bestseller"] },
  { href: "/reports/returns", blurb: "Returned qty, value, and refunds.", canDo: ["Watch return rate"], permission: "sale.view", keywords: ["refund"] },
  { href: "/reports/receiving", blurb: "Posted receipts qty and value.", canDo: ["See what was posted"], permission: "inventory.receive.view", keywords: ["grn"] },
  { href: "/reports/damage", blurb: "Approved damage qty and cost.", canDo: ["See write-offs"], permission: "inventory.damage.view", keywords: ["write-off"] },
  {
    href: "/ecommerce",
    blurb: "Orders that arrived from the online store.",
    canDo: ["Review channel orders"],
    next: [{ href: "/deliveries", label: "Deliveries", permission: "delivery.manage" }],
    emptyHint: "Online orders appear here when a channel pushes them.",
    keywords: ["online"],
  },
  {
    href: "/deliveries",
    blurb: "Dispatch and rider status.",
    canDo: ["Track deliveries"],
    emptyHint: "Deliveries appear when an order is sent out.",
    keywords: ["rider", "dispatch"],
  },
  {
    href: "/notifications",
    blurb: "Inbox for stock, sales, and operational alerts.",
    canDo: ["Mark read", "Send a manual note if allowed"],
    next: [
      { href: "/sms", label: "SMS module", permission: "sms.view" },
      { href: "/settings", label: "Alert toggles", permission: "settings.manage" },
    ],
    emptyHint: "Low stock, sales, and other alerts land here.",
    keywords: ["inbox", "alert"],
  },
  {
    href: "/organization",
    blurb: "Legal profile used on invoices and receipts.",
    canDo: ["Edit name, address, logo"],
    next: [{ href: "/branches", label: "Branches", permission: "branch.manage" }],
    keywords: ["legal", "logo"],
  },
  {
    href: "/branches",
    blurb: "Outlets. POS, stock, and users bind to a branch.",
    canDo: ["Add an outlet", "Assign users to it from Employees"],
    next: [
      { href: "/warehouses", label: "Warehouses", permission: "warehouse.manage" },
      { href: "/users", label: "Employees", permission: "user.manage" },
    ],
    emptyHint: "Add a branch before opening a till or receiving stock.",
    keywords: ["outlet", "shop"],
  },
  {
    href: "/warehouses",
    blurb: "Stock locations used by receiving and transfers.",
    canDo: ["Add a warehouse / location"],
    next: [{ href: "/inventory", label: "Stock", permission: "inventory.view" }],
    emptyHint: "Add a warehouse so receiving has a location to post into.",
    keywords: ["location"],
  },
  {
    href: "/platform/tenants",
    blurb: "Every SaaS shop: plan, unpaid invoices, and API access.",
    canDo: ["Disable or restore a tenant API", "Open a tenant billing history"],
    keywords: ["tenant", "suspend", "api"],
    permission: null,
  },
  {
    href: "/platform/invoices",
    blurb: "Create, send, and mark platform invoices for tenants.",
    canDo: ["Create an invoice", "Send it", "Mark paid and send a receipt"],
    keywords: ["invoice", "overdue", "receipt"],
    permission: null,
  },
  {
    href: "/subscription",
    blurb: "Plan, feature limits, current usage, and bills from the platform.",
    canDo: ["See the plan and limits", "Download a platform invoice"],
    keywords: ["billing", "plan", "invoice"],
  },
  {
    href: "/billing",
    blurb: "Your plan price, discount, platform bills, and payment receipts.",
    canDo: ["See unpaid bills", "Download an invoice or receipt"],
    next: [{ href: "/subscription", label: "Subscription", permission: "plan.manage" }],
    emptyHint: "Bills from the platform appear here every month.",
    keywords: ["billing", "bill", "invoice", "payment", "receipt", "due"],
  },
  {
    href: "/integrations",
    blurb: "Keys for online store, delivery, and accounting webhooks.",
    canDo: ["Create or revoke an API key"],
    emptyHint: "Create a key when an external app needs to call this tenant.",
    keywords: ["api", "webhook"],
  },
  {
    href: "/backup",
    blurb: "Export tenant master data. Restore is a file re-import via Import / Export.",
    canDo: ["Download a backup"],
    next: [{ href: "/import-export", label: "Import / Export", permission: "import.manage" }],
    emptyHint: "Create a backup export when you need a snapshot.",
    keywords: ["export"],
  },
  {
    href: "/sms",
    blurb: "Tenant SMS templates, logs, and provider settings. Never shared across shops.",
    canDo: ["Send a customer or supplier SMS", "Edit Bangla/English templates", "Read delivery logs"],
    next: [
      { href: "/settings", label: "Master SMS toggle", permission: "settings.manage" },
      { href: "/notifications", label: "In-app inbox", permission: "notification.view" },
    ],
    keywords: ["sms", "template", "otp", "bangla"],
  },
  {
    href: "/settings",
    blurb: "Business profile extras: currency, tax, printers, payments, notifications, language, theme.",
    canDo: ["Set VAT and receipt width", "Toggle which alerts fire"],
    next: [
      { href: "/sms", label: "SMS module", permission: "sms.view" },
      { href: "/organization", label: "Legal profile", permission: "tenant.manage" },
    ],
    keywords: ["tax", "printer", "theme"],
  },
  {
    href: "/import-export",
    blurb: "Excel/CSV-style paste for products and customers. Backup JSON from Organization.",
    canDo: ["Paste rows to import", "Export current data"],
    next: [{ href: "/products", label: "Products", permission: "catalog.manage" }],
    keywords: ["csv", "excel"],
  },
  {
    href: "/help",
    group: "Help",
    permission: null,
    title: "Help Center",
    blurb: "Search pages and step-by-step tasks for your role.",
    canDo: ["Search guides", "Open a page", "Replay a tour"],
    next: [{ href: "/help/role", label: "What can I do?" }],
    keywords: ["guide", "search", "docs"],
  },
  {
    href: "/help/role",
    group: "Help",
    permission: null,
    title: "What can I do?",
    blurb: "Your role, in plain language — plus a tour if you want one.",
    canDo: ["See what this login can and cannot do", "Start the matching tour"],
    next: [{ href: "/help", label: "Help Center" }],
    keywords: ["role", "cashier", "manager", "owner"],
  },
];

export const HELP_PAGES: HelpPage[] = DRAFTS.map(page);

const BY_HREF = new Map(HELP_PAGES.map((p) => [p.href, p]));

export function helpForPath(path: string): HelpPage | undefined {
  const exact = BY_HREF.get(path);
  if (exact) return exact;
  const hit = [...BY_HREF.keys()]
    .sort((a, b) => b.length - a.length)
    .find((k) => k !== "/" && (path === k || path.startsWith(`${k}/`)));
  return hit ? BY_HREF.get(hit) : undefined;
}

export function helpBlurbFor(href: string): string | undefined {
  return BY_HREF.get(href)?.blurb ?? GROUP_BLURBS[href];
}

export function groupBlurb(title: string): string | undefined {
  return GROUP_BLURBS[title];
}

export function emptyHintFor(path: string): string | undefined {
  return helpForPath(path)?.emptyHint;
}

export function visibleHelpPages(can: (p: string) => boolean) {
  return HELP_PAGES.filter((p) => !p.permission || can(p.permission));
}

export function canOpenHref(href: string, can: (p: string) => boolean) {
  const page = helpForPath(href);
  if (!page?.permission) return true;
  return can(page.permission);
}

export function filterLinks(links: HelpLink[], can: (p: string) => boolean) {
  return links.filter((l) => {
    if (l.permission && !can(l.permission)) return false;
    return canOpenHref(l.href, can);
  });
}
