"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, ErrorState, Field, Modal, PageHeader, Skeleton, TablePagination, btnGhost, btnPrimary, inputClass, Badge } from "@/components/ui";
import { toastError, toastSuccess, toastWarn } from "@/lib/toast";

type Row = {
  id: string;
  variantId: string;
  product: string;
  sku: string;
  variant: string;
  locationId: string;
  location: string;
  available: number;
  reserved: number;
  inTransit: number;
  cost: number;
  stockValue: number;
  status: string;
};

type Loc = { id: string; name: string };
type Movement = { id: string; type: string; quantity: string; reason?: string | null; createdAt: string; locationId: string };
type Detail = { stock: Row[]; movements: Movement[]; variant: { sku: string; product: { name: string } } };

export default function InventoryPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [action, setAction] = useState<null | { type: "adjust" | "transfer" | "reserve"; row: Row }>(null);

  const locs = useQuery({ queryKey: ["inv-locs"], queryFn: () => api<Loc[]>("/api/v1/inventory/locations") });
  const list = useQuery({
    queryKey: ["inventory", q, locationId, status],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (locationId) p.set("locationId", locationId);
      if (status) p.set("status", status);
      return api<Row[]>(`/api/v1/inventory?${p.toString()}`);
    },
  });
  const detail = useQuery({
    queryKey: ["inv-var", viewId],
    queryFn: () => api<Detail>(`/api/v1/inventory/${viewId}`),
    enabled: !!viewId,
  });

  const adjust = useMutation({
    mutationFn: (body: object) => api("/api/v1/inventory/adjust", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toastSuccess("Stock adjusted");
      setAction(null);
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toastError(e, "Adjust failed"),
  });
  const transfer = useMutation({
    mutationFn: (body: object) => api("/api/v1/inventory/transfer", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toastSuccess("Stock transferred");
      setAction(null);
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toastError(e, "Transfer failed"),
  });
  const reserve = useMutation({
    mutationFn: (body: object) => api("/api/v1/inventory/reserve", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toastSuccess("Reservation updated");
      setAction(null);
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toastError(e, "Reserve failed"),
  });

  const { rows, pager } = usePagedRows(list.data ?? []);
  const { rows: movementRows, pager: movementPager } = usePagedRows(detail.data?.movements ?? []);

  return (
    <AppShell>
      <PageHeader title="Inventory">
        <input className={inputClass + " w-48"} placeholder="Search product / SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass + " w-40"} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">All locations</option>
          {(locs.data ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select className={inputClass + " w-36"} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="IN_STOCK">In stock</option>
          <option value="LOW">Low stock</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
        </select>
      </PageHeader>
      {list.isLoading ? <Skeleton rows={8} /> : null}
      {list.isError ? <ErrorState message="Could not load inventory." onRetry={() => list.refetch()} /> : null}
      {!list.isLoading && !list.data?.length ? <EmptyState title="No stock rows" hint="Receive or adjust stock to populate this list." /> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-2">Product</th>
              <th>SKU</th>
              <th>Variant</th>
              <th>Location</th>
              <th className="text-right">Avail</th>
              <th className="text-right">Reserved</th>
              <th className="text-right">In transit</th>
              <th className="text-right">Cost</th>
              <th className="text-right">Value</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-1.5">{r.product}</td>
                <td>{r.sku}</td>
                <td>{r.variant}</td>
                <td>{r.location}</td>
                <td className="text-right tabular-nums">{r.available}</td>
                <td className="text-right tabular-nums">{r.reserved}</td>
                <td className="text-right tabular-nums">{r.inTransit}</td>
                <td className="text-right tabular-nums">{Number(r.cost).toFixed(2)}</td>
                <td className="text-right tabular-nums">{Number(r.stockValue).toFixed(2)}</td>
                <td>
                  <Badge variant={r.status === "OUT_OF_STOCK" ? "destructive" : r.status === "LOW" ? "warning" : "success"}>
                    {r.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap">
                  <button type="button" className="text-xs underline" onClick={() => setViewId(r.variantId)}>
                    View
                  </button>{" "}
                  <button type="button" className="text-xs underline" onClick={() => setAction({ type: "adjust", row: r })}>
                    Adjust
                  </button>{" "}
                  <button type="button" className="text-xs underline" onClick={() => setAction({ type: "transfer", row: r })}>
                    Transfer
                  </button>{" "}
                  <button type="button" className="text-xs underline" onClick={() => setAction({ type: "reserve", row: r })}>
                    Reserve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination {...pager} />
      </div>

      {viewId ? (
        <Card className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">
              {detail.data?.variant.product.name} · {detail.data?.variant.sku}
            </div>
            <button type="button" className={btnGhost} onClick={() => setViewId(null)}>
              Close
            </button>
          </div>
          {detail.isLoading ? <Skeleton /> : null}
          <div className="text-xs font-medium uppercase text-muted-foreground">History</div>
          <ul className="mt-1 max-h-56 overflow-auto text-sm">
            {movementRows.map((m) => (
              <li key={m.id} className="flex justify-between border-b border-line py-1">
                <span>
                  {m.type} {m.reason ? `· ${m.reason}` : ""}
                </span>
                <span className="tabular-nums">
                  {m.quantity} · {new Date(m.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          <TablePagination {...movementPager} />
        </Card>
      ) : null}

      {action ? (
        <StockAction
          action={action}
          locations={locs.data ?? []}
          busy={adjust.isPending || transfer.isPending || reserve.isPending}
          onClose={() => setAction(null)}
          onAdjust={(body: Record<string, unknown>) => {
            if (!body.reason) return toastWarn("Reason is required");
            adjust.mutate(body);
          }}
          onTransfer={(body) => transfer.mutate(body)}
          onReserve={(body) => reserve.mutate(body)}
        />
      ) : null}
    </AppShell>
  );
}

function StockAction({
  action,
  locations,
  busy,
  onClose,
  onAdjust,
  onTransfer,
  onReserve,
}: {
  action: { type: "adjust" | "transfer" | "reserve"; row: Row };
  locations: Loc[];
  busy: boolean;
  onClose: () => void;
  onAdjust: (b: Record<string, unknown>) => void;
  onTransfer: (b: object) => void;
  onReserve: (b: object) => void;
}) {
  const r = action.row;
  const [qty, setQty] = useState("1");
  const [direction, setDirection] = useState("INCREASE");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [toLocationId, setTo] = useState(locations.find((l) => l.id !== r.locationId)?.id ?? "");
  const [release, setRelease] = useState(false);

  return (
    <Modal title={`${action.type} · ${r.sku}`} onClose={onClose} className="max-w-md space-y-3">
        <Field label="Quantity">
          <input className={inputClass} value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        {action.type === "adjust" ? (
          <>
            <Field label="Direction">
              <select className={inputClass} value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="INCREASE">Increase</option>
                <option value="DECREASE">Decrease</option>
              </select>
            </Field>
            <Field label="Reason">
              <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </>
        ) : null}
        {action.type === "transfer" ? (
          <Field label="To location">
            <select className={inputClass} value={toLocationId} onChange={(e) => setTo(e.target.value)}>
              {locations
                .filter((l) => l.id !== r.locationId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </Field>
        ) : null}
        {action.type === "reserve" ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} />
            Release reservation
          </label>
        ) : null}
        <Field label="Notes">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => {
              if (action.type === "adjust")
                onAdjust({
                  variantId: r.variantId,
                  locationId: r.locationId,
                  direction,
                  quantity: Number(qty),
                  reason,
                  notes,
                });
              if (action.type === "transfer")
                onTransfer({
                  variantId: r.variantId,
                  fromLocationId: r.locationId,
                  toLocationId,
                  quantity: Number(qty),
                  notes,
                });
              if (action.type === "reserve")
                onReserve({
                  variantId: r.variantId,
                  locationId: r.locationId,
                  quantity: Number(qty),
                  release,
                });
            }}
          >
            Confirm
          </button>
        </div>
    </Modal>
  );
}
