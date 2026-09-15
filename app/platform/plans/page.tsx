"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Layers, Plus, Settings } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Badge, Button, Panel, IconActionButton } from "@/components/ui";
import { CreatePlanDialog } from "@/components/plan/create-plan-dialog";

type ComparisonPlan = {
  id: string;
  code: string;
  name: string;
  price: string;
  interval: string;
  limits: Record<string, { limitValue: number | null; unlimited: boolean; disabled: boolean }>;
  features: Record<string, boolean>;
};

const RESOURCES = [
  { key: "BRANCH", label: "Branches" },
  { key: "WAREHOUSE", label: "Warehouses" },
  { key: "USER", label: "Users" },
  { key: "PRODUCT", label: "Products" },
  { key: "CUSTOMER", label: "Customers" },
  { key: "SUPPLIER", label: "Suppliers" },
  { key: "MONTHLY_SALE", label: "Monthly Sales" },
  { key: "MONTHLY_PURCHASE_ORDER", label: "Monthly Purchase Orders" },
];

const FEATURES = [
  { key: "POS", label: "POS" },
  { key: "INVENTORY", label: "Inventory" },
  { key: "CUSTOMERS", label: "Customers" },
  { key: "SUPPLIERS", label: "Suppliers" },
  { key: "PURCHASES", label: "Purchases" },
  { key: "SALES", label: "Sales" },
  { key: "RETURNS", label: "Returns" },
  { key: "BASIC_REPORTS", label: "Basic Reports" },
  { key: "MULTI_BRANCH", label: "Multi Branch" },
  { key: "MULTI_WAREHOUSE", label: "Multi Warehouse" },
  { key: "LOYALTY", label: "Loyalty" },
  { key: "ECOMMERCE", label: "E-commerce" },
  { key: "ADVANCED_REPORTS", label: "Advanced Reports" },
  { key: "ANALYTICS", label: "Analytics" },
  { key: "WHATSAPP", label: "WhatsApp" },
  { key: "ADVANCED_ROLES", label: "Advanced Roles" },
  { key: "API", label: "API" },
  { key: "INTEGRATIONS", label: "Integrations" },
  { key: "AUDIT_LOGS", label: "Audit Logs" },
  { key: "PRIORITY_SUPPORT", label: "Priority Support" },
];

export default function PlatformPlansPage() {
  const { me } = useMe();
  const [createOpen, setCreateOpen] = useState(false);

  const plans = useQuery({
    queryKey: ["platform-plans-comparison"],
    queryFn: () => api<ComparisonPlan[]>("/api/v1/platform/plans/comparison"),
    enabled: Boolean(me?.isPlatform),
  });

  const data = plans.data ?? [];

  return (
    <AppShell>
      <PageHeader title="Plans & Limits" description="Manage subscription plans, limits, and feature access.">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Create Plan
        </Button>
      </PageHeader>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="pb-2 pr-4 sticky left-0 bg-card min-w-[160px]">Resource / Feature</th>
                {data.map((p) => (
                  <th key={p.id} className="pb-2 px-4 text-center min-w-[120px]">
                    <div className="font-semibold text-foreground">{p.name}</div>
                    <div className="text-muted-foreground font-normal">
                      ৳{Number(p.price).toLocaleString()}/{p.interval === "YEARLY" ? "yr" : "mo"}
                    </div>
                      <Link href={`/platform/plans/${p.id}`} className="mt-1 inline-block">
                        <IconActionButton icon={<Settings className="h-3.5 w-3.5" />} label="Manage plan" size="xs" />
                      </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={data.length + 1} className="pt-3 pb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Resource Limits
                </td>
              </tr>
              {RESOURCES.map((r) => (
                <tr key={r.key} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium sticky left-0 bg-card">{r.label}</td>
                  {data.map((p) => {
                    const l = p.limits[r.key];
                    return (
                      <td key={p.id} className="py-2 px-4 text-center">
                        {l ? (
                          l.unlimited ? (
                            <Badge variant="outline">∞</Badge>
                          ) : l.disabled ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="font-medium">{l.limitValue?.toLocaleString()}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td colSpan={data.length + 1} className="pt-4 pb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Features
                </td>
              </tr>
              {FEATURES.map((f) => (
                <tr key={f.key} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium sticky left-0 bg-card">{f.label}</td>
                  {data.map((p) => (
                    <td key={p.id} className="py-2 px-4 text-center">
                      {p.features[f.key] ? (
                        <span className="text-emerald-600 font-medium">✓</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <CreatePlanDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}
