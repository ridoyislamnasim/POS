"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, StatusBadge, tableCellNumeric } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import { Download, Loader2, Database, CheckCircle2, AlertCircle, Clock } from "lucide-react";

type Rec = { id: string; status: string; payloadSize: number; createdAt: string; note?: string };

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function BackupPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const qc = useQueryClient();
  const list = useServerList<Rec>("backups", "/api/v1/saas/backups");

  const run = useMutation({
    mutationFn: () => api<{ record: Rec; payload: unknown }>("/api/v1/saas/backup", { method: "POST", body: JSON.stringify({ note: "manual" }) }),
    onSuccess: (data) => {
      toastSuccess("Backup created successfully");
      const blob = new Blob([JSON.stringify(data.payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      list.refetch();
    },
    onError: (e) => toastError(e, "Backup failed"),
  });

  const download = useMutation({
    mutationFn: (id: string) => api<unknown>(`/api/v1/saas/backups/${id}/download`),
    onSuccess: (payload) => {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess("Download started");
    },
    onError: (e) => toastError(e, "Download failed"),
  });

  const backups = list.rows;
  const latestBackup = backups[0];

  return (
    <AppShell>
      <PageHeader title="Backup & Restore" description="Export your data as a JSON snapshot.">
        <Button onClick={() => setConfirmOpen(true)} disabled={run.isPending}>
          {run.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          {run.isPending ? "Backing up..." : "Run Backup"}
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{backups.length}</p>
              <p className="text-xs text-muted-foreground">Total Backups</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold">{latestBackup ? timeAgo(latestBackup.createdAt) : "Never"}</p>
              <p className="text-xs text-muted-foreground">Last Backup</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold">{latestBackup ? formatBytes(latestBackup.payloadSize) : "—"}</p>
              <p className="text-xs text-muted-foreground">Latest Size</p>
            </div>
          </div>
        </div>
      </div>

      {/* Backup Progress Animation */}
      {run.isPending && (
        <div className="mb-6 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <div className="absolute inset-0 h-6 w-6 animate-ping rounded-full bg-blue-400 opacity-20" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Creating backup...</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Exporting your data, this may take a moment.</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
            <div className="h-full animate-progress rounded-full bg-blue-600" />
          </div>
        </div>
      )}

      {/* Table */}
      <ListFrame list={list} searchPlaceholder="Search backups..." dateFilter columnCount={3} emptyTitle="No backups yet">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Backup</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className={tableCellNumeric}>Size</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((r, i) => (
              <TableRow
                key={r.id}
                className="transition-colors hover:bg-muted/50"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${r.status === "COMPLETE" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                      {r.status === "COMPLETE" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><StatusBadge value={r.status} /></TableCell>
                <TableCell className={tableCellNumeric}>
                  <span className="font-mono text-xs">{formatBytes(r.payloadSize)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs transition-all hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
                    onClick={() => download.mutate(r.id)}
                    disabled={download.isPending}
                  >
                    {download.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
                    )}
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>

      <ConfirmDialog
        open={confirmOpen}
        title="Run a backup now?"
        description="A JSON snapshot of your data will be created and downloaded."
        confirmLabel={run.isPending ? "Backing up..." : "Run Backup"}
        variant="warning"
        loading={run.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => run.mutate()}
      />
    </AppShell>
  );
}
