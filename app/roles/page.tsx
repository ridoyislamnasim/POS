"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Badge, Button, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, tableCellActions } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import { useState } from "react";

type Role = { id: string; key: string; name: string; users: number; permissions: string[] };

export default function RolesPage() {
  const list = useServerList<Role>("staff-roles", "/api/v1/staff/roles");
  const perms = useQuery({ queryKey: ["all-perms"], queryFn: () => api<string[]>("/api/v1/staff/permissions") });
  const [edit, setEdit] = useState<Role | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: () => api(`/api/v1/staff/roles/${edit?.id}`, { method: "PATCH", body: JSON.stringify({ permissions: selected }) }),
    onSuccess: () => {
      toastSuccess("Role updated");
      list.refetch();
      setEdit(null);
    },
    onError: (e) => toastError(e, "Update failed"),
  });

  return (
    <AppShell>
      <PageHeader title="Roles & Permissions" description="Admin, manager, and cashier access. Owner has every key." />
      <ListFrame list={list} searchPlaceholder="Search role" columnCount={5} emptyTitle="No records found">
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
            {list.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="secondary">{r.key}</Badge></TableCell>
                <TableCell>{r.users}</TableCell>
                <TableCell className="max-w-md text-xs text-muted-foreground">{r.permissions.length} keys</TableCell>
                <TableCell className={tableCellActions}>
                  <Button
                    variant="outline"
                    size="xs"
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
      </ListFrame>
      {edit ? (
        <div className="mt-3 rounded-md border bg-card p-3">
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
