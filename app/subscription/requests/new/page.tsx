"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Button, Field, Panel, inputClass } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type PlanItem = { id: string; code: string; name: string; price: string; yearlyPrice: string | null };

export default function NewRequestPage() {
  const router = useRouter();
  const [requestedPlanId, setRequestedPlanId] = useState("");

  const planInfo = useQuery({
    queryKey: ["saas-plan"],
    queryFn: () => api<{ plan: { id: string; name: string } | null }>("/api/v1/saas/plan"),
  });

  const plans = useQuery({
    queryKey: ["plans-list"],
    queryFn: () => api<PlanItem[]>("/api/v1/saas/plans"),
  });

  const currentPlanId = planInfo.data?.plan?.id;
  const availablePlans = (plans.data ?? []).filter((p) => p.id !== currentPlanId);

  const submit = useMutation({
    mutationFn: () =>
      api("/api/v1/saas/access-requests", {
        method: "POST",
        body: JSON.stringify({ type: "PLAN_CHANGE", requestedPlanId }),
      }),
    onSuccess: () => {
      toastSuccess("Plan change request submitted");
      router.push("/subscription");
    },
    onError: (e) => toastError(e, "Could not submit request"),
  });

  const selectedPlan = availablePlans.find((p) => p.id === requestedPlanId);

  return (
    <AppShell>
      <PageHeader title="Change Plan" description="Request to change your subscription plan." />

      <Panel className="mx-auto max-w-lg">
        <div className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Current Plan: </span>
            <span className="font-medium">{planInfo.data?.plan?.name ?? "Loading..."}</span>
          </div>

          <Field label="Select New Plan">
            <select className={inputClass} value={requestedPlanId} onChange={(e) => setRequestedPlanId(e.target.value)}>
              <option value="">Choose a plan...</option>
              {availablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ৳{Number(p.price).toLocaleString()}/mo
                </option>
              ))}
            </select>
          </Field>

          {selectedPlan && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="font-medium">{selectedPlan.name}</div>
              <div className="text-muted-foreground">
                ৳{Number(selectedPlan.price).toLocaleString()}/mo
                {selectedPlan.yearlyPrice && (
                  <> · ৳{Number(selectedPlan.yearlyPrice).toLocaleString()}/yr</>
                )}
              </div>
            </div>
          )}

          <Button onClick={() => submit.mutate()} disabled={!requestedPlanId || submit.isPending}>
            {submit.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </Panel>
    </AppShell>
  );
}
