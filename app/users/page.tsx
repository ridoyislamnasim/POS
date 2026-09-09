"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import {
  Badge,
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
  inputClass,
} from "@/components/ui";
import { toastCreated, toastError, toastSuccess } from "@/lib/toast";

type User = {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: { role: { key: string; name: string } }[];
  branches: { branch: { name: string } }[];
};

export default function UsersPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Temp123!");
  const [roleKey, setRoleKey] = useState("CASHIER");

  const me = useQuery({ queryKey: ["me"], queryFn: () => api<{ permissions: string[] }>("/api/v1/auth/me"), retry: false });
  useEffect(() => {
    if (me.isError) router.replace("/login");
  }, [me.isError, router]);

  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api<User[]>("/api/v1/users"),
    enabled: me.isSuccess,
  });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => api<{ key: string; name: string }[]>("/api/v1/users/roles"),
    enabled: me.isSuccess,
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
      users.refetch();
    },
    onError: (e) => toastError(e, "Could not invite user"),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => api(`/api/v1/users/${id}/deactivate`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("User deactivated", pending?.email);
      setPending(null);
      users.refetch();
    },
    onError: (e) => toastError(e, "Could not deactivate user"),
  });

  function onInvite(e: FormEvent) {
    e.preventDefault();
    invite.mutate();
  }

  return (
    <AppShell>
      <PageHeader title="Users" description="Invite cashiers and staff. Cashiers cannot manage users or prices.">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite user
        </Button>
      </PageHeader>
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users.data ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.roles.map((r) => r.role.name).join(", ")}</TableCell>
                <TableCell>
                  <Badge variant={u.status === "ACTIVE" ? "success" : "secondary"}>{u.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {u.status === "ACTIVE" ? (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPending(u)}>
                      Deactivate
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={createOpen}
        title="Invite user"
        description="They can sign in with this email and temporary password."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="invite-user-form" disabled={invite.isPending}>
              {invite.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {invite.isPending ? "Inviting…" : "Send invite"}
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
          <Field label="Temporary password *">
            <PasswordInput placeholder="Temp password" value={password} onChange={setPassword} autoComplete="new-password" />
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
