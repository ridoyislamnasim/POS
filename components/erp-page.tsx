"use client";

import { useMutation } from "@tanstack/react-query";
import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLoadingSkeleton,
  TablePagination,
  TableRow,
  TableToolbar,
  tableCellActions,
  tableCellNumeric,
  inputClass,
  SearchInput,
  DateRangeFilter,
  FilterSelect,
  FilterChips,
  StatusBadge,
  SummaryCards,
  IconActionButton,
  type SummaryItem,
} from "@/components/ui";
import { toastCreated, toastDeleted, toastError, toastUpdated } from "@/lib/toast";
import { emptyHintFor, useHelpCreateAction } from "@/lib/help";

export type ResourceField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "date";
  options?: { value: string; label: string }[];
  required?: boolean;
  createOnly?: boolean;
};

export type Field = ResourceField;

export type Column = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  numeric?: boolean;
};

const NUMERIC_COL = /^(amount|total|due|paid|creditDue|creditLimit|price|qty|points|loyaltyPoints)$/i;

function colAlign(c: Column) {
  return c.numeric || NUMERIC_COL.test(c.key) ? tableCellNumeric : undefined;
}

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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function rowToForm<T extends { id: string }>(row: T, fields: ResourceField[]) {
  const r = row as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = r[f.key];
    out[f.key] = v == null ? "" : String(v);
  }
  return out;
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
  canEdit,
  searchPlaceholder,
  statusOptions,
  dateFilter,
  summary,
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
  canEdit?: boolean;
  searchPlaceholder?: string;
  statusOptions?: { value: string; label: string }[];
  dateFilter?: boolean;
  summary?: (ctx: { rows: T[]; total: number }) => SummaryItem[];
}) {
  const entity = entityName ?? guessEntity(title);
  const pathname = usePathname();
  const allowCreate = Boolean(fields?.length);
  const allowDelete = canDelete ?? allowCreate;
  const allowEdit = canEdit ?? allowCreate;
  const [form, setForm] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);

  const visibleFields = (fields ?? []).filter((f) => (editing ? !f.createOnly : true));

  const list = useServerList<T>(queryKey, path);
  const create = useMutation({
    mutationFn: (data: Record<string, string>) =>
      api(path, { method: "POST", body: JSON.stringify(transform ? transform(data) : data) }),
    onSuccess: () => {
      toastCreated(entity);
      setForm({});
      setCreateOpen(false);
      list.refetch();
    },
    onError: (e) => toastError(e, `Could not create ${entity}`),
  });
  const update = useMutation({
    mutationFn: (id: string) =>
      api(`${path}/${id}`, { method: "PATCH", body: JSON.stringify(transform ? transform(form) : form) }),
    onSuccess: () => {
      toastUpdated(entity);
      setEditing(null);
      setForm({});
      list.refetch();
    },
    onError: (e) => toastError(e, `Could not save ${entity}`),
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
    if (editing) update.mutate(editing.id);
    else create.mutate({ ...form, status: (form.status as string) ?? "ACTIVE" });
  }

  function openEdit(row: T) {
    setEditing(row);
    const formData = rowToForm(row, fields ?? []);
    const nameVal = (row as Record<string, unknown>).name;
    if (typeof nameVal === "string") {
      formData.slug = slugify(nameVal);
    }
    setForm(formData);
    setCreateOpen(false);
  }

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({ status: statusOptions?.[0]?.value ?? "ACTIVE" });
    setCreateOpen(true);
  }, [statusOptions]);

  useHelpCreateAction(openCreate, allowCreate);

  const closeDialog = useCallback(() => {
    setCreateOpen(false);
    setEditing(null);
  }, []);

  const dialogOpen = createOpen || Boolean(editing);
  const pending = create.isPending || update.isPending;
  const rows = list.rows;
  const addLabel = createLabel ?? `Add ${entity}`;
  const showActions = Boolean(rowHref || allowDelete || allowEdit);
  const emptyTitle = list.hasFilters ? "No records match your current filters." : "No records found";

  return (
    <AppShell>
      <PageHeader title={title} description={description}>
        {allowCreate ? (
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {addLabel}
          </Button>
        ) : null}
      </PageHeader>
      {summary ? <SummaryCards items={summary({ rows, total: list.pager.total })} /> : null}
      {list.isLoading ? <TableLoadingSkeleton columns={Math.max(columns.length, 3) + (showActions ? 1 : 0)} rows={8} /> : null}
      {list.isError && !rows.length ? <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} /> : null}
      {!list.isLoading ? (
      <DataTable>
        <TableToolbar>
          <SearchInput
            value={list.draft}
            onChange={list.setDraft}
            placeholder={searchPlaceholder ?? "Search…"}
            loading={list.searching || (list.isFetching && !list.isLoading)}
          />
          {statusOptions?.length ? (
            <FilterSelect value={list.status} onChange={(v) => list.setFilter("status", v)} options={statusOptions} placeholder="Status" />
          ) : null}
          {dateFilter ? <DateRangeFilter from={list.from} to={list.to} onChange={(k, v) => list.setFilter(k, v)} /> : null}
          {list.hasFilters ? (
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={list.reset}>
              Reset
            </Button>
          ) : null}
        </TableToolbar>
        <FilterChips chips={list.activeFilters} onRemove={(k) => (k === "search" ? list.setDraft("") : list.setFilter(k, ""))} onClear={list.reset} />
        {list.isError ? <div className="px-3 py-2"><ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} /></div> : null}
        {!rows.length ? (
          <EmptyState
            title={emptyTitle}
            hint={list.hasFilters ? "Try clearing filters or searching something else." : emptyHintFor(pathname) ?? (allowCreate ? `Use ${addLabel} to create the first one.` : undefined)}
            action={
              list.hasFilters ? (
                <Button type="button" variant="outline" size="sm" onClick={list.reset}>
                  Clear filters
                </Button>
              ) : allowCreate ? (
                <Button type="button" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  {addLabel}
                </Button>
              ) : undefined
            }
          />
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={colAlign(c)}>{c.label}</TableHead>
              ))}
              {showActions ? <TableHead className="w-[1%] text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={colAlign(c)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                  </TableCell>
                ))}
                {showActions ? (
                  <TableCell className={tableCellActions}>
                    {rowHref ? (
                      <Link href={rowHref(row)} className="mr-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
                        Open
                      </Link>
                    ) : null}
                    {allowEdit ? (
                      <IconActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" onClick={() => openEdit(row)} />
                    ) : null}
                    {allowDelete ? (
                      <IconActionButton icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" variant="destructive" onClick={() => setPendingDelete(row)} />
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
        <TablePagination {...list.pager} />
      </DataTable>
      ) : null}

      <Dialog
        open={dialogOpen}
        title={editing ? `Edit ${entity}` : addLabel}
        description={editing ? "Update the fields and save." : "Fill in the details and save. Required fields are marked."}
        size="lg"
        onClose={closeDialog}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button type="submit" form="resource-form" disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {pending ? "Saving…" : editing ? `Save ${entity}` : `Create ${entity}`}
            </Button>
          </>
        }
      >
        <form id="resource-form" className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          {visibleFields.map((f) => (
            <Field key={f.key} label={`${f.label}${f.required && !editing ? " *" : ""}`}>
              {f.type === "select" ? (
                <select
                  className={inputClass}
                  required={f.required && !editing}
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
                  required={f.required && !editing}
                  value={form[f.key] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((s) => ({
                      ...s,
                      [f.key]: val,
                      ...(f.key === "name" ? { slug: slugify(val) } : {}),
                    }));
                  }}
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

export function moneyText(v: unknown) {
  const n = Number(v ?? 0);
  return `৳ ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export function sumField<T>(rows: T[], key: string) {
  return rows.reduce((n, row) => n + Number((row as Record<string, unknown>)[key] ?? 0), 0);
}

export function moneyCell(v: unknown) {
  return <span className="tabular-nums">{moneyText(v)}</span>;
}

export function statusBadge(v: unknown) {
  return <StatusBadge value={v} />;
}
