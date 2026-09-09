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
  ClipboardCheck,
  PieChart,
} from "lucide-react";

export type NavTone = "sky" | "emerald" | "amber" | "rose" | "violet" | "teal" | "orange" | "indigo" | "cyan" | "blue" | "fuchsia";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: string | null;
};

export type NavGroup = {
  title: string;
  icon: LucideIcon;
  tone: NavTone;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    tone: "sky",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "report.view" }],
  },
  {
    title: "Sell",
    icon: ShoppingCart,
    tone: "emerald",
    items: [
      { title: "POS", href: "/pos", icon: ShoppingCart, permission: "sale.create" },
      { title: "Sales", href: "/sales", icon: Receipt, permission: "sale.view" },
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
    tone: "violet",
    items: [
      { title: "Products", href: "/products", icon: Package, permission: "catalog.manage" },
      { title: "Barcodes", href: "/barcodes", icon: Barcode, permission: "barcode.manage" },
    ],
  },
  {
    title: "Inventory",
    icon: Warehouse,
    tone: "teal",
    items: [{ title: "Stock", href: "/inventory", icon: Warehouse, permission: "inventory.view" }],
  },
  {
    title: "Staff & Security",
    icon: Shield,
    tone: "orange",
    items: [
      { title: "Employees", href: "/users", icon: Users, permission: "user.manage" },
      { title: "Roles & Permissions", href: "/roles", icon: Shield, permission: "user.manage" },
      { title: "Attendance", href: "/attendance", icon: UserCog, permission: "staff.view" },
      { title: "Shift Management", href: "/shifts", icon: ClipboardList, permission: "shift.manage" },
      { title: "Audit Log", href: "/audit", icon: ScrollText, permission: "audit.view" },
      { title: "Login Security", href: "/security", icon: Lock, permission: "user.manage" },
    ],
  },
  {
    title: "Reports",
    icon: FileBarChart,
    tone: "indigo",
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
    ],
  },
  {
    title: "Commerce",
    icon: Globe,
    tone: "cyan",
    items: [
      { title: "E-commerce Orders", href: "/ecommerce", icon: Globe, permission: "order.view" },
      { title: "Deliveries", href: "/deliveries", icon: Bike, permission: "delivery.manage" },
      { title: "Notifications", href: "/notifications", icon: Bell, permission: "notification.send" },
    ],
  },
  {
    title: "Organization",
    icon: Building2,
    tone: "blue",
    items: [
      { title: "Business / Org", href: "/organization", icon: Building2, permission: "tenant.manage" },
      { title: "Branches", href: "/branches", icon: GitBranch, permission: "branch.manage" },
      { title: "Warehouses", href: "/warehouses", icon: Warehouse, permission: "warehouse.manage" },
      { title: "Subscription", href: "/subscription", icon: CreditCard, permission: "plan.manage" },
      { title: "API / Integration", href: "/integrations", icon: Plug, permission: "integration.manage" },
      { title: "Backup & Restore", href: "/backup", icon: DatabaseBackup, permission: "backup.manage" },
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
  "/barcodes": { crumb: "Catalog / Barcodes", title: "Barcode Generator" },
  "/inventory": { crumb: "Inventory / Stock", title: "Inventory" },
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
  "/organization": { crumb: "Org / Business", title: "Business Profile" },
  "/branches": { crumb: "Org / Branches", title: "Branches" },
  "/warehouses": { crumb: "Org / Warehouses", title: "Warehouses" },
  "/subscription": { crumb: "Org / Billing", title: "Subscription / Billing" },
  "/integrations": { crumb: "Org / API", title: "API / Integration" },
  "/backup": { crumb: "Org / Backup", title: "Backup & Restore" },
  "/settings": { crumb: "Settings", title: "Settings" },
  "/import-export": { crumb: "Settings / Import", title: "Import / Export" },
};

export function pageMeta(path: string) {
  const exact = PAGE_TITLES[path];
  if (exact) return exact;
  const hit = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((k) => path.startsWith(k));
  return hit ? PAGE_TITLES[hit] : { crumb: "POS", title: "POS" };
}

export function filterNavGroups(can: (p: string) => boolean): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || can(i.permission)),
  })).filter((g) => g.items.length > 0);
}
