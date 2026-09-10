"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, StatusBadge, tableCellNumeric } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError, toastSuccess } from "@/lib/toast";

type Rec = { id: string; status: string; payloadSize: number; createdAt: string; note?: string };

export default function BackupPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const list = useServerList<Rec>("backups", "/api/v1/saas/backups");
  const run = useMutation({
    mutationFn: () => api<{ record: Rec; payload: unknown }>("/api/v1/saas/backup", { method: "POST", body: JSON.stringify({ note: "manual" }) }),
    onSuccess: (data) => {
      toastSuccess("Backup complete");
      const blob = new Blob([JSON.stringify(data.payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pos-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      list.refetch();
    },
    onError: (e) => toastError(e, "Backup failed"),
  });
  return (
    <AppShell>
      <PageHeader title="Backup & Restore" description="Export tenant master data. Restore is a file re-import via Import / Export.">
        <Button onClick={() => setConfirmOpen(true)}>Run backup</Button>
      </PageHeader>
      <ListFrame list={list} searchPlaceholder="Search backups" dateFilter columnCount={3} emptyTitle="No records found">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className={tableCellNumeric}>Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell><StatusBadge value={r.status} /></TableCell>
                <TableCell className={tableCellNumeric}>{r.payloadSize} bytes</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
      <ConfirmDialog
        open={confirmOpen}
        title="Run a backup now?"
        description="A JSON snapshot of tenant master data will download on this computer."
        confirmLabel="Run backup"
        variant="warning"
        loading={run.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => run.mutate()}
      />
    </AppShell>
  );
}
