"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Button, DataTable, Field, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, Badge, tableCellActions, IconActionButton } from "@/components/ui";
import { toastCreated, toastError, toastSuccess } from "@/lib/toast";
import { X } from "lucide-react";

type Key = { id: string; name: string; keyPrefix: string; revokedAt?: string; createdAt: string; secret?: string };

export default function IntegrationsPage() {
  const list = useQuery({ queryKey: ["apikeys"], queryFn: () => api<Key[]>("/api/v1/saas/api-keys") });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("Online store");
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, setPending] = useState<Key | null>(null);
  const create = useMutation({
    mutationFn: () => api<Key>("/api/v1/saas/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: (row) => {
      setSecret(row.secret ?? null);
      toastCreated("API key", "Copy it now — it will not be shown again");
      setCreateOpen(false);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not create API key"),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api/v1/saas/api-keys/${id}/revoke`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("API key revoked", pending?.name);
      setPending(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not revoke key"),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <AppShell>
      <PageHeader title="API / Integration" description="Keys for online store, delivery, and accounting webhooks.">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create key
        </Button>
      </PageHeader>
      {secret ? (
        <p className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 font-mono text-sm">
          {secret}
          <span className="mt-1 block font-sans text-xs text-muted-foreground">Copy this secret now. It will not be shown again.</span>
        </p>
      ) : null}
      <DataTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data ?? []).map((k) => (
              <TableRow key={k.id}>
                <TableCell>{k.name}</TableCell>
                <TableCell className="font-mono text-xs">{k.keyPrefix}</TableCell>
                <TableCell>{k.revokedAt ? <Badge variant="secondary">Revoked</Badge> : <Badge variant="success">Active</Badge>}</TableCell>
                <TableCell className={tableCellActions}>
                  {!k.revokedAt ? (
                    <IconActionButton icon={<X className="h-3.5 w-3.5" />} label="Revoke API key" variant="destructive" onClick={() => setPending(k)} />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>

      <Dialog
        open={createOpen}
        title="Create API key"
        description="Give the key a name so you can tell integrations apart."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-key-form" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create key
            </Button>
          </>
        }
      >
        <form id="create-key-form" onSubmit={onCreate}>
          <Field label="Name *">
            <input className={inputClass} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Online store" />
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Revoke API key?"
        description={pending ? `“${pending.name}” will stop working immediately.` : "This key will stop working immediately."}
        confirmLabel="Revoke"
        loading={revoke.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && revoke.mutate(pending.id)}
      />
    </AppShell>
  );
}
