"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ListPlus, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button, Dialog, EmptyState, ErrorState, PageHeader, SearchInput, TablePagination, btnGhost, inputClass } from "@/components/ui";
import { toastCreated, toastDeleted, toastError, toastUpdated, getApiErrorMessage } from "@/lib/toast";
import { CommonAttributesDialog } from "./common-attributes-modal";
import { QuickAddValuesDialog } from "./quick-add-values-modal";
import { getQuickValues } from "./common-attribute-values";

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
  const [commonOpen, setCommonOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [valueFor, setValueFor] = useState<Attr | null>(null);
  const [quickFor, setQuickFor] = useState<Attr | null>(null);
  const trimmedName = name.trim();

  // Temporary development-only diagnostics for the Create flow (silent in production).
  const devLog = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") console.debug(...args);
  };

  const create = useMutation({
    mutationFn: () => api("/api/v1/catalog/attributes", { method: "POST", body: JSON.stringify({ name: trimmedName, variantDefining: true }) }),
    onMutate: () => {
      devLog("[attributes:create] onMutate — sending POST /api/v1/catalog/attributes", { name: trimmedName });
    },
    onSuccess: (data) => {
      devLog("[attributes:create] onSuccess", data);
      toastCreated("attribute", name);
      setName("");
      setCustomOpen(false);
      qc.invalidateQueries({ queryKey: ["attrs"] });
    },
    onError: (e) => {
      const err = e as Error & { code?: string; status?: number };
      devLog("[attributes:create] onError", { message: err?.message, code: err?.code, status: err?.status, error: e });
      toastError(e);
    },
  });
  const addOpt = useMutation({
    mutationFn: () =>
      api(`/api/v1/catalog/attributes/${optionFor}/options`, { method: "POST", body: JSON.stringify({ label: optionLabel }) }),
    onSuccess: () => {
      toastCreated("value", optionLabel);
      setOptionLabel("");
      setValueFor(null);
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

  function openCustom() {
    create.reset();
    setName("");
    setCustomOpen(true);
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault();
    devLog("[attributes:create] onSubmit reached", { name, trimmed: trimmedName, hasName: Boolean(trimmedName) });
    if (!trimmedName || create.isPending) {
      devLog("[attributes:create] submit ignored — empty name or already submitting");
      return;
    }
    devLog("[attributes:create] triggering create.mutate()");
    create.mutate();
  }

  function submitValue(e: FormEvent) {
    e.preventDefault();
    if (!optionFor || !optionLabel.trim() || addOpt.isPending) return;
    addOpt.mutate();
  }

  return (
    <AppShell>
      <PageHeader title="Variant attributes" description="Colour, size, weight, volume, or any custom axis. Used when generating product combinations.">
        <Button type="button" variant="outline" onClick={() => setCommonOpen(true)}>
          <ListPlus className="mr-2 h-4 w-4" />
          Add Common Attribute
        </Button>
        <Button type="button" onClick={openCustom}>
          <Plus className="mr-2 h-4 w-4" />
          Create Custom Attribute
        </Button>
      </PageHeader>
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
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setOptionFor(a.id);
                  setOptionLabel("");
                  addOpt.reset();
                  setValueFor(a);
                }}
              >
                Add value
              </button>
              {getQuickValues(a.name) ? (
                <button type="button" className={btnGhost} onClick={() => setQuickFor(a)}>
                  Quick Add Values
                </button>
              ) : null}
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
      <Dialog
        open={customOpen}
        title="Create Custom Attribute"
        description="Add a single attribute manually. It becomes available when generating product combinations."
        onClose={() => setCustomOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCustomOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="custom-attribute-form" disabled={!trimmedName || create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {create.isPending ? "Creating…" : "Create Attribute"}
            </Button>
          </>
        }
      >
        <form id="custom-attribute-form" onSubmit={submitCustom}>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="custom-attribute-name">
            Attribute name
          </label>
          <input
            id="custom-attribute-name"
            className={inputClass}
            placeholder="Capacity"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {!trimmedName ? (
            <p className="mt-1.5 text-xs text-muted-foreground">Enter an attribute name to enable Create.</p>
          ) : null}
          {create.isError ? (
            <p className="mt-1.5 text-xs text-destructive">{getApiErrorMessage(create.error, "Could not create attribute.")}</p>
          ) : null}
        </form>
      </Dialog>
      <CommonAttributesDialog open={commonOpen} onClose={() => setCommonOpen(false)} />
      <Dialog
        open={valueFor !== null}
        title={valueFor ? `Add ${valueFor.name} Value` : "Add Value"}
        description={valueFor ? `Add a single value to ${valueFor.name}.` : undefined}
        onClose={() => setValueFor(null)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setValueFor(null)} disabled={addOpt.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="attribute-value-form" disabled={!optionFor || !optionLabel.trim() || addOpt.isPending}>
              {addOpt.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {addOpt.isPending ? "Adding…" : "Add Value"}
            </Button>
          </>
        }
      >
        <form id="attribute-value-form" onSubmit={submitValue}>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="attribute-value-input">
            Value
          </label>
          <input
            id="attribute-value-input"
            className={inputClass}
            placeholder="e.g. Black"
            value={optionLabel}
            onChange={(e) => setOptionLabel(e.target.value)}
          />
          {!optionLabel.trim() ? (
            <p className="mt-1.5 text-xs text-muted-foreground">Enter a value to enable Add.</p>
          ) : null}
          {addOpt.isError ? (
            <p className="mt-1.5 text-xs text-destructive">{getApiErrorMessage(addOpt.error, "Could not add value.")}</p>
          ) : null}
        </form>
      </Dialog>
      <QuickAddValuesDialog attribute={quickFor} open={quickFor !== null} onClose={() => setQuickFor(null)} />
    </AppShell>
  );
}
