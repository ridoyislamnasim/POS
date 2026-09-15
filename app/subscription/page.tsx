"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button, PageHeader, Badge, Panel } from "@/components/ui";

type PlanInfo = {
  tenant: { id: string; name: string; subscriptionStatus: string };
  plan: { id: string; name: string; code: string; price: string; yearlyPrice: string | null } | null;
  limits: { resource: string; label: string; limitValue: number | null; unlimited: boolean; disabled: boolean }[];
  features: { feature: string; label: string; enabled: boolean }[];
};

type PlanComparison = {
  id: string;
  code: string;
  name: string;
  price: string;
  yearlyPrice: string | null;
  limits: Record<string, { limitValue: number | null; unlimited: boolean; disabled: boolean }>;
  features: Record<string, boolean>;
};

const RESOURCE_ROWS = [
  { key: "BRANCH", label: "Branches" },
  { key: "USER", label: "Users" },
  { key: "PRODUCT", label: "Products / Variants" },
  { key: "WAREHOUSE", label: "Warehouses" },
  { key: "CUSTOMER", label: "Customers" },
  { key: "SUPPLIER", label: "Suppliers" },
  { key: "MONTHLY_PURCHASE_ORDER", label: "Purchase Orders" },
  { key: "MONTHLY_SALE", label: "Sales Invoices" },
];

const FEATURE_ROWS = [
  { key: "STOCK_TRANSFER", label: "Stock Transfers" },
  { key: "POS", label: "POS" },
  { key: "INVENTORY", label: "Inventory" },
  { key: "CUSTOMERS", label: "Customer Management" },
  { key: "SUPPLIERS", label: "Supplier Management" },
  { key: "PURCHASES", label: "Purchase Management" },
  { key: "SALES", label: "Sales & Returns" },
  { key: "BASIC_REPORTS", label: "Basic Reports" },
  { key: "ADVANCED_REPORTS", label: "Advanced Reports" },
  { key: "MULTI_BRANCH", label: "Multi-Branch" },
  { key: "LOYALTY", label: "Loyalty" },
  { key: "ECOMMERCE", label: "E-commerce" },
  { key: "WHATSAPP", label: "WhatsApp" },
  { key: "ANALYTICS", label: "Advanced Analytics" },
  { key: "API", label: "API / Integrations" },
  { key: "ADVANCED_ROLES", label: "Custom Roles & Permissions" },
  { key: "PRIORITY_SUPPORT", label: "Priority Support" },
  { key: "DEDICATED_SUPPORT", label: "Dedicated Support" },
];

export default function SubscriptionPage() {
  const planInfo = useQuery({
    queryKey: ["saas-plan"],
    queryFn: () => api<PlanInfo>("/api/v1/saas/plan"),
  });

  const plans = useQuery({
    queryKey: ["plans-comparison"],
    queryFn: () => api<PlanComparison[]>("/api/v1/saas/plans"),
  });

  const data = planInfo.data;
  const allPlans = plans.data ?? [];

  return (
    <AppShell>
      <PageHeader title="My Subscription" description="Your current plan and available plans.">
        <Link href="/subscription/requests">
          <Button variant="outline" size="sm">
            <ClipboardList className="mr-1 h-3.5 w-3.5" />
            My Requests
          </Button>
        </Link>
      </PageHeader>

      {/* Current Plan */}
      {data?.plan && (
        <Panel className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-sm font-medium">Current Plan: </span>
                <Badge>{data.plan.name}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                ৳{Number(data.plan.price).toLocaleString()}/mo
                {data.plan.yearlyPrice && <> · ৳{Number(data.plan.yearlyPrice).toLocaleString()}/yr</>}
              </span>
            </div>
            <Badge variant={data.tenant.subscriptionStatus === "ACTIVE" ? "default" : "secondary"}>
              {data.tenant.subscriptionStatus}
            </Badge>
          </div>
        </Panel>
      )}

      {/* Plan Comparison Table */}
      <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Compare Plans</h3>
      <Panel className="mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase text-muted-foreground">&nbsp;</th>
              {allPlans.map((p) => (
                <th key={p.id} className={`pb-3 px-4 text-center text-xs font-semibold uppercase ${data?.plan?.id === p.id ? "text-primary" : "text-muted-foreground"}`}>
                  {p.name}
                  {data?.plan?.id === p.id && <div className="text-[10px] font-normal normal-case text-primary">(Current)</div>}
                </th>
              ))}
            </tr>
            <tr className="border-b text-sm">
              <td className="pb-2 pr-4 text-xs font-semibold uppercase text-muted-foreground">Monthly</td>
              {allPlans.map((p) => (
                <td key={p.id} className="pb-2 px-4 text-center font-semibold">
                  ৳{Number(p.price).toLocaleString()}/mo
                </td>
              ))}
            </tr>
            <tr className="border-b text-sm">
              <td className="pb-3 pr-4 text-xs font-semibold uppercase text-muted-foreground">Yearly</td>
              {allPlans.map((p) => (
                <td key={p.id} className="pb-3 px-4 text-center font-semibold">
                  {p.yearlyPrice ? `৳${Number(p.yearlyPrice).toLocaleString()}/yr` : "—"}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCE_ROWS.map(({ key, label }) => (
              <tr key={key} className="border-b last:border-b-0">
                <td className="py-2.5 pr-4 text-xs font-medium text-muted-foreground">{label}</td>
                {allPlans.map((p) => {
                  const lim = p.limits?.[key];
                  const val = lim?.unlimited ? "Unlimited" : lim?.limitValue?.toLocaleString() ?? "—";
                  return (
                    <td key={p.id} className="py-2.5 px-4 text-center text-sm">
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
            {FEATURE_ROWS.map(({ key, label }) => (
              <tr key={key} className="border-b last:border-b-0">
                <td className="py-2.5 pr-4 text-xs font-medium text-muted-foreground">{label}</td>
                {allPlans.map((p) => (
                  <td key={p.id} className="py-2.5 px-4 text-center">
                    {p.features?.[key] ? "✓" : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Request Plan Change */}
      <Panel className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold">Want to change your plan?</h4>
            <p className="text-xs text-muted-foreground">Submit a plan change request. An admin will review and approve it.</p>
          </div>
          <Link href="/subscription/requests/new">
            <Button size="sm">
              <ClipboardList className="mr-1 h-3.5 w-3.5" />
              Request Plan Change
            </Button>
          </Link>
        </div>
      </Panel>
    </AppShell>
  );
}
