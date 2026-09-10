"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { FilterSelect, PageHeader, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, tableCellNumeric, tableSubText } from "@/components/ui";

type Movement = {
  id: string;
  type: string;
  bucket?: string;
  quantity: string;
  beforeQuantity?: string | null;
  afterQuantity?: string | null;
  value?: string | null;
  sku?: string;
  product?: string;
  location?: string;
  user?: string | null;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
};

const TYPES = ["OPENING", "SALE", "SALE_RETURN", "PURCHASE", "PURCHASE_RETURN", "TRANSFER_OUT", "TRANSFER_IN", "ADJUSTMENT", "DAMAGE", "QUARANTINE"];

export default function LedgerPage() {
  const locs = useQuery({ queryKey: ["inv-locs"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/inventory/locations") });
  const list = useServerList<Movement>("ledger", "/api/v1/inventory/movements", {
    extraKeys: ["type", "locationId"],
    extraLabels: { type: "Type", locationId: "Location" },
  });
  const summary = useQuery({
    queryKey: ["stock-summary", list.extras.locationId],
    queryFn: () => {
      const p = new URLSearchParams();
      if (list.extras.locationId) p.set("locationId", String(list.extras.locationId));
      return api<{ available: number; reserved: number; damaged: number; quarantine: number; physical: number; availableValue: string; damagedValue: string }>(`/api/v1/inventory/summary?${p.toString()}`);
    },
  });

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
        <PageHeader title="Inventory ledger" description="Every stock change is an append-only movement with before/after qty." />
        <div className="mb-3 grid gap-2 sm:grid-cols-5">
          {[
            ["Available", summary.data?.available],
            ["Reserved", summary.data?.reserved],
            ["Damaged", summary.data?.damaged],
            ["Quarantine", summary.data?.quarantine],
            ["Physical", summary.data?.physical],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border bg-card px-3 py-2">
              <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
              <div className="font-semibold tabular-nums">{value ?? "—"}</div>
            </div>
          ))}
        </div>
        <ListFrame
          list={list}
          searchPlaceholder="Search SKU, product, reference"
          dateFilter
          extraFilters={
            <>
              <FilterSelect
                value={String(list.extras.locationId ?? "")}
                onChange={(v) => list.setFilter("locationId", v)}
                placeholder="Location"
                options={(locs.data ?? []).map((l) => ({ value: l.id, label: l.name }))}
              />
              <FilterSelect
                value={String(list.extras.type ?? "")}
                onChange={(v) => list.setFilter("type", v)}
                placeholder="Type"
                options={TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))}
              />
            </>
          }
          columnCount={8}
          emptyTitle="No records found"
        >
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className={tableCellNumeric}>Qty</TableHead>
                <TableHead className={tableCellNumeric}>Before</TableHead>
                <TableHead className={tableCellNumeric}>After</TableHead>
                <TableHead>Ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(m.createdAt).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge value={m.type} /></TableCell>
                  <TableCell>{m.bucket ?? "AVAILABLE"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{m.sku}</div>
                    <div className={tableSubText}>{m.product}</div>
                  </TableCell>
                  <TableCell className={tableCellNumeric}>{Number(m.quantity)}</TableCell>
                  <TableCell className={tableCellNumeric}>{m.beforeQuantity ?? "—"}</TableCell>
                  <TableCell className={tableCellNumeric}>{m.afterQuantity ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.referenceType ?? ""} {m.reason ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListFrame>
        <p className="mt-2 text-xs text-muted-foreground">Available value {summary.data?.availableValue ?? "—"} · Damaged value {summary.data?.damagedValue ?? "—"}</p>
      </motion.div>
    </AppShell>
  );
}
