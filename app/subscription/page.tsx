"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button, Kpi, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type Sub = {
  tenant: { name: string; subscriptionStatus: string; plan?: { id: string; name: string; code: string } | null };
  usage: { branches: number; users: number; products: number; warehouses: number };
  limits: { maxBranches?: number; maxUsers?: number; maxProducts?: number; maxWarehouses?: number };
};
type Plan = { id: string; name: string; code: string; price: string; features: string[] };

export default function SubscriptionPage() {
  const sub = useQuery({ queryKey: ["sub"], queryFn: () => api<Sub>("/api/v1/saas/subscription") });
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api<Plan[]>("/api/v1/saas/plans") });
  const choose = useMutation({
    mutationFn: (planId: string) => api("/api/v1/saas/subscription", { method: "POST", body: JSON.stringify({ planId }) }),
    onSuccess: () => {
      toastSuccess("Plan updated");
      sub.refetch();
    },
    onError: (e) => toastError(e, "Could not change plan"),
  });
  const u = sub.data?.usage;
  const l = sub.data?.limits ?? {};
  return (
    <AppShell>
      <PageHeader title="Subscription / Billing" description="Plan, feature limits, and current usage." />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Kpi label="Branches" value={`${u?.branches ?? 0}/${l.maxBranches ?? "∞"}`} />
        <Kpi label="Users" value={`${u?.users ?? 0}/${l.maxUsers ?? "∞"}`} />
        <Kpi label="Products" value={`${u?.products ?? 0}/${l.maxProducts ?? "∞"}`} />
        <Kpi label="Warehouses" value={`${u?.warehouses ?? 0}/${l.maxWarehouses ?? "∞"}`} />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Current: <Badge>{sub.data?.tenant.plan?.name ?? "None"}</Badge> · {sub.data?.tenant.subscriptionStatus}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {(plans.data ?? []).map((p) => (
          <ShellCard key={p.id}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-2xl font-semibold">৳ {Number(p.price).toFixed(0)}</div>
              <ul className="mb-3 list-disc pl-4 text-sm text-muted-foreground">
                {(Array.isArray(p.features) ? p.features : []).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Button onClick={() => choose.mutate(p.id)}>Select</Button>
            </CardContent>
          </ShellCard>
        ))}
      </div>
    </AppShell>
  );
}
