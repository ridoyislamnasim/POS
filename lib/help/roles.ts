import type { RoleGuide } from "./types";

export const ROLE_GUIDES: RoleGuide[] = [
  {
    roleKey: "CASHIER",
    title: "Cashier",
    blurb: "Run the counter. Sell, return, glance at stock, open and close your own shift.",
    startHref: "/pos",
    tourId: "cashier-pos",
    canDo: [
      "Open and close your shift",
      "Scan, hold, and take payment on POS",
      "Apply a line discount if allowed",
      "Look up or add a customer from POS",
      "Submit a return from an invoice",
      "View on-hand stock",
      "Read in-app notifications",
    ],
    cannot: [
      "Void a sale",
      "Approve returns or refunds",
      "Add products, purchases, or expenses",
      "Open reports or the dashboard",
      "Invite users or edit roles",
    ],
  },
  {
    roleKey: "OUTLET_MANAGER",
    title: "Outlet manager",
    blurb: "Run the shop: stock, people, money, and the register.",
    startHref: "/dashboard",
    tourId: "manager-ops",
    canDo: [
      "Everything a cashier can, plus void and approve returns",
      "Catalog, receiving, damage, and stock adjustments",
      "Purchases, expenses, payments, and daily closing",
      "Invite cashiers (and other managers)",
      "Reports and dashboard",
    ],
    cannot: [
      "Business / org profile",
      "Subscription billing",
      "Backup & restore",
      "API keys / integrations",
    ],
  },
  {
    roleKey: "TENANT_OWNER",
    title: "Tenant owner",
    blurb: "The shop owner. Every menu and every permission key.",
    startHref: "/dashboard",
    tourId: "owner-setup",
    canDo: [
      "All operational work",
      "Business profile, billing, backup, and API keys",
      "Invite any tenant role (owner, manager, cashier)",
      "Edit role permission sets",
    ],
    cannot: ["Assign Platform super admin (platform login only)"],
  },
  {
    roleKey: "PLATFORM_SUPER_ADMIN",
    title: "Platform super admin",
    blurb: "SaaS operator — tenants and access, not the daily till.",
    startHref: "/users",
    tourId: "platform-saas",
    canDo: [
      "See and invite users across tenants",
      "Assign any role, including platform admin",
      "Edit platform-level roles",
      "Create and send tenant invoices",
      "Mark invoices paid and send receipts",
      "Disable or restore a tenant API access",
    ],
    cannot: ["This login is not meant for ringing up sales all day"],
  },
];

export function guidesForRoles(roles: string[]) {
  const hit = ROLE_GUIDES.filter((g) => roles.includes(g.roleKey));
  if (hit.length) return hit;
  return [];
}
