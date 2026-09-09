"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, EmptyState } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import { useState } from "react";

type Role = { id: string; key: string; name: string; users: number; permissions: string[] };

export default function RolesPage() {
  const roles = useQuery({ queryKey: ["staff-roles"], queryFn: () => api<Role[]>("/api/v1/staff/roles") });
  const perms = useQuery({ queryKey: ["all-perms"], queryFn: () => api<string[]>("/api/v1/staff/permissions") });
  const [edit, setEdit] = useState<Role | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: () => api(`/api/v1/staff/roles/${edit?.id}`, { method: "PATCH", body: JSON.stringify({ permissions: selected }) }),
    onSuccess: () => {
      toastSuccess("Role updated");
      roles.refetch();
      setEdit(null);
    },
    onError: (e) => toastError(e, "Update failed"),
  });
  const { rows, pager } = usePagedRows(roles.data);

  return (
    <AppShell>
      <PageHeader title="Roles & Permissions" description="Admin, manager, and cashier access. Owner has every key." />
      {!roles.data?.length ? <EmptyState title="No roles" /> : null}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="secondary">{r.key}</Badge></TableCell>
                <TableCell>{r.users}</TableCell>
                <TableCell className="max-w-md text-xs text-muted-foreground">{r.permissions.length} keys</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEdit(r);
                      setSelected(r.permissions);
                    }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
      {edit ? (
        <div className="mt-4 rounded-lg border bg-card p-4">
          <h2 className="mb-2 font-semibold">Edit {edit.name}</h2>
          <div className="grid max-h-80 gap-1 overflow-auto sm:grid-cols-3">
            {(perms.data ?? []).map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(p)}
                  onChange={(e) =>
                    setSelected((s) => (e.target.checked ? [...s, p] : s.filter((x) => x !== p)))
                  }
                />
                {p}
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => save.mutate()}>Save permissions</Button>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
