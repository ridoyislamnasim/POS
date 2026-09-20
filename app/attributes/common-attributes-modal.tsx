"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api, apiList } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  Badge,
  Button,
  Dialog,
  SearchInput,
} from "@/components/ui";

/**
 * Frontend-only predefined variant attributes for quick setup.
 * Created through the existing Attribute create API — no separate model or
 * endpoint. Payload stays `{ name, variantDefining: true }`.
 */
export const COMMON_ATTRIBUTES = [
  "Colour",
  "Size",
  "Weight",
  "Volume",
  "Material",
  "Brand",
  "Style",
  "Pattern",
  "Length",
  "Width",
  "Height",
  "Capacity",
  "Fit",
  "Season",
];

const ATTRS_PATH = "/api/v1/catalog/attributes";
const ATTRS_QUERY_KEY = "attrs";

type ExistingAttr = { id: string; name: string; key: string };

const norm = (v: string) => v.trim().toLowerCase();

/** Mirror of the backend key rule: slugify(name) with "-" replaced by "_". */
function candidateKey(name: string) {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (s || "item").replace(/-/g, "_");
}

function isDuplicateError(e: unknown) {
  const rec = e as { code?: string; status?: number; message?: string } | null;
  if (!rec || typeof rec !== "object") return false;
  // Backend maps Prisma P2002 (tenantId + key) to CONFLICT / 409 "Already exists".
  if (rec.code === "CONFLICT" || rec.status === 409) return true;
  return /already exists|already in use|duplicate|unique/i.test(rec.message ?? "");
}

export function CommonAttributesDialog({
  open,
  onClose,
}: {
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
  }, [open]);

  // Existing tenant attributes for duplicate detection. The backend unique rule
  // is (tenantId, key), so matching is done on the slugified key (plus the
  // normalized name as a fallback for custom keys).
  const existing = useQuery({
    queryKey: [ATTRS_QUERY_KEY, "common-existing"],
    queryFn: () => apiList<ExistingAttr>(`${ATTRS_PATH}?limit=100`),
    enabled: open,
    staleTime: 0,
  });
  const existingLookup = useMemo(() => {
    const keys = new Set<string>();
    const names = new Set<string>();
    for (const a of existing.data?.data ?? []) {
      if (a.key) keys.add(norm(a.key));
      if (a.name) names.add(norm(a.name));
    }
    return { keys, names };
  }, [existing.data]);

  const alreadyAdded = (name: string) =>
    existingLookup.keys.has(norm(candidateKey(name))) || existingLookup.names.has(norm(name));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COMMON_ATTRIBUTES;
    return COMMON_ATTRIBUTES.filter((n) => n.toLowerCase().includes(q));
  }, [search]);

  const toggle = (name: string) => {
    if (alreadyAdded(name)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Select All / Clear All apply only to available (not already-added) filtered items.
  const selectAllFiltered = () => {
    setSelected((prev) => new Set([...prev, ...filtered.filter((n) => !alreadyAdded(n))]));
  };
  const clearFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const n of filtered) next.delete(n);
      return next;
    });
  };

  const selectedCount = selected.size;
  const filteredSelectedCount = filtered.filter((n) => selected.has(n)).length;

  async function onAddSelected() {
    if (!selectedCount || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const picked = COMMON_ATTRIBUTES.filter((n) => selected.has(n));
    setProgress({ done: 0, total: picked.length });
    let created = 0;
    let skipped = 0;
    const failed: string[] = [];
    // Sequential creates through the existing Attribute create API (same tenant
    // context, validation and variantDefining default as manual Create).
    for (const name of picked) {
      try {
        if (alreadyAdded(name)) {
          skipped += 1;
        } else {
          await api(ATTRS_PATH, {
            method: "POST",
            body: JSON.stringify({ name, variantDefining: true }),
          });
          existingLookup.keys.add(norm(candidateKey(name)));
          existingLookup.names.add(norm(name));
          created += 1;
        }
      } catch (e) {
        if (isDuplicateError(e)) skipped += 1;
        else failed.push(name);
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setSubmitting(false);

    if (failed.length) {
      // Keep the dialog open so the user can retry; refresh for partial success.
      if (created > 0) await queryClient.invalidateQueries({ queryKey: [ATTRS_QUERY_KEY] });
      setSubmitError(`Could not add ${failed.length} attribute(s): ${failed.join(", ")}. Please try again.`);
      toastError(`Failed to add ${failed.length} attribute(s)`, "Some attributes were not created");
      return;
    }
    if (created > 0) {
      await queryClient.invalidateQueries({ queryKey: [ATTRS_QUERY_KEY] });
      toastSuccess(
        `${created} common attribute${created === 1 ? "" : "s"} added successfully`,
        skipped > 0 ? `${skipped} already existed and ${skipped === 1 ? "was" : "were"} skipped` : undefined,
      );
    } else if (skipped > 0) {
      toastInfo("All selected attributes already exist", "Nothing was added");
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      title="Add Common Attributes"
      description="Select predefined variant attributes for quick setup. Attributes that already exist cannot be selected again."
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
      <SearchInput value={search} onChange={setSearch} placeholder="Search common attributes…" />

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
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No common attributes match your search.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((name) => {
              const checked = selected.has(name);
              const exists = alreadyAdded(name);
              return (
                <li key={name}>
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
                      onChange={() => toggle(name)}
                      aria-label={exists ? `${name} already added` : `Select ${name}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                    {exists ? (
                      <Badge variant="outline" className="shrink-0" title="This attribute already exists and cannot be added again">
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
      {existing.isLoading ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">Checking existing attributes…</p>
      ) : existing.isError ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Could not load existing attributes — duplicates will still be skipped safely on submit.
        </p>
      ) : null}
    </Dialog>
  );
}
