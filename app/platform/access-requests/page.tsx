"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Badge, Panel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, StatusBadge, Button } from "@/components/ui";

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
};

export default function AccessRequestsPage() {
  const { me } = useMe();

  const requests = useQuery({
    queryKey: ["platform-access-requests"],
    queryFn: () => api<{ rows: Request[]; pagination: { total: number } }>("/api/v1/platform/access-requests"),
    enabled: Boolean(me?.isPlatform),
  });

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
              <TableHead>Reason</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(requests.data?.rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-muted-foreground">
                  No requests yet.
                </TableCell>
              </TableRow>
            ) : (
              (requests.data?.rows ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.tenant?.name ?? "Unknown"}</TableCell>
                  <TableCell className="text-sm">{r.tenant?.plan?.name ?? "None"}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline">Plan Change</Badge>
                  </TableCell>
                  <TableCell><StatusBadge value={r.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{r.reason}</TableCell>
                  <TableCell>
                    {r.status === "PENDING" && (
                      <Link href={`/platform/access-requests/${r.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          Review
                        </Button>
                      </Link>
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
