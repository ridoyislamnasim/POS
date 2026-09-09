"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  inputClass,
} from "@/components/ui";
import { toastCreated, toastDeleted, toastError } from "@/lib/toast";

export type ResourceField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "date";
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type Field = ResourceField;

export type Column = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
};

function guessEntity(title: string) {
  const map: Record<string, string> = {
    Customers: "customer",
    Suppliers: "supplier",
    Branches: "branch",
    Warehouses: "warehouse",
    Expenses: "expense",
    Income: "income",
    Payments: "payment",
    Deliveries: "delivery",
    "E-commerce Orders": "e-commerce order",
    Attendance: "attendance record",
  };
  return map[title] ?? title.replace(/s$/i, "").toLowerCase();
}

function rowLabel<T extends { id: string }>(row: T) {
  const r = row as Record<string, unknown>;
  const nested = r.user as { name?: string } | undefined;
  return String(r.name ?? r.code ?? nested?.name ?? r.number ?? r.vendor ?? r.category ?? r.channel ?? r.id);
}

function listUrl(path: string) {
  return `${path}${path.includes("?") ? "&" : "?"}limit=100`;
}

export function ResourcePage<T extends { id: string } = any>({
  title,
  description,
  path,
  queryKey,
  columns,
  fields,
  createLabel,
  transform,
  rowHref,
  entityName,
  canDelete,
}: {
  title: string;
  description: string;
  path: string;
  queryKey: string;
  columns: Column[];
  fields?: ResourceField[];
  createLabel?: string;
  transform?: (form: Record<string, string>) => unknown;
  rowHref?: (row: T) => string;
  entityName?: string;
  canDelete?: boolean;
}) {
  const entity = entityName ?? guessEntity(title);
  const allowCreate = Boolean(fields?.length);
  const allowDelete = canDelete ?? allowCreate;
  const [form, setForm] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);

  const list = useQuery({
    queryKey: [queryKey],
    queryFn: () => api<T[]>(listUrl(path)),
  });
  const create = useMutation({
    mutationFn: () => api(path, { method: "POST", body: JSON.stringify(transform ? transform(form) : form) }),
    onSuccess: () => {
      toastCreated(entity);
      setForm({});
      setCreateOpen(false);
      list.refetch();
    },
    onError: (e) => toastError(e, `Could not create ${entity}`),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`${path}/${id}`, { method: "DELETE" }),
    onSuccess: (_d, id) => {
      const name = pendingDelete && pendingDelete.id === id ? rowLabel(pendingDelete) : undefined;
      toastDeleted(entity, name);
      setPendingDelete(null);
      list.refetch();
    },
    onError: (e) => toastError(e, `Could not delete ${entity}`),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  const allRows = Array.isArray(list.data) ? list.data : [];
  const { rows, pager } = usePagedRows(allRows);
  const addLabel = createLabel ?? `Add ${entity}`;

  return (
    <AppShell>
      <PageHeader title={title} description={description}>
        {allowCreate ? (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {addLabel}
          </Button>
        ) : null}
      </PageHeader>
      {list.isLoading ? <Skeleton rows={8} /> : null}
      {list.isError ? <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} /> : null}
      {!list.isLoading && !rows.length ? (
        <EmptyState
          title="No records yet"
          hint={allowCreate ? `Use ${addLabel} to create the first one.` : undefined}
          action={
            allowCreate ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {addLabel}
              </Button>
            ) : undefined
          }
        />
      ) : null}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
              {rowHref || allowDelete ? <TableHead className="w-[1%] text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                  </TableCell>
                ))}
                {rowHref || allowDelete ? (
                  <TableCell className="whitespace-nowrap text-right">
                    {rowHref ? (
                      <Link href={rowHref(row)} className="mr-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
                        Open
                      </Link>
                    ) : null}
                    {allowDelete ? (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPendingDelete(row)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>

      <Dialog
        open={createOpen}
        title={addLabel}
        description={`Fill in the details and save. Required fields are marked.`}
        size="lg"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="resource-create-form" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {create.isPending ? "Saving…" : `Create ${entity}`}
            </Button>
          </>
        }
      >
        <form id="resource-create-form" className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          {(fields ?? []).map((f) => (
            <Field key={f.key} label={`${f.label}${f.required ? " *" : ""}`}>
              {f.type === "select" ? (
                <select
                  className={inputClass}
                  required={f.required}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                >
                  <option value="">Select {f.label.toLowerCase()}</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  className={inputClass + " min-h-[80px]"}
                  placeholder={f.label}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              ) : (
                <input
                  className={inputClass}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  placeholder={f.label}
                  required={f.required}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${entity}?`}
        description={
          pendingDelete
            ? `This will permanently remove “${rowLabel(pendingDelete)}”. You cannot undo this.`
            : `This will permanently remove this ${entity}.`
        }
        confirmLabel="Delete"
        loading={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </AppShell>
  );
}

export function moneyCell(v: unknown) {
  const n = Number(v ?? 0);
  return <span className="tabular-nums">৳ {Number.isFinite(n) ? n.toFixed(2) : "0.00"}</span>;
}

export function statusBadge(v: unknown) {
  return <Badge variant="secondary">{String(v ?? "—")}</Badge>;
}
