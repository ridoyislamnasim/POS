"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Layers, Plus, Settings, ToggleLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Badge, Button, Panel } from "@/components/ui";
import { CreatePlanDialog } from "@/components/plan/create-plan-dialog";

type Plan = {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: string;
  interval: string;
  active: boolean;
  displayOrder: number;
  planLimits: { resource: string; limitValue: number | null; unlimited: boolean; disabled: boolean }[];
  planFeatures: { feature: string; enabled: boolean }[];
};

export default function PlatformPlansPage() {
  const { me } = useMe();
  const [createOpen, setCreateOpen] = useState(false);

  const plans = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => api<Plan[]>("/api/v1/platform/plans"),
    enabled: Boolean(me?.isPlatform),
  });

  const keyLimits = ["BRANCH", "WAREHOUSE", "USER", "PRODUCT", "CUSTOMER", "SUPPLIER"];

  return (
    <AppShell>
      <PageHeader title="Plans & Limits" description="Manage subscription plans, limits, and feature access.">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Create Plan
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(plans.data ?? []).map((plan) => (
          <Panel key={plan.id} className="relative">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.code}</p>
              </div>
              <Badge variant={plan.active ? "default" : "secondary"}>
                {plan.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mb-3 text-2xl font-bold">
              ৳ {Number(plan.price).toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground">
                /{plan.interval === "YEARLY" ? "yr" : "mo"}
              </span>
            </div>
            {plan.description && (
              <p className="mb-3 text-xs text-muted-foreground">{plan.description}</p>
            )}
            <div className="mb-3 space-y-1">
              {keyLimits.map((r) => {
                const limit = plan.planLimits.find((l) => l.resource === r);
                if (!limit) return null;
                const label = { BRANCH: "Branches", WAREHOUSE: "Warehouses", USER: "Users", PRODUCT: "Products", CUSTOMER: "Customers", SUPPLIER: "Suppliers" }[r] ?? r;
                return (
                  <div key={r} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">
                      {limit.unlimited ? "∞" : limit.disabled ? "—" : limit.limitValue?.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Link href={`/platform/plans/${plan.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Settings className="mr-1 h-3 w-3" />
                  Manage
                </Button>
              </Link>
              <Link href="/platform/plans/comparison">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <ToggleLeft className="mr-1 h-3 w-3" />
                  Compare
                </Button>
              </Link>
            </div>
          </Panel>
        ))}
      </div>

      <CreatePlanDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}
