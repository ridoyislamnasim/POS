"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Layers, ToggleLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Badge, Button, Panel } from "@/components/ui";
import { LimitEditor } from "@/components/plan/limit-editor";
import { FeatureToggle } from "@/components/plan/feature-toggle";
import { EditPlanDrawer } from "@/components/plan/edit-plan-drawer";

type PlanDetail = {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: string;
  yearlyPrice: string | null;
  interval: string;
  active: boolean;
  displayOrder: number;
  planLimits: { resource: string; limitValue: number | null; unlimited: boolean; disabled: boolean }[];
  planFeatures: { feature: string; enabled: boolean }[];
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

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const [tab, setTab] = useState<"limits" | "features">("limits");
  const [editOpen, setEditOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);

  const plan = useQuery({
    queryKey: ["platform-plan", id],
    queryFn: () => api<PlanDetail>(`/api/v1/platform/plans/${id}`),
    enabled: Boolean(me?.isPlatform && id),
  });

  const data = plan.data;

  return (
    <AppShell>
      <PageHeader title={data?.name ?? "Plan"} description={data?.code}>
        <Link href="/platform/plans">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit Plan
        </Button>
      </PageHeader>

      <div className="mb-4 flex gap-1 rounded-lg border bg-muted p-1 text-sm">
        <button
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${tab === "limits" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("limits")}
        >
          <Layers className="mr-1 inline h-3.5 w-3.5" />
          Limits
        </button>
        <button
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${tab === "features" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("features")}
        >
          <ToggleLeft className="mr-1 inline h-3.5 w-3.5" />
          Features
        </button>
      </div>

      {tab === "limits" && (
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Resource Limits</h3>
            <Button size="sm" variant="outline" onClick={() => setLimitOpen(true)}>
              Edit Limits
            </Button>
          </div>
          {limitOpen ? (
            <LimitEditor planId={id} limits={data?.planLimits ?? []} onClose={() => setLimitOpen(false)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2 pr-4">Resource</th>
                    <th className="pb-2 pr-4">Limit</th>
                    <th className="pb-2 pr-4">Unlimited</th>
                    <th className="pb-2">Disabled</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.planLimits ?? []).map((l) => (
                    <tr key={l.resource} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{RESOURCE_LABELS[l.resource] ?? l.resource}</td>
                      <td className="py-2 pr-4">
                        {l.unlimited ? (
                          <Badge variant="outline">∞ Unlimited</Badge>
                        ) : l.disabled ? (
                          <Badge variant="secondary">Disabled</Badge>
                        ) : (
                          <span className="font-medium">{l.limitValue?.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{l.unlimited ? "✓" : "—"}</td>
                      <td className="py-2">{l.disabled ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "features" && (
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Feature Access</h3>
            <Button size="sm" variant="outline" onClick={() => setFeatureOpen(true)}>
              Edit Features
            </Button>
          </div>
          {featureOpen ? (
            <FeatureToggle planId={id} features={data?.planFeatures ?? []} onClose={() => setFeatureOpen(false)} />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {(data?.planFeatures ?? []).map((f) => (
                <div
                  key={f.feature}
                  className={`rounded-md border px-3 py-2 text-sm ${f.enabled ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-muted bg-muted/30 text-muted-foreground"}`}
                >
                  {f.enabled ? "✓" : "—"} {RESOURCE_LABELS[f.feature] ?? f.feature}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {editOpen && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border bg-card p-4 shadow-lg">
            <h3 className="mb-3 text-sm font-semibold">Edit Plan</h3>
            <EditPlanDrawer plan={data} onClose={() => setEditOpen(false)} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
