"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowDownLeft, Info, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Badge, Button, Panel } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type PlanInfo = {
  tenant: { id: string; name: string; subscriptionStatus: string; discountType: string; discountValue: number; discountReason: string | null };
  plan: { id: string; name: string; code: string; price: string; yearlyPrice: string | null; currency: string } | null;
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

type AccessRequest = {
  id: string;
  type: string;
  requestedPlanId: string | null;
  status: string;
  createdAt: string;
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
  const qc = useQueryClient();

  const planInfo = useQuery({
    queryKey: ["saas-plan"],
    queryFn: () => api<PlanInfo>("/api/v1/saas/plan"),
  });

  const plans = useQuery({
    queryKey: ["plans-comparison"],
    queryFn: () => api<PlanComparison[]>("/api/v1/saas/plans"),
  });

  const requests = useQuery({
    queryKey: ["my-access-requests"],
    queryFn: () => api<AccessRequest[]>("/api/v1/saas/access-requests"),
  });

  const data = planInfo.data;
  const allPlans = plans.data ?? [];
  const allRequests = requests.data ?? [];
  const pendingRequests = allRequests.filter((r) => r.status === "PENDING");

  function pendingForPlan(planId: string) {
    return pendingRequests.find((r) => r.requestedPlanId === planId);
  }

  const submitRequest = useMutation({
    mutationFn: (planId: string) =>
      api("/api/v1/saas/access-requests", {
        method: "POST",
        body: JSON.stringify({ type: "PLAN_CHANGE", requestedPlanId: planId }),
      }),
    onSuccess: () => {
      toastSuccess("Plan change request submitted");
      qc.invalidateQueries({ queryKey: ["my-access-requests"] });
    },
    onError: (e) => toastError(e, "Could not submit request"),
  });

  const cancelRequest = useMutation({
    mutationFn: (id: string) => api(`/api/v1/saas/access-requests/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Request cancelled");
      qc.invalidateQueries({ queryKey: ["my-access-requests"] });
    },
    onError: (e) => toastError(e, "Could not cancel request"),
  });

function calcDiscount(price: number, discountType: string, discountValue: number) {
  const t = String(discountType ?? "NONE").toUpperCase();
  if (t === "PERCENT") return (price * Math.min(100, discountValue)) / 100;
  if (t === "FLAT") return Math.min(discountValue, price);
  return 0;
}

function formatPrice(val: number) {
  return `৳${Number(val).toLocaleString()}`;
}

/* Discount Banner */
function DiscountBanner({ tenant, plan }: { tenant: PlanInfo["tenant"]; plan: NonNullable<PlanInfo["plan"]> }) {
  if (tenant.discountType === "NONE" || !tenant.discountValue) return null;
  const price = Number(plan.price);
  const discountAmt = calcDiscount(price, tenant.discountType, tenant.discountValue);
  const finalPrice = price - discountAmt;
  const isPercent = String(tenant.discountType ?? "").toUpperCase() === "PERCENT";

  return (
    <Panel className="mb-4 border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Discount Applied: {isPercent ? `${tenant.discountValue}%` : formatPrice(tenant.discountValue)}
            </span>
            {tenant.discountReason ? (
              <span className="text-xs text-muted-foreground" title={tenant.discountReason}>
                <Info className="inline h-3 w-3" />
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-sm text-muted-foreground line-through">{formatPrice(price)}/mo</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatPrice(finalPrice)}/mo</span>
          </div>
          {tenant.discountReason ? (
            <p className="mt-1 text-xs text-muted-foreground">{tenant.discountReason}</p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

  return (
    <AppShell>
      <PageHeader title="My Subscription" description="Your current plan and available plans." />

      {/* Current Plan */}
      {data?.plan && (
        <Panel className="mb-4">
          <DiscountBanner tenant={data.tenant} plan={data.plan} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-sm font-medium">Current Plan: </span>
                <Badge>{data.plan.name}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {data.tenant.discountType !== "NONE" && data.tenant.discountValue
                  ? `${formatPrice(Number(data.plan.price) - calcDiscount(Number(data.plan.price), data.tenant.discountType, data.tenant.discountValue))}/mo`
                  : `${formatPrice(Number(data.plan.price))}/mo`
                }
                {data.plan.yearlyPrice && (
                  <>
                    {" "}
                    <span className="text-muted-foreground">|</span>{" "}
                    {data.tenant.discountType !== "NONE" && data.tenant.discountValue
                      ? `${formatPrice(Number(data.plan.yearlyPrice!) - calcDiscount(Number(data.plan.yearlyPrice!), data.tenant.discountType, data.tenant.discountValue))}/yr`
                      : `${formatPrice(Number(data.plan.yearlyPrice!))}/yr`
                    }
                  </>
                )}
              </span>
            </div>
            <Badge variant={data.tenant.subscriptionStatus === "ACTIVE" ? "default" : "secondary"}>
              {data.tenant.subscriptionStatus}
            </Badge>
          </div>
        </Panel>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Panel className="mb-4 border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <h4 className="mb-2 text-sm font-semibold">Pending Requests</h4>
          <div className="space-y-2">
            {pendingRequests.map((r) => {
              const targetPlan = allPlans.find((p) => p.id === r.requestedPlanId);
              return (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div>
                    <Badge variant="outline" className="mr-2">Plan Change</Badge>
                    <span className="text-muted-foreground">Requesting: </span>
                    <span className="font-medium">{targetPlan?.name ?? r.requestedPlanId}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => cancelRequest.mutate(r.id)} disabled={cancelRequest.isPending}>
                    Cancel
                  </Button>
                </div>
              );
            })}
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
              {allPlans.map((p) => {
                const isCurrent = data?.plan?.id === p.id;
                const pending = pendingForPlan(p.id);
                return (
                  <th key={p.id} className={`pb-3 px-4 text-center text-xs font-semibold uppercase ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                    {p.name}
                    {isCurrent && <div className="text-[10px] font-normal normal-case text-primary">(Current)</div>}
                    {!isCurrent && pending && <div className="text-[10px] font-normal normal-case text-amber-600">(Pending)</div>}
                  </th>
                );
              })}
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
            {/* Action row */}
            <tr>
              <td className="pt-4 text-xs font-semibold uppercase text-muted-foreground">Action</td>
              {allPlans.map((p) => {
                const isCurrent = data?.plan?.id === p.id;
                const pending = pendingForPlan(p.id);
                if (isCurrent) {
                  return (
                    <td key={p.id} className="pt-4 px-4 text-center">
                      <Badge>Current</Badge>
                    </td>
                  );
                }
                if (pending) {
                  return (
                    <td key={p.id} className="pt-4 px-4 text-center">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => cancelRequest.mutate(pending.id)} disabled={cancelRequest.isPending}>
                        {cancelRequest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel Request"}
                      </Button>
                    </td>
                  );
                }
                return (
                  <td key={p.id} className="pt-4 px-4 text-center">
                    <Button size="sm" className="h-7 text-xs" onClick={() => submitRequest.mutate(p.id)} disabled={submitRequest.isPending}>
                      {submitRequest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Request"}
                    </Button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
