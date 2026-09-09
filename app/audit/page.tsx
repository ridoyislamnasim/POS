"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, EmptyState } from "@/components/ui";

type Log = { id: string; action: string; entityType: string; entityId?: string; createdAt: string; userId?: string };

export default function AuditPage() {
  const q = useQuery({ queryKey: ["audit"], queryFn: () => api<Log[]>("/api/v1/audit?limit=100") });
  const { rows, pager } = usePagedRows(q.data);
  return (
    <AppShell>
      <PageHeader title="Activity / Audit Log" description="Every privileged action on this tenant." />
      {!q.data?.length ? <EmptyState title="No activity yet" /> : null}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="tabular-nums text-xs">{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell>{r.action}</TableCell>
                <TableCell className="text-muted-foreground">{r.entityType} {r.entityId ?? ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
    </AppShell>
  );
}
