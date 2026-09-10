"use client";

import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Truncate } from "@/components/ui";

type Log = { id: string; action: string; entityType: string; entityId?: string; createdAt: string; userId?: string };

export default function AuditPage() {
  const list = useServerList<Log>("audit", "/api/v1/audit");
  return (
    <AppShell>
      <PageHeader title="Activity / Audit Log" description="Every privileged action on this tenant." />
      <ListFrame list={list} searchPlaceholder="Search action or entity" dateFilter columnCount={3} emptyTitle="No records found">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="tabular-nums text-xs">{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell>{r.action}</TableCell>
                <TableCell className="text-muted-foreground">
                  <Truncate>{`${r.entityType} ${r.entityId ?? ""}`}</Truncate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
    </AppShell>
  );
}
