"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Badge, Button, Field, Panel, inputClass, StatusBadge } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type RequestDetail = {
  id: string;
  tenantId: string;
  type: string;
  requestedPlanId: string | null;
  reason: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  tenant: { id: string; name: string; subscriptionStatus: string; plan?: { name: string; price: string } | null };
};

type PlanInfo = { id: string; name: string; price: string; yearlyPrice: string | null };

export default function RequestReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useMe();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const request = useQuery({
    queryKey: ["platform-request", id],
    queryFn: () => api<RequestDetail>(`/api/v1/platform/access-requests/${id}`),
    enabled: Boolean(me?.isPlatform && id),
  });

  const plans = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => api<PlanInfo[]>("/api/v1/platform/plans?active=true"),
    enabled: Boolean(me?.isPlatform),
  });

  const approve = useMutation({
    mutationFn: () => api(`/api/v1/platform/access-requests/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Request approved — plan changed");
      qc.invalidateQueries({ queryKey: ["platform-access-requests"] });
      router.push("/platform/access-requests");
    },
    onError: (e) => toastError(e, "Could not approve"),
  });

  const reject = useMutation({
    mutationFn: () =>
      api(`/api/v1/platform/access-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      }),
    onSuccess: () => {
      toastSuccess("Request rejected");
      qc.invalidateQueries({ queryKey: ["platform-access-requests"] });
      router.push("/platform/access-requests");
    },
    onError: (e) => toastError(e, "Could not reject"),
  });

  const data = request.data;
  const targetPlan = plans.data?.find((p) => p.id === data?.requestedPlanId);

  return (
    <AppShell>
      <PageHeader title="Review Plan Change Request" description={data?.tenant?.name ?? "Loading..."}>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back
        </Button>
      </PageHeader>

      <Panel className="mx-auto max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Tenant</span>
              <p className="font-medium">{data?.tenant?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Subscription Status</span>
              <p>{data?.tenant?.subscriptionStatus ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Current Plan</span>
              <p className="font-medium">{data?.tenant?.plan?.name ?? "None"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Requested Plan</span>
              <p className="font-medium">
                {targetPlan ? (
                  <Badge variant="outline">{targetPlan.name} — ৳{Number(targetPlan.price).toLocaleString()}/mo</Badge>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p>{data ? <StatusBadge value={data.status} /> : "—"}</p>
            </div>
          </div>

          <div>
            <span className="text-sm text-muted-foreground">Reason</span>
            <p className="mt-1 text-sm">{data?.reason ?? "—"}</p>
          </div>

          <div>
            <span className="text-sm text-muted-foreground">Submitted</span>
            <p className="text-sm">{data ? new Date(data.createdAt).toLocaleString() : "—"}</p>
          </div>

          {/* Actions */}
          {data?.status === "PENDING" && (
            <div className="mt-6 flex gap-2 border-t pt-4">
              <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Approve & Change Plan
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowReject(true)}>
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          )}

          {showReject && (
            <div className="space-y-2 border-t pt-4">
              <Field label="Rejection Reason">
                <input
                  className={inputClass}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection"
                />
              </Field>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => reject.mutate()} disabled={!rejectReason || reject.isPending}>
                  Confirm Reject
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </AppShell>
  );
}
