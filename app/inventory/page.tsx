"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { useMe } from "@/lib/auth";
import { usePOSStore } from "@/lib/pos-store";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Card,
  Field,
  FilterSelect,
  Modal,
  PageHeader,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLoadingSkeleton,
  TablePagination,
  TableRow,
  Truncate,
  btnGhost,
  btnPrimary,
  inputClass,
  tableCellActions,
  tableCellNumeric,
} from "@/components/ui";
import { ArrowRightLeft, ArrowUpDown, Bookmark, Eye, type LucideIcon } from "lucide-react";
import { toastError, toastSuccess, toastWarn } from "@/lib/toast";
import { usePagedRows } from "@/lib/use-pagination";

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
  damaged?: number;
  quarantine?: number;
  physical?: number;
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
  const { me } = useMe();
  const branchId = usePOSStore((s) => s.branchId);
  const [viewId, setViewId] = useState<string | null>(null);
  const [action, setAction] = useState<null | { type: "adjust" | "transfer" | "reserve"; row: Row }>(null);
  const [takeOpen, setTakeOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});

  const locs = useQuery({ queryKey: ["inv-locs"], queryFn: () => api<Loc[]>("/api/v1/inventory/locations") });
  const list = useServerList<Row>("inventory", "/api/v1/inventory", {
    extraKeys: ["locationId"],
    extraLabels: { locationId: "Location" },
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
  const stockTake = useMutation({
    mutationFn: () => {
      const loc = list.extras.locationId || (list.rows[0]?.locationId ?? "");
      const lines = list.rows
        .filter((r) => !list.extras.locationId || r.locationId === loc)
        .map((r) => ({ variantId: r.variantId, countedQty: Number(counts[r.id] ?? r.available) }));
      return api("/api/v1/inventory/stock-takes", {
        method: "POST",
        body: JSON.stringify({
          branchId: branchId ?? me?.branches[0]?.id,
          locationId: loc,
          notes: "Stock take",
          lines,
        }),
      });
    },
    onSuccess: () => {
      toastSuccess("Stock take posted");
      setTakeOpen(false);
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toastError(e, "Stock take failed"),
  });

  const { rows: movementRows, pager: movementPager } = usePagedRows(detail.data?.movements ?? []);

  return (
    <AppShell>
      <PageHeader title="Inventory">
        <button type="button" className={btnGhost} onClick={() => setTakeOpen(true)}>
          Stock take
        </button>
      </PageHeader>
      <ListFrame
        list={list}
        searchPlaceholder="Search product / SKU"
        statusOptions={[
          { value: "IN_STOCK", label: "In stock" },
          { value: "LOW", label: "Low stock" },
          { value: "OUT_OF_STOCK", label: "Out of stock" },
        ]}
        extraFilters={
          <FilterSelect
            value={list.extras.locationId as string}
            onChange={(v) => list.setFilter("locationId", v)}
            placeholder="Location"
            options={(locs.data ?? []).map((l) => ({ value: l.id, label: l.name }))}
          />
        }
        columnCount={11}
        emptyTitle="No records found"
        emptyHint="Receive or adjust stock to populate this list."
      >
        <Table className="min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className={tableCellNumeric}>Avail</TableHead>
              <TableHead className={tableCellNumeric}>Reserved</TableHead>
              <TableHead className={tableCellNumeric}>Damaged</TableHead>
              <TableHead className={tableCellNumeric}>Hold</TableHead>
              <TableHead className={tableCellNumeric}>Cost</TableHead>
              <TableHead className={tableCellNumeric}>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[8%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Truncate>{r.product}</Truncate>
                </TableCell>
                <TableCell>{r.sku}</TableCell>
                <TableCell>{r.variant}</TableCell>
                <TableCell>{r.location}</TableCell>
                <TableCell className={tableCellNumeric}>{r.available}</TableCell>
                <TableCell className={tableCellNumeric}>{r.reserved}</TableCell>
                <TableCell className={tableCellNumeric}>{r.damaged ?? 0}</TableCell>
                <TableCell className={tableCellNumeric}>{r.quarantine ?? 0}</TableCell>
                <TableCell className={tableCellNumeric}>{Number(r.cost).toFixed(2)}</TableCell>
                <TableCell className={tableCellNumeric}>{Number(r.stockValue).toFixed(2)}</TableCell>
                <TableCell>
                  <StatusBadge value={r.status} />
                </TableCell>
                <TableCell className={tableCellActions }>
                  <div className="grid grid-cols-2 place-items-center gap-1 ">
                    <IconActionButton label="View" color="blue" icon={Eye} onClick={() => setViewId(r.variantId)} />
                    <IconActionButton label="Adjust" color="amber" icon={ArrowUpDown} onClick={() => setAction({ type: "adjust", row: r })} />
                    <IconActionButton label="Transfer" color="emerald" icon={ArrowRightLeft} onClick={() => setAction({ type: "transfer", row: r })} />
                    <IconActionButton label="Reserve" color="violet" icon={Bookmark} onClick={() => setAction({ type: "reserve", row: r })} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>

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
          {detail.isLoading ? <TableLoadingSkeleton columns={3} rows={4} /> : null}
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
      {takeOpen ? (
        <Modal title="Stock take" onClose={() => setTakeOpen(false)} className="max-w-lg space-y-3">
          <p className="text-sm text-muted-foreground">Enter counted qty for the filtered location. Variances post as adjustments.</p>
          <div className="max-h-72 overflow-auto text-sm">
            {list.rows
              .filter((r) => !list.extras.locationId || r.locationId === list.extras.locationId)
              .slice(0, 40)
              .map((r) => (
                <div key={r.id} className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate">
                    {r.sku} · sys {r.available}
                  </span>
                  <input
                    className={inputClass + " w-24"}
                    value={counts[r.id] ?? String(r.available)}
                    onChange={(e) => setCounts((s) => ({ ...s, [r.id]: e.target.value }))}
                  />
                </div>
              ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setTakeOpen(false)}>
              Cancel
            </button>
            <button type="button" className={btnPrimary} disabled={stockTake.isPending} onClick={() => stockTake.mutate()}>
              Post count
            </button>
          </div>
        </Modal>
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

const tooltipColors = {
  blue: { bg: "bg-blue-600", arrow: "bg-blue-600" },
  amber: { bg: "bg-amber-500", arrow: "bg-amber-500" },
  emerald: { bg: "bg-emerald-500", arrow: "bg-emerald-500" },
  violet: { bg: "bg-violet-500", arrow: "bg-violet-500" },
} as const;

function IconActionButton({
  label,
  color,
  icon: Icon,
  onClick,
}: {
  label: string;
  color: keyof typeof tooltipColors;
  icon: LucideIcon;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const c = tooltipColors[color];

  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      left: Math.min(Math.max(rect.left + rect.width / 2, 44), window.innerWidth - 44),
      top: rect.top - 10,
    });
    setOpen(true);
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary transition-all duration-200 hover:bg-secondary hover:shadow"
    >
      <Icon className="h-5 w-5 transition-transform duration-200" />
      <AnimatePresence>
        {open ? (
          <span
            key="tooltip"
            className="pointer-events-none fixed z-50"
            style={{ left: pos.left, top: pos.top, transform: "translate(-50%, -100%)" }}
          >
            <motion.span
              className={`relative block whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg ${c.bg}`}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {label}
              <span className={`absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 ${c.arrow}`} />
            </motion.span>
          </span>
        ) : null}
      </AnimatePresence>
    </button>
  );
}
