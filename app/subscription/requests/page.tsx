"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Badge, Button, Panel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, StatusBadge } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type Request = {
  id: string;
  type: string;
  requestedPlanId: string | null;
  reason: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
};

export default function MyRequestsPage() {
  const qc = useQueryClient();

  const requests = useQuery({
    queryKey: ["my-access-requests"],
    queryFn: () => api<Request[]>("/api/v1/saas/access-requests"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api(`/api/v1/saas/access-requests/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Request cancelled");
      qc.invalidateQueries({ queryKey: ["my-access-requests"] });
    },
    onError: (e) => toastError(e, "Could not cancel"),
  });

  return (
    <AppShell>
      <PageHeader title="My Requests" description="Track your plan change requests.">
        <Link href="/subscription/requests/new">
          <Button size="sm">
            <Plus className="mr-1 h-3.5 w-3.5" />
            New Request
          </Button>
        </Link>
      </PageHeader>

      <Panel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requests.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No requests yet.
                </TableCell>
              </TableRow>
            ) : (
              (requests.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Badge variant="outline" className="mr-1">Plan Change</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={r.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{r.reason}</TableCell>
                  <TableCell>
                    {r.status === "PENDING" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending}>
                        <X className="mr-0.5 h-3 w-3" /> Cancel
                      </Button>
                    )}
                    {r.status === "REJECTED" && r.rejectionReason && (
                      <span className="text-xs text-destructive">{r.rejectionReason}</span>
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
