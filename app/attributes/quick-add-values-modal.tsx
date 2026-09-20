"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  Badge,
  Button,
  Dialog,
  SearchInput,
} from "@/components/ui";
import { getQuickValues } from "./common-attribute-values";

const ATTRS_QUERY_KEY = "attrs";

export type QuickAddAttribute = {
  id: string;
  name: string;
  options: { id: string; label: string; value: string }[];
};

const norm = (v: string) => v.trim().toLowerCase();

function isDuplicateError(e: unknown) {
  const rec = e as { code?: string; status?: number; message?: string } | null;
  if (!rec || typeof rec !== "object") return false;
  // Backend maps Prisma P2002 (definitionId + value) to CONFLICT / 409 "Already exists".
  if (rec.code === "CONFLICT" || rec.status === 409) return true;
  return /already exists|already in use|duplicate|unique/i.test(rec.message ?? "");
}

export function QuickAddValuesDialog({
  attribute,
  open,
  onClose,
}: {
  attribute: QuickAddAttribute | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset dialog state every time it opens.
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelected(new Set());
    setSubmitError(null);
    setProgress({ done: 0, total: 0 });
  }, [open ]);

  const quickValues = useMemo(
    () => (attribute ? (getQuickValues(attribute.name) ?? []) : []),
    [attribute],
  );

  // Existing option labels, normalized so "Black", "black" and "BLACK" match.
  const existingLabels = useMemo(() => {
    const set = new Set<string>();
    for (const o of attribute?.options ?? []) set.add(norm(o.label));
    return set;
  }, [attribute]);

  const alreadyAdded = (label: string) => existingLabels.has(norm(label));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quickValues;
    return quickValues.filter((v) => v.toLowerCase().includes(q));
  }, [quickValues, search]);

  const toggle = (label: string) => {
    if (alreadyAdded(label)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // Select All / Clear All apply only to available (not already-added) filtered items.
  const selectAllFiltered = () => {
    setSelected((prev) => new Set([...prev, ...filtered.filter((v) => !alreadyAdded(v))]));
  };
  const clearFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const v of filtered) next.delete(v);
      return next;
    });
  };

  const selectedCount = selected.size;
  const filteredSelectedCount = filtered.filter((v) => selected.has(v)).length;

  async function onAddSelected() {
    if (!attribute || !selectedCount || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const picked = quickValues.filter((v) => selected.has(v));
    setProgress({ done: 0, total: picked.length });
    let created = 0;
    let skipped = 0;
    const failed: string[] = [];
    // Sequential creates through the existing attribute-options API.
    for (const label of picked) {
      try {
        if (alreadyAdded(label)) {
          skipped += 1;
        } else {
          await api(`/api/v1/catalog/attributes/${attribute.id}/options`, {
            method: "POST",
            body: JSON.stringify({ label }),
          });
          existingLabels.add(norm(label));
          created += 1;
        }
      } catch (e) {
        if (isDuplicateError(e)) skipped += 1;
        else failed.push(label);
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setSubmitting(false);

    if (failed.length) {
      // Keep the dialog open so the user can retry; refresh for partial success.
      if (created > 0) await queryClient.invalidateQueries({ queryKey: [ATTRS_QUERY_KEY] });
      setSubmitError(`Could not add ${failed.length} value(s): ${failed.join(", ")}. Please try again.`);
      toastError(`Failed to add ${failed.length} value(s)`, "Some values were not created");
      return;
    }
    if (created > 0) {
      await queryClient.invalidateQueries({ queryKey: [ATTRS_QUERY_KEY] });
      toastSuccess(
        `${created} value${created === 1 ? "" : "s"} added to ${attribute.name}`,
        skipped > 0 ? `${skipped} already existed and ${skipped === 1 ? "was" : "were"} skipped` : undefined,
      );
    } else if (skipped > 0) {
      toastInfo("All selected values already exist", "Nothing was added");
    }
    setSelected(new Set());
    onClose();
  }

  return (
    <Dialog
      open={open}
      title={attribute ? `Quick Add ${attribute.name} Values` : "Quick Add Values"}
      description="Select predefined values for quick setup. Values that already exist cannot be selected again."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={onAddSelected} disabled={selectedCount === 0 || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {submitting ? `Adding… ${progress.done}/${progress.total}` : `Add Selected${selectedCount ? ` (${selectedCount})` : ""}`}
          </Button>
        </>
      }
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Search values…" />

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="xs" onClick={selectAllFiltered} disabled={!filtered.length || submitting}>
            Select All
          </Button>
          <span className="text-muted-foreground">·</span>
          <Button type="button" variant="ghost" size="xs" onClick={clearFiltered} disabled={!filteredSelectedCount || submitting}>
            Clear All
          </Button>
        </div>
        <div className="text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{selectedCount}</span>
        </div>
      </div>

      {submitError ? (
        <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {submitError}
        </div>
      ) : null}

      <div className="mt-2 max-h-[46vh] overflow-y-auto rounded-md border sm:max-h-[52vh]">
        {!filtered.length ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No values match your search.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((label) => {
              const checked = selected.has(label);
              const exists = alreadyAdded(label);
              return (
                <li key={label}>
                  <label
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5",
                      exists ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-accent/50",
                      checked && "bg-accent/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 accent-primary"
                      checked={checked}
                      disabled={exists || submitting}
                      onChange={() => toggle(label)}
                      aria-label={exists ? `${label} already added` : `Select ${label}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                    {exists ? (
                      <Badge variant="outline" className="shrink-0" title="This value already exists and cannot be added again">
                        Already added
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        Available
                      </Badge>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
