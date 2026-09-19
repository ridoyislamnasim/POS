"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Badge, Button, Field, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableTabs, tableCellActions, IconActionButton, inputClass } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError, toastSuccess } from "@/lib/toast";

type Role = { id: string; key: string; name: string; tenantId: string | null; users: number; permissions: string[] };

const TABS = [
  { id: "roles", label: "Roles" },
  { id: "create", label: "Create role" },
];

export default function RolesPage() {
  const router = useRouter();
  const { me, isSuccess } = useMe();
  const isPlatform = Boolean(me?.isPlatform);
  const [tab, setTab] = useState("roles");
  const list = useServerList<Role>("staff-roles", "/api/v1/staff/roles", { enabled: isPlatform });
  const perms = useQuery({
    queryKey: ["all-perms"],
    queryFn: () => api<string[]>("/api/v1/staff/permissions"),
    enabled: isPlatform,
  });
  const [edit, setEdit] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (isSuccess && me && !isPlatform) router.replace("/dashboard");
  }, [isSuccess, me, isPlatform, router]);

  const save = useMutation({
    mutationFn: () => api(`/api/v1/staff/roles/${edit?.id}`, { method: "PATCH", body: JSON.stringify({ permissions: selected }) }),
    onSuccess: () => {
      toastSuccess("Role updated");
      list.refetch();
      setEdit(null);
    },
    onError: (e) => toastError(e, "Update failed"),
  });

  const create = useMutation({
    mutationFn: () => api("/api/v1/staff/roles", { method: "POST", body: JSON.stringify({ name, key, permissions: selected }) }),
    onSuccess: () => {
      toastSuccess("Role created", name);
      resetCreate();
      setTab("roles");
      list.refetch();
    },
    onError: (e) => toastError(e, "Create failed"),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/v1/staff/roles/${deleteTarget?.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toastSuccess("Role deleted", deleteTarget?.name);
      setDeleteTarget(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Delete failed"),
  });

  function resetCreate() {
    setName("");
    setKey("");
    setSelected([]);
  }

  function togglePerm(p: string) {
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  }

  return (
    <AppShell>
      <PageHeader title="Roles & Permissions" description="Platform-managed roles. Only the platform super admin can create, edit, or delete roles." />
      <TableTabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="mt-3">
        {tab === "roles" ? (
          <>
            <ListFrame list={list} searchPlaceholder="Search role" columnCount={4} emptyTitle="No records found">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><Badge variant="secondary">{r.key}</Badge></TableCell>
                      <TableCell>{r.users}</TableCell>
                      <TableCell className={tableCellActions}>
                        <IconActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Edit permissions" onClick={() => {
                          setEdit(r);
                          setSelected(r.permissions);
                        }} />
                        <IconActionButton icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete role" variant="destructive" onClick={() => setDeleteTarget(r)} />
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
                        onChange={() => togglePerm(p)}
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
          </>
        ) : (
          <div className="rounded-md border bg-card p-3">
            <h2 className="mb-2 font-semibold">Create role</h2>
            <p className="mb-3 text-sm text-muted-foreground">New roles are platform-level and available to every tenant.</p>
            <form id="create-role-form" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Role name *">
                  <input className={inputClass} required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse Manager" />
                </Field>
                <Field label="Key *">
                  <input className={inputClass} required value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="e.g. WAREHOUSE_MANAGER" />
                </Field>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Permissions</div>
                <div className="grid max-h-80 gap-1 overflow-auto sm:grid-cols-3">
                  {(perms.data ?? []).map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={selected.includes(p)} onChange={() => togglePerm(p)} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-1 flex gap-2">
                <Button type="submit" disabled={create.isPending || !name.trim() || !key.trim()}>
                  {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                  Create role
                </Button>
                <Button type="button" variant="ghost" onClick={resetCreate}>Clear</Button>
              </div>
            </form>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? "role"}?`}
        description={`This permanently removes the "${deleteTarget?.key ?? ""}" role from all tenants${deleteTarget && deleteTarget.users > 0 ? `. It is currently assigned to ${deleteTarget.users} user(s)` : ""}. This cannot be undone.`}
        confirmLabel="Delete role"
        variant="danger"
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
      />
    </AppShell>
  );
}