import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Warehouse,
  Users,
  Truck,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Banknote,
  Scale,
  CalendarCheck,
  FileBarChart,
  Contact,
  Heart,
  Factory,
  Shield,
  ClipboardList,
  UserCog,
  ScrollText,
  Lock,
  Building2,
  GitBranch,
  CreditCard,
  Plug,
  DatabaseBackup,
  Settings,
  Barcode,
  FileUp,
  Bell,
  Globe,
  Bike,
  MessageSquare,
  ClipboardCheck,
  PieChart,
  RotateCcw,
  Layers,
  Ruler,
  Tags,
  Tag,
  PackagePlus,
  AlertTriangle,
  ListTree,
} from "lucide-react";

/** Role key allowed to see Backup & Restore in the sidebar. */
export const BACKUP_ROLE_KEY = "PLATFORM_SUPER_ADMIN";

/** Compact tenant option for platform-only pickers. */
export type PlatformTenantOption = { id: string; name: string };

export type NavTone = "orange" | "emerald" | "amber" | "rose" | "lime" | "teal" | "yellow" | "stone" | "fuchsia";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: string | null;
  platformOnly?: boolean;
  /** Visible only to the tenant owner (never platform admins, never staff). */
  ownerOnly?: boolean;
  /** Visible only to users holding this role key (checked from DB-backed /me roles). */
  roleKey?: string;
};

export type NavGroup = {
  title: string;
  icon: LucideIcon;
  tone: NavTone;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Platform",
    icon: Building2,
    tone: "stone",
    items: [
      { title: "Tenants", href: "/platform/tenants", icon: Building2, permission: null, platformOnly: true },
      { title: "Plans & Limits", href: "/platform/plans", icon: Layers, permission: null, platformOnly: true },
      { title: "Access Requests", href: "/platform/access-requests", icon: ClipboardList, permission: null, platformOnly: true },
      { title: "Invoices", href: "/platform/invoices", icon: CreditCard, permission: null, platformOnly: true },
    ],
  },
  {
    title: "Overview",
    icon: LayoutDashboard,
    tone: "orange",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "report.view" }],
  },
  {
    title: "Billing",
    icon: CreditCard,
    tone: "amber",
    items: [
      { title: "Billing & Invoices", href: "/billing", icon: CreditCard, permission: "plan.manage", ownerOnly: true },
    ],
  },
  {
    title: "Sell",
    icon: ShoppingCart,
    tone: "emerald",
    items: [
      { title: "POS", href: "/pos", icon: ShoppingCart, permission: "sale.create" },
      { title: "Sales", href: "/sales", icon: Receipt, permission: "sale.view" },
      { title: "Returns", href: "/returns", icon: RotateCcw, permission: "sale.view" },
      { title: "Sales Orders", href: "/orders", icon: ClipboardCheck, permission: "order.view" },
    ],
  },
  {
    title: "Sales & Finance",
    icon: Banknote,
    tone: "amber",
    items: [
      { title: "Purchases", href: "/purchases", icon: Truck, permission: "purchase.view" },
      { title: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList, permission: "purchase.view" },
      { title: "Expenses", href: "/expenses", icon: Wallet, permission: "expense.view" },
      { title: "Income", href: "/income", icon: ArrowDownLeft, permission: "income.view" },
      { title: "Customer Due", href: "/dues/customers", icon: ArrowUpRight, permission: "finance.view" },
      { title: "Supplier Due", href: "/dues/suppliers", icon: Landmark, permission: "finance.view" },
      { title: "Payments", href: "/payments", icon: Banknote, permission: "payment.view" },
      { title: "Cash Flow", href: "/cash-flow", icon: Scale, permission: "finance.view" },
      { title: "Profit & Loss", href: "/profit-loss", icon: PieChart, permission: "report.finance" },
      { title: "Daily Closing", href: "/daily-closing", icon: CalendarCheck, permission: "finance.view" },
      { title: "Tax / VAT", href: "/reports/tax", icon: FileBarChart, permission: "report.finance" },
    ],
  },
  {
    title: "Customer & Supplier",
    icon: Contact,
    tone: "rose",
    items: [
      { title: "Customers", href: "/customers", icon: Contact, permission: "customer.view" },
      { title: "Loyalty / Points", href: "/loyalty", icon: Heart, permission: "loyalty.manage" },
      { title: "Suppliers", href: "/suppliers", icon: Factory, permission: "supplier.view" },
    ],
  },
  {
    title: "Catalog",
    icon: Package,
    tone: "lime",
    items: [
      { title: "Products", href: "/products", icon: Package, permission: "catalog.manage" },
      { title: "Categories", href: "/categories", icon: Layers, permission: "catalog.manage" },
      { title: "Subcategories", href: "/subcategories", icon: Tags, permission: "catalog.manage" },
      { title: "Brands", href: "/brands", icon: Tag, permission: "catalog.manage" },
      { title: "Units", href: "/units", icon: Ruler, permission: "catalog.manage" },
      { title: "Attributes", href: "/attributes", icon: Tags, permission: "catalog.manage" },
      { title: "Barcodes", href: "/barcodes", icon: Barcode, permission: "barcode.manage" },
    ],
  },
  {
    title: "Inventory",
    icon: Warehouse,
    tone: "teal",
    items: [
      { title: "Stock", href: "/inventory", icon: Warehouse, permission: "inventory.view" },
      { title: "Receiving", href: "/receiving", icon: PackagePlus, permission: "inventory.receive.view" },
      { title: "Damage", href: "/damage", icon: AlertTriangle, permission: "inventory.damage.view" },
      { title: "Stock ledger", href: "/inventory/movements", icon: ListTree, permission: "inventory.ledger.view" },
    ],
  },
  {
    title: "Staff & Security",
    icon: Shield,
    tone: "stone",
    items: [
      { title: "Employees", href: "/users", icon: Users, permission: "user.manage" },
      { title: "Roles & Permissions", href: "/roles", icon: Shield, permission: null, platformOnly: true },
      { title: "Attendance", href: "/attendance", icon: UserCog, permission: "staff.view" },
      { title: "Shift Management", href: "/shifts", icon: ClipboardList, permission: "shift.manage" },
      { title: "Audit Log", href: "/audit", icon: ScrollText, permission: "audit.view" },
      { title: "Login Security", href: "/security", icon: Lock, permission: "user.manage" },
    ],
  },
  {
    title: "Reports",
    icon: FileBarChart,
    tone: "yellow",
    items: [
      { title: "All Reports", href: "/reports", icon: FileBarChart, permission: "report.view" },
      { title: "Sales Report", href: "/reports/sales", icon: Receipt, permission: "report.view" },
      { title: "Purchase Report", href: "/reports/purchases", icon: Truck, permission: "purchase.view" },
      { title: "Inventory Report", href: "/reports/inventory", icon: Warehouse, permission: "inventory.view" },
      { title: "Profit Report", href: "/reports/profit", icon: PieChart, permission: "report.finance" },
      { title: "Expense Report", href: "/reports/expenses", icon: Wallet, permission: "expense.view" },
      { title: "Due Report", href: "/reports/dues", icon: ArrowUpRight, permission: "finance.view" },
      { title: "Tax Report", href: "/reports/tax", icon: FileBarChart, permission: "report.finance" },
      { title: "Cashier Report", href: "/reports/cashier", icon: Users, permission: "report.view" },
      { title: "Product Performance", href: "/reports/products", icon: Package, permission: "report.view" },
      { title: "Returns Report", href: "/reports/returns", icon: RotateCcw, permission: "sale.view" },
      { title: "Receiving Report", href: "/reports/receiving", icon: PackagePlus, permission: "inventory.receive.view" },
      { title: "Damage Report", href: "/reports/damage", icon: AlertTriangle, permission: "inventory.damage.view" },
    ],
  },
  {
    title: "Commerce",
    icon: Globe,
    tone: "lime",
    items: [
      { title: "E-commerce Orders", href: "/ecommerce", icon: Globe, permission: "order.view" },
      { title: "Deliveries", href: "/deliveries", icon: Bike, permission: "delivery.manage" },
      { title: "Notifications", href: "/notifications", icon: Bell, permission: "notification.view" },
      { title: "SMS", href: "/sms", icon: MessageSquare, permission: "sms.view" },
    ],
  },
  {
    title: "Organization",
    icon: Building2,
    tone: "stone",
    items: [
      { title: "Business / Org", href: "/organization", icon: Building2, permission: "tenant.manage" },
      { title: "Branches", href: "/branches", icon: GitBranch, permission: "branch.manage" },
      { title: "Warehouses", href: "/warehouses", icon: Warehouse, permission: "warehouse.manage" },
      { title: "Subscription", href: "/subscription", icon: CreditCard, permission: "plan.manage" },
      { title: "API / Integration", href: "/integrations", icon: Plug, permission: "integration.manage" },
      { title: "Backup & Restore", href: "/backup", icon: DatabaseBackup, permission: null, platformOnly: true, roleKey: BACKUP_ROLE_KEY },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    tone: "fuchsia",
    items: [
      { title: "General", href: "/settings", icon: Settings, permission: "settings.manage" },
      { title: "Import / Export", href: "/import-export", icon: FileUp, permission: "import.manage" },
    ],
  },
];

export const PAGE_TITLES: Record<string, { crumb: string; title: string }> = {
  "/dashboard": { crumb: "Overview / Dashboard", title: "Dashboard" },
  "/pos": { crumb: "Sell / POS", title: "Point of sale" },
  "/sales": { crumb: "Sell / Sales", title: "Sales" },
  "/returns": { crumb: "Sell / Returns", title: "Returns / Exchange" },
  "/receiving": { crumb: "Inventory / Receiving", title: "Stock receiving" },
  "/damage": { crumb: "Inventory / Damage", title: "Stock damage" },
  "/inventory": { crumb: "Inventory / Stock", title: "Inventory" },
  "/inventory/movements": { crumb: "Inventory / Ledger", title: "Inventory ledger" },
  "/orders": { crumb: "Sell / Sales Orders", title: "Sales Orders" },
  "/purchases": { crumb: "Finance / Purchases", title: "Purchases" },
  "/purchase-orders": { crumb: "Finance / Purchase Orders", title: "Purchase Orders" },
  "/expenses": { crumb: "Finance / Expenses", title: "Expenses" },
  "/income": { crumb: "Finance / Income", title: "Income" },
  "/dues/customers": { crumb: "Finance / Customer Due", title: "Customer Due" },
  "/dues/suppliers": { crumb: "Finance / Supplier Due", title: "Supplier Due" },
  "/payments": { crumb: "Finance / Payments", title: "Payments" },
  "/cash-flow": { crumb: "Finance / Cash Flow", title: "Cash Flow" },
  "/profit-loss": { crumb: "Finance / P&L", title: "Profit & Loss" },
  "/daily-closing": { crumb: "Finance / Daily Closing", title: "Daily Closing" },
  "/customers": { crumb: "CRM / Customers", title: "Customers" },
  "/loyalty": { crumb: "CRM / Loyalty", title: "Loyalty / Points" },
  "/suppliers": { crumb: "CRM / Suppliers", title: "Suppliers" },
  "/products": { crumb: "Catalog / Products", title: "Products" },
  "/products/new": { crumb: "Catalog / Products", title: "Create product" },
  "/categories": { crumb: "Catalog / Categories", title: "Categories" },
  "/subcategories": { crumb: "Catalog / Subcategories", title: "Subcategories" },
  "/brands": { crumb: "Catalog / Brands", title: "Brands" },
  "/units": { crumb: "Catalog / Units", title: "Units" },
  "/attributes": { crumb: "Catalog / Attributes", title: "Attributes" },
  "/barcodes": { crumb: "Catalog / Barcodes", title: "Barcode Generator" },
  "/users": { crumb: "Staff / Employees", title: "Employees" },
  "/roles": { crumb: "Staff / Roles", title: "Roles & Permissions" },
  "/attendance": { crumb: "Staff / Attendance", title: "Attendance" },
  "/shifts": { crumb: "Staff / Shifts", title: "Shift Management" },
  "/audit": { crumb: "Staff / Audit", title: "Activity / Audit Log" },
  "/security": { crumb: "Staff / Security", title: "Login Security" },
  "/reports": { crumb: "Reports", title: "Reports" },
  "/ecommerce": { crumb: "Commerce / Online", title: "E-commerce Orders" },
  "/deliveries": { crumb: "Commerce / Delivery", title: "Deliveries" },
  "/notifications": { crumb: "Commerce / Notifications", title: "Notifications" },
  "/sms": { crumb: "Commerce / SMS", title: "SMS" },
  "/platform/tenants": { crumb: "Platform / Tenants", title: "Tenants" },
  "/platform/plans": { crumb: "Platform / Plans", title: "Plans & Limits" },
  "/platform/plans/comparison": { crumb: "Platform / Plans", title: "Feature Comparison" },
  "/platform/access-requests": { crumb: "Platform / Requests", title: "Plan Change Requests" },
  "/platform/invoices": { crumb: "Platform / Invoices", title: "Platform invoices" },
  "/organization": { crumb: "Org / Business", title: "Business Profile" },
  "/branches": { crumb: "Org / Branches", title: "Branches" },
  "/warehouses": { crumb: "Org / Warehouses", title: "Warehouses" },
  "/subscription": { crumb: "Org / Billing", title: "Subscription / Billing" },
  "/billing": { crumb: "Billing / Invoices", title: "Billing & Invoices" },
  "/subscription/requests": { crumb: "Subscription / Requests", title: "My Requests" },
  "/subscription/requests/new": { crumb: "Subscription / Requests", title: "New Request" },
  "/integrations": { crumb: "Org / API", title: "API / Integration" },
  "/backup": { crumb: "Org / Backup", title: "Backup & Restore" },
  "/settings": { crumb: "Settings", title: "Settings" },
  "/import-export": { crumb: "Settings / Import", title: "Import / Export" },
  "/help": { crumb: "Help", title: "Help Center" },
  "/help/role": { crumb: "Help / Role", title: "What can I do?" },
};

export function pageMeta(path: string) {
  const exact = PAGE_TITLES[path];
  if (exact) return exact;
  const hit = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((k) => path.startsWith(k));
  return hit ? PAGE_TITLES[hit] : { crumb: "POS", title: "POS" };
}

export function filterNavGroups(can: (p: string) => boolean, opts?: { isPlatform?: boolean; isOwner?: boolean; roles?: string[] }): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => {
      if (i.platformOnly && !opts?.isPlatform) return false;
      if (i.ownerOnly && (!opts?.isOwner || opts?.isPlatform)) return false;
      if (i.roleKey && !(opts?.roles ?? []).includes(i.roleKey)) return false;
      return !i.permission || can(i.permission);
    }),
  })).filter((g) => g.items.length > 0);
}
