"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Button,
  Field,
  PageHeader,
  PasswordInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  tableCellActions,
  inputClass,
  StatusBadge,
} from "@/components/ui";
import { toastCreated, toastError, toastSuccess, toastUpdated } from "@/lib/toast";
import { useMe } from "@/lib/auth";
import { useHelpCreateAction } from "@/lib/help";

type User = {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: { role: { key: string; name: string } }[];
  branches: { branch: { name: string } }[];
  tenants?: { isPlatform?: boolean; tenant: { id: string; name: string } }[];
};

function tenantLabel(u: User) {
  const names = (u.tenants ?? [])
    .filter((t) => !t.isPlatform)
    .map((t) => t.tenant.name)
    .filter(Boolean);
  if (names.length) return names.join(", ");
  if (u.roles.some((r) => r.role.key === "PLATFORM_SUPER_ADMIN")) return "Platform";
  return "—";
}

export default function UsersPage() {
  const router = useRouter();
  const { me, isError: meError, isSuccess: meReady } = useMe();
  const isPlatform = Boolean(me?.isPlatform);
  const [createOpen, setCreateOpen] = useState(false);
  useHelpCreateAction(() => setCreateOpen(true));
  const [editing, setEditing] = useState<User | null>(null);
  const [pending, setPending] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Temp123!");
  const [roleKey, setRoleKey] = useState("CASHIER");

  useEffect(() => {
    if (meError) router.replace("/login");
  }, [meError, router]);

  const list = useServerList<User>("users", "/api/v1/users", { enabled: meReady });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => api<{ key: string; name: string }[]>("/api/v1/users/roles"),
    enabled: meReady,
  });
  const invite = useMutation({
    mutationFn: () =>
      api("/api/v1/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, roleKey }),
      }),
    onSuccess: () => {
      toastCreated("user", email);
      setName("");
      setEmail("");
      setCreateOpen(false);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not invite user"),
  });
  const saveUser = useMutation({
    mutationFn: () =>
      api(`/api/v1/users/${editing!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, email, roleKey, ...(password ? { password } : {}) }),
      }),
    onSuccess: () => {
      toastUpdated("user");
      setEditing(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not save user"),
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => api(`/api/v1/users/${id}`, { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) }),
    onSuccess: () => {
      toastSuccess("User reactivated");
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not reactivate user"),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => api(`/api/v1/users/${id}/deactivate`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("User deactivated", pending?.email);
      setPending(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not deactivate user"),
  });

  function onInvite(e: FormEvent) {
    e.preventDefault();
    if (editing) saveUser.mutate();
    else invite.mutate();
  }

  return (
    <AppShell>
      <PageHeader
        title="Users"
        description={
          isPlatform
            ? "Every shop account on the platform. Tenant owners only see staff in their own business."
            : "Staff in this business only. Platform admins and other shops are hidden."
        }
      >
        <Button type="button" onClick={() => {
          setEditing(null);
          setName("");
          setEmail("");
          setPassword("Temp123!");
          setCreateOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Invite user
        </Button>
      </PageHeader>
      <ListFrame
        list={list}
        searchPlaceholder="Search name or email"
        statusOptions={[
          { value: "ACTIVE", label: "Active" },
          { value: "DEACTIVATED", label: "Deactivated" },
        ]}
        columnCount={isPlatform ? 6 : 5}
        emptyTitle="No records found"
        emptyHint="Invite a cashier or manager."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              {isPlatform ? <TableHead>Business</TableHead> : null}
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                {isPlatform ? <TableCell>{tenantLabel(u)}</TableCell> : null}
                <TableCell>{u.roles.map((r) => r.role.name).join(", ")}</TableCell>
                <TableCell>
                  <StatusBadge value={u.status} />
                </TableCell>
                <TableCell className={tableCellActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(u);
                      setName(u.name);
                      setEmail(u.email);
                      setPassword("");
                      setRoleKey(u.roles[0]?.role.key ?? "CASHIER");
                      setCreateOpen(false);
                    }}
                  >
                    Edit
                  </Button>
                  {u.status === "ACTIVE" ? (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPending(u)}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => reactivate.mutate(u.id)}>
                      Reactivate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>

      <Dialog
        open={createOpen || Boolean(editing)}
        title={editing ? "Edit user" : "Invite user"}
        description={editing ? "Update name, email, or role. Leave password blank to keep the current one." : "They can sign in with this email and temporary password."}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="invite-user-form" disabled={invite.isPending || saveUser.isPending}>
              {invite.isPending || saveUser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {invite.isPending || saveUser.isPending ? "Saving…" : editing ? "Save user" : "Send invite"}
            </Button>
          </>
        }
      >
        <form id="invite-user-form" className="grid gap-3" onSubmit={onInvite}>
          <Field label="Name *">
            <input className={inputClass} required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email *">
            <input className={inputClass} required type="email" placeholder="name@shop.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={editing ? "New password" : "Temporary password *"}>
            <PasswordInput placeholder={editing ? "Leave blank to keep" : "Temp password"} value={password} onChange={setPassword} autoComplete="new-password" />
          </Field>
          <Field label="Role">
            <select className={inputClass} value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
              {(roles.data ?? []).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Deactivate user?"
        description={
          pending
            ? `${pending.name} (${pending.email}) will no longer be able to sign in.`
            : "This user will no longer be able to sign in."
        }
        confirmLabel="Deactivate"
        loading={deactivate.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && deactivate.mutate(pending.id)}
      />
    </AppShell>
  );
}
