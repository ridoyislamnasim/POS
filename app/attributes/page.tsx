"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, PageHeader, SearchInput, TablePagination, btnGhost, btnPrimary, inputClass } from "@/components/ui";
import { toastCreated, toastDeleted, toastError, toastUpdated } from "@/lib/toast";

type Attr = {
  id: string;
  name: string;
  key: string;
  variantDefining: boolean;
  options: { id: string; label: string; value: string }[];
};

export default function AttributesPage() {
  const qc = useQueryClient();
  const list = useServerList<Attr>("attrs", "/api/v1/catalog/attributes");
  const [name, setName] = useState("");
  const [optionFor, setOptionFor] = useState<string | null>(null);
  const [optionLabel, setOptionLabel] = useState("");
  const [pending, setPending] = useState<Attr | null>(null);

  const create = useMutation({
    mutationFn: () => api("/api/v1/catalog/attributes", { method: "POST", body: JSON.stringify({ name, variantDefining: true }) }),
    onSuccess: () => {
      toastCreated("attribute", name);
      setName("");
      qc.invalidateQueries({ queryKey: ["attrs"] });
    },
    onError: (e) => toastError(e),
  });
  const addOpt = useMutation({
    mutationFn: () =>
      api(`/api/v1/catalog/attributes/${optionFor}/options`, { method: "POST", body: JSON.stringify({ label: optionLabel }) }),
    onSuccess: () => {
      toastCreated("value", optionLabel);
      setOptionLabel("");
      qc.invalidateQueries({ queryKey: ["attrs"] });
    },
    onError: (e) => toastError(e),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/catalog/attributes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toastDeleted("attribute", pending?.name);
      setPending(null);
      qc.invalidateQueries({ queryKey: ["attrs"] });
    },
    onError: (e) => toastError(e),
  });
  const delOpt = useMutation({
    mutationFn: (id: string) => api(`/api/v1/catalog/attribute-options/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toastUpdated("attribute");
      qc.invalidateQueries({ queryKey: ["attrs"] });
    },
    onError: (e) => toastError(e),
  });

  return (
    <AppShell>
      <PageHeader title="Variant attributes" description="Colour, size, weight, volume, or any custom axis. Used when generating product combinations." />
      <form
        className="mb-4 flex max-w-lg gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <input className={inputClass} placeholder="New attribute (e.g. Capacity)" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className={btnPrimary} disabled={create.isPending}>
          Add attribute
        </button>
      </form>
      <div className="mb-3">
        <SearchInput value={list.draft} onChange={list.setDraft} placeholder="Search attributes" loading={list.searching || (list.isFetching && !list.isLoading)} />
      </div>
      {list.isLoading ? <div className="h-24 animate-pulse rounded-md bg-muted" /> : null}
      {list.isError ? <ErrorState message="Could not load attributes." onRetry={() => list.refetch()} /> : null}
      {!list.isLoading && !list.rows.length ? <EmptyState title={list.hasFilters ? "No records match your current filters." : "No records found"} hint="Add Colour, Size, Weight, or a custom name." /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {list.rows.map((a) => (
          <section key={a.id} className="rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.key}</div>
              </div>
              <button type="button" className={btnGhost + " text-destructive"} onClick={() => setPending(a)}>
                Delete
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {a.options.map((o) => (
                <span key={o.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
                  {o.label}
                  <button type="button" className="text-muted-foreground" onClick={() => delOpt.mutate(o.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className={inputClass + " h-8"}
                placeholder="Add value"
                value={optionFor === a.id ? optionLabel : ""}
                onChange={(e) => {
                  setOptionFor(a.id);
                  setOptionLabel(e.target.value);
                }}
              />
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setOptionFor(a.id);
                  if (optionLabel.trim()) addOpt.mutate();
                }}
              >
                Add
              </button>
            </div>
          </section>
        ))}
      </div>
      <TablePagination {...list.pager} />
      <ConfirmDialog
        open={Boolean(pending)}
        title="Delete attribute?"
        description={pending ? `“${pending.name}” and unused values will be removed.` : ""}
        confirmLabel="Delete"
        loading={remove.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && remove.mutate(pending.id)}
      />
    </AppShell>
  );
}
