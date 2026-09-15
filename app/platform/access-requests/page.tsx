"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { toastError, toastSuccess } from "@/lib/toast";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Badge, Panel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, StatusBadge, Button, inputClass, IconActionButton } from "@/components/ui";

type Request = {
  id: string;
  tenantId: string;
  type: string;
  requestedPlanId: string | null;
  reason: string;
  status: string;
  requestedBy: string;
  createdAt: string;
  tenant: { id: string; name: string; plan?: { name: string } | null };
  requestedPlan?: { id: string; name: string; price: string } | null;
};

export default function AccessRequestsPage() {
  const { me } = useMe();
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const requests = useQuery({
    queryKey: ["platform-access-requests"],
    queryFn: () => api<Request[]>("/api/v1/platform/access-requests"),
    enabled: Boolean(me?.isPlatform),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api(`/api/v1/platform/access-requests/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Request approved");
      qc.invalidateQueries({ queryKey: ["platform-access-requests"] });
    },
    onError: (e) => toastError(e, "Could not approve request"),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/api/v1/platform/access-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toastSuccess("Request rejected");
      qc.invalidateQueries({ queryKey: ["platform-access-requests"] });
      setRejectId(null);
      setRejectReason("");
    },
    onError: (e) => toastError(e, "Could not reject request"),
  });

  function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    reject.mutate({ id, reason: rejectReason.trim() });
  }

  return (
    <AppShell>
      <PageHeader
        title="Plan Change Requests"
        description="Review and approve tenant plan change requests."
      />

      <Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Current Plan</TableHead>
              <TableHead>Requested Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requests.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  No requests yet.
                </TableCell>
              </TableRow>
            ) : (
              (requests.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.tenant?.name ?? "Unknown"}</TableCell>
                  <TableCell className="text-sm">{r.tenant?.plan?.name ?? "None"}</TableCell>
                  <TableCell className="text-sm">
                    {r.requestedPlan?.name ?? r.requestedPlanId ?? "—"}
                  </TableCell>
                  <TableCell><StatusBadge value={r.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {r.status === "PENDING" && (
                      <div className="flex items-center gap-1">
                        {rejectId === r.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              className="h-7 w-40 rounded border bg-transparent px-2 text-xs"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Rejection reason"
                              autoFocus
                            />
                            <IconActionButton icon={<Check className="h-3.5 w-3.5" />} label="Confirm rejection" variant="destructive" size="xs" onClick={() => handleReject(r.id)} disabled={!rejectReason.trim() || reject.isPending} />
                            <IconActionButton icon={<X className="h-3.5 w-3.5" />} label="Cancel rejection" variant="default" size="xs" onClick={() => { setRejectId(null); setRejectReason(""); }} />
                          </div>
                        ) : (
                          <>
                            <IconActionButton icon={<Check className="h-3.5 w-3.5" />} label="Approve request" variant="success" size="xs" onClick={() => approve.mutate(r.id)} disabled={approve.isPending} />
                            <IconActionButton icon={<X className="h-3.5 w-3.5" />} label="Reject request" variant="destructive" size="xs" onClick={() => setRejectId(r.id)} disabled={reject.isPending} />
                          </>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Panel>
    </AppShell>
  );
}
