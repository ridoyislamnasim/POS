"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Minus } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/ui";

type Comparison = {
  id: string;
  code: string;
  name: string;
  price: string;
  currency: string;
  interval: string;
  limits: Record<string, { limitValue: number | null; unlimited: boolean; disabled: boolean }>;
  features: Record<string, boolean>;
};

const RESOURCE_LABELS: Record<string, string> = {
  BRANCH: "Branches",
  WAREHOUSE: "Warehouses",
  USER: "Users",
  PRODUCT: "Products",
  CUSTOMER: "Customers",
  SUPPLIER: "Suppliers",
  MONTHLY_SALE: "Monthly Sales",
  MONTHLY_PURCHASE_ORDER: "Monthly Purchase Orders",
};

const FEATURE_LABELS: Record<string, string> = {
  POS: "POS",
  INVENTORY: "Inventory",
  CUSTOMERS: "Customers",
  SUPPLIERS: "Suppliers",
  PURCHASES: "Purchases",
  SALES: "Sales",
  RETURNS: "Returns",
  BASIC_REPORTS: "Basic Reports",
  STOCK_TRANSFER: "Stock Transfer",
  MULTI_BRANCH: "Multi Branch",
  MULTI_WAREHOUSE: "Multi Warehouse",
  LOYALTY: "Loyalty",
  ECOMMERCE: "E-commerce",
  ADVANCED_REPORTS: "Advanced Reports",
  ANALYTICS: "Analytics",
  WHATSAPP: "WhatsApp",
  API: "API",
  INTEGRATIONS: "Integrations",
  ADVANCED_ROLES: "Advanced Roles",
  AUDIT_LOGS: "Audit Logs",
  PRIORITY_SUPPORT: "Priority Support",
  DEDICATED_SUPPORT: "Dedicated Support",
};

const ALL_RESOURCES = Object.keys(RESOURCE_LABELS);
const ALL_FEATURES = Object.keys(FEATURE_LABELS);

export default function ComparisonPage() {
  const { me } = useMe();

  const comparison = useQuery({
    queryKey: ["plan-comparison"],
    queryFn: () => api<Comparison[]>("/api/v1/platform/plans/comparison"),
    enabled: Boolean(me?.isPlatform),
  });

  const plans = comparison.data ?? [];

  return (
    <AppShell>
      <PageHeader title="Feature Comparison" description="Compare limits and features across all plans." />
      <Panel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase text-muted-foreground">Resource / Feature</th>
              {plans.map((p) => (
                <th key={p.id} className="pb-3 px-4 text-center text-xs font-semibold uppercase text-muted-foreground">
                  {p.name}
                  <div className="mt-0.5 text-[10px] font-normal normal-case">
                    ৳ {Number(p.price).toLocaleString()}/{p.interval === "YEARLY" ? "yr" : "mo"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={plans.length + 1} className="pt-3 pb-1 text-xs font-semibold uppercase text-muted-foreground">
                Limits
              </td>
            </tr>
            {ALL_RESOURCES.map((r) => (
              <tr key={r} className="border-b">
                <td className="py-2 pr-4 font-medium">{RESOURCE_LABELS[r]}</td>
                {plans.map((p) => {
                  const l = p.limits[r];
                  return (
                    <td key={p.id} className="py-2 px-4 text-center">
                      {l?.unlimited ? (
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">∞</span>
                      ) : l?.disabled ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="font-medium">{l?.limitValue?.toLocaleString() ?? "—"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td colSpan={plans.length + 1} className="pt-4 pb-1 text-xs font-semibold uppercase text-muted-foreground">
                Features
              </td>
            </tr>
            {ALL_FEATURES.map((f) => (
              <tr key={f} className="border-b">
                <td className="py-2 pr-4 font-medium">{FEATURE_LABELS[f]}</td>
                {plans.map((p) => (
                  <td key={p.id} className="py-2 px-4 text-center">
                    {p.features[f] ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
