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
  FilterSelect,
  SearchInput,
} from "@/components/ui";

export type CommonUnit = {
  name: string;
  abbreviation: string;
  category: string;
};

/**
 * Frontend-only predefined units commonly used in Bangladesh retail/business.
 * Each abbreviation is unique across the whole list so the same unit is never
 * offered twice (e.g. Piece/pcs lives under "Quantity / Count" only).
 * Created through the existing Units API — no separate model or endpoint.
 */
export const COMMON_UNITS: CommonUnit[] = [
  // -- Weight
  { name: "Kilogram", abbreviation: "kg", category: "Weight" },
  { name: "Gram", abbreviation: "g", category: "Weight" },
  { name: "Milligram", abbreviation: "mg", category: "Weight" },
  { name: "Metric Ton", abbreviation: "ton", category: "Weight" },
  { name: "Maund", abbreviation: "maund", category: "Weight" },
  { name: "Seer", abbreviation: "seer", category: "Weight" },
  // -- Length
  { name: "Meter", abbreviation: "m", category: "Length" },
  { name: "Centimeter", abbreviation: "cm", category: "Length" },
  { name: "Millimeter", abbreviation: "mm", category: "Length" },
  { name: "Kilometer", abbreviation: "km", category: "Length" },
  { name: "Inch", abbreviation: "in", category: "Length" },
  { name: "Foot", abbreviation: "ft", category: "Length" },
  { name: "Yard", abbreviation: "yd", category: "Length" },
  // -- Area
  { name: "Square Foot", abbreviation: "sq ft", category: "Area" },
  { name: "Square Meter", abbreviation: "sq m", category: "Area" },
  { name: "Decimal", abbreviation: "decimal", category: "Area" },
  { name: "শতক", abbreviation: "শতক", category: "Area" },
  { name: "কাঠা", abbreviation: "কাঠা", category: "Area" },
  { name: "বিঘা", abbreviation: "বিঘা", category: "Area" },
  // -- Volume
  { name: "Liter", abbreviation: "L", category: "Volume" },
  { name: "Milliliter", abbreviation: "mL", category: "Volume" },
  { name: "Gallon", abbreviation: "gal", category: "Volume" },
  // -- Quantity / Count (also covers clothing/fashion: pcs, pair, set, dz)
  { name: "Piece", abbreviation: "pcs", category: "Quantity / Count" },
  { name: "Piece", abbreviation: "pc", category: "Quantity / Count" },
  { name: "Dozen", abbreviation: "dz", category: "Quantity / Count" },
  { name: "Pair", abbreviation: "pair", category: "Quantity / Count" },
  { name: "Set", abbreviation: "set", category: "Quantity / Count" },
  { name: "Box", abbreviation: "box", category: "Quantity / Count" },
  { name: "Packet", abbreviation: "pkt", category: "Quantity / Count" },
  { name: "Carton", abbreviation: "carton", category: "Quantity / Count" },
  { name: "Bundle", abbreviation: "bundle", category: "Quantity / Count" },
  // -- Packaging
  { name: "Bag", abbreviation: "bag", category: "Packaging" },
  { name: "Sack", abbreviation: "sack", category: "Packaging" },
  { name: "Bottle", abbreviation: "bottle", category: "Packaging" },
  { name: "Jar", abbreviation: "jar", category: "Packaging" },
  { name: "Can", abbreviation: "can", category: "Packaging" },
  { name: "Roll", abbreviation: "roll", category: "Packaging" },
  { name: "Pack", abbreviation: "pack", category: "Packaging" },
  // -- Other retail / business units
  { name: "Tray", abbreviation: "tray", category: "Other" },
  { name: "Case", abbreviation: "case", category: "Other" },
  { name: "Strip", abbreviation: "strip", category: "Other" },
  { name: "Sheet", abbreviation: "sheet", category: "Other" },
  { name: "Coil", abbreviation: "coil", category: "Other" },
  { name: "Tube", abbreviation: "tube", category: "Other" },
  { name: "Drum", abbreviation: "drum", category: "Other" },
];

export const COMMON_UNIT_CATEGORIES = Array.from(new Set(COMMON_UNITS.map((u) => u.category)));

type ExistingUnit = { id: string; name: string; abbreviation: string };

const norm = (v: string) => v.trim().toLowerCase();

function isDuplicateError(e: unknown) {
  const rec = e as { code?: string; status?: number; message?: string } | null;
  if (!rec || typeof rec !== "object") return false;
  // Backend maps Prisma P2002 (tenantId + abbreviation) to CONFLICT / 409 "Already exists".
  if (rec.code === "CONFLICT" || rec.status === 409) return true;
  return /already exists|already in use|duplicate|unique/i.test(rec.message ?? "");
}

export function CommonUnitsDialog({
  open,
  path,
  queryKey,
  onClose,
}: {
  open: boolean;
  path: string;
  queryKey: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset dialog state every time it opens.
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setCategory("");
    setSelected(new Set());
    setSubmitError(null);
    setProgress({ done: 0, total: 0 });
  }, [open ]);

  // Existing tenant units for duplicate detection. The backend unique rule is
  // (tenantId, abbreviation), so matching is done on the abbreviation.
  const existing = useQuery({
    queryKey: [queryKey, "common-existing"],
    queryFn: () => apiList<ExistingUnit>(`${path}?limit=100`),
    enabled: open,
    staleTime: 0,
  });
  const existingAbbr = useMemo(() => {
    const set = new Set<string>();
    for (const u of existing.data?.data ?? []) set.add(norm(u.abbreviation));
    return set;
  }, [existing.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COMMON_UNITS.filter((u) => {
      if (category && u.category !== category) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.abbreviation.toLowerCase().includes(q) ||
        u.category.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  const toggle = (abbr: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(abbr)) next.delete(abbr);
      else next.add(abbr);
      return next;
    });
  };

  // Select All / Clear All apply only to the currently filtered list.
  const selectAllFiltered = () => {
    setSelected((prev) => new Set([...prev, ...filtered.map((u) => u.abbreviation)]));
  };
  const clearFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const u of filtered) next.delete(u.abbreviation);
      return next;
    });
  };

  const selectedCount = selected.size;
  const filteredSelectedCount = filtered.filter((u) => selected.has(u.abbreviation)).length;

  async function onAddSelected() {
    if (!selectedCount || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const picked = COMMON_UNITS.filter((u) => selected.has(u.abbreviation));
    setProgress({ done: 0, total: picked.length });
    let created = 0;
    let skipped = 0;
    const failed: string[] = [];
    // Sequential creates through the existing Units create API (same tenant
    // context, validation and ACTIVE default as manual Create Unit).
    for (const unit of picked) {
      try {
        if (existingAbbr.has(norm(unit.abbreviation))) {
          skipped += 1;
        } else {
          await api(path, {
            method: "POST",
            body: JSON.stringify({ name: unit.name, abbreviation: unit.abbreviation, status: "ACTIVE" }),
          });
          existingAbbr.add(norm(unit.abbreviation));
          created += 1;
        }
      } catch (e) {
        if (isDuplicateError(e)) skipped += 1;
        else failed.push(unit.name);
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setSubmitting(false);

    if (failed.length) {
      // Keep the dialog open so the user can retry; refresh for partial success.
      if (created > 0) await queryClient.invalidateQueries({ queryKey: [queryKey] });
      setSubmitError(`Could not add ${failed.length} unit(s): ${failed.join(", ")}. Please try again.`);
      toastError(`Failed to add ${failed.length} unit(s)`, "Some units were not created");
      return;
    }
    if (created > 0) {
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
      toastSuccess(
        `${created} common unit${created === 1 ? "" : "s"} added successfully`,
        skipped > 0 ? `${skipped} already existed and ${skipped === 1 ? "was" : "were"} skipped` : undefined,
      );
    } else if (skipped > 0) {
      toastInfo("All selected units already exist", "Nothing was added");
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      title="Add Common Units"
      description="Select predefined units commonly used in Bangladesh. Existing units are skipped, never duplicated."
      size="xl"
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search common units…" className="sm:max-w-none" />
        <FilterSelect
          value={category}
          onChange={setCategory}
          options={COMMON_UNIT_CATEGORIES.map((c) => ({ value: c, label: c }))}
          placeholder="All categories"
          className="h-8 text-xs"
        />
      </div>

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
          <span className="ml-1">
            · {filtered.length} of {COMMON_UNITS.length} shown
          </span>
        </div>
      </div>

      {submitError ? (
        <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {submitError}
        </div>
      ) : null}

      <div className="mt-2 max-h-[46vh] overflow-y-auto rounded-md border sm:max-h-[52vh]">
        {!filtered.length ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No common units match your search.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((u) => {
              const checked = selected.has(u.abbreviation);
              const alreadyExists = existingAbbr.has(norm(u.abbreviation));
              return (
                <li key={u.abbreviation}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-accent/50",
                      checked && "bg-accent/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 accent-primary"
                      checked={checked}
                      disabled={submitting}
                      onChange={() => toggle(u.abbreviation)}
                      aria-label={`Select ${u.name}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{u.name}</span>
                    <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {u.abbreviation}
                    </code>
                    <Badge variant="secondary" className="hidden shrink-0 min-[480px]:inline-flex">
                      {u.category}
                    </Badge>
                    {alreadyExists ? (
                      <Badge variant="outline" className="shrink-0" title="This unit already exists and will be skipped">
                        Exists
                      </Badge>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {existing.isLoading ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">Checking existing units…</p>
      ) : existing.isError ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Could not load existing units — duplicates will still be skipped safely on submit.
        </p>
      ) : null}
    </Dialog>
  );
}
