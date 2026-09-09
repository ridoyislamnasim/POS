"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { Button, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, Badge } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type Rec = { id: string; status: string; payloadSize: number; createdAt: string; note?: string };

export default function BackupPage() {
  const list = useQuery({ queryKey: ["backups"], queryFn: () => api<Rec[]>("/api/v1/saas/backups") });
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
  const { rows, pager } = usePagedRows(list.data);
  return (
    <AppShell>
      <PageHeader title="Backup & Restore" description="Export tenant master data. Restore is a file re-import via Import / Export.">
        <Button onClick={() => run.mutate()}>Run backup</Button>
      </PageHeader>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell><Badge>{r.status}</Badge></TableCell>
                <TableCell>{r.payloadSize} bytes</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
    </AppShell>
  );
}
