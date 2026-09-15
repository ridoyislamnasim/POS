"use client";

import { FormEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { useVariantOptions } from "@/lib/lookups";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, Dialog, Field, FilterSelect, PageHeader, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellNumeric, IconActionButton } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastCreated, toastError, toastSuccess } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";
import { DAMAGE_REASONS, newIdempotencyKey } from "@/lib/stock-workflow";
import { useHelpCreateAction } from "@/lib/help";
import { Check, X, Send } from "lucide-react";

type Row = {
  id: string;
  number: string;
  status: string;
  reason: string;
  totalQty: string;
  totalCost: string;
  createdAt: string;
  description?: string | null;
};

export default function DamagePage() {
  const { me, can } = useMe();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  useHelpCreateAction(() => setOpen(true), can("inventory.damage.create") || can("inventory.adjust"));
  const [pending, setPending] = useState<{ id: string; action: "submit" | "approve" | "reject" } | null>(null);
  const [extraDamage, setExtraDamage] = useState<{ variantId: string; qty: string }[]>([]);
  const keyRef = useRef(newIdempotencyKey());
  const locs = useQuery({ queryKey: ["inv-locs"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/inventory/locations") });
  const variantsQ = useVariantOptions();
  const variants = variantsQ.data ?? [];
  const list = useServerList<Row>("damages", "/api/v1/inventory/damages", {
    extraKeys: ["reason"],
    extraLabels: { reason: "Reason" },
  });
  const summary = useQuery({
    queryKey: ["damages-summary"],
    queryFn: () => api<{ damagedQty: number; damageCost: string; count: number }>("/api/v1/inventory/damages/summary"),
  });
  const [form, setForm] = useState({
    branchId: "",
    locationId: "",
    reason: "BROKEN",
    description: "",
    variantId: "",
    qty: "1",
    submit: true,
    photo: "",
  });
  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/inventory/damages", {
        method: "POST",
        idempotencyKey: keyRef.current,
        body: JSON.stringify({
          branchId: form.branchId,
          locationId: form.locationId || undefined,
          reason: form.reason,
          description: form.description,
          submit: form.submit,
          attachmentDataUrl: form.photo || undefined,
          items: [
            { variantId: form.variantId, qty: Number(form.qty) },
            ...extraDamage.filter((l) => l.variantId && Number(l.qty) > 0).map((l) => ({ variantId: l.variantId, qty: Number(l.qty) })),
          ],
        }),
      }),
    onSuccess: () => {
      toastCreated("damage report");
      keyRef.current = newIdempotencyKey();
      setExtraDamage([]);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["damages"] });
    },
    onError: (e) => toastError(e, "Could not save damage"),
  });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "submit" | "approve" | "reject" }) =>
      api(`/api/v1/inventory/damages/${id}/${action}`, {
        method: "POST",
        idempotencyKey: newIdempotencyKey(),
        body: action === "reject" ? JSON.stringify({ reason: "Rejected from UI" }) : undefined,
      }),
    onSuccess: (_, vars) => {
      toastSuccess(vars.action === "approve" ? "Stock adjusted" : vars.action === "reject" ? "Rejected" : "Submitted");
      setPending(null);
      qc.invalidateQueries({ queryKey: ["damages"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toastError(e, "Action failed"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
        <PageHeader title="Stock damage" description="Creating a report does not reduce stock. Only an approved report moves available qty into damaged stock.">
          {can("inventory.damage.create") || can("inventory.adjust") ? (
            <Button type="button" data-help="dmg-new" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Report damage</Button>
          ) : null}
        </PageHeader>
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border bg-card px-3 py-2"><div className="text-[11px] uppercase text-muted-foreground">Reports</div><div className="font-semibold">{summary.data?.count ?? "—"}</div></div>
          <div className="rounded-md border bg-card px-3 py-2"><div className="text-[11px] uppercase text-muted-foreground">Damaged qty</div><div className="font-semibold tabular-nums">{summary.data?.damagedQty ?? "—"}</div></div>
          <div className="rounded-md border bg-card px-3 py-2"><div className="text-[11px] uppercase text-muted-foreground">Cost impact</div><div className="font-semibold tabular-nums">{summary.data?.damageCost ?? "—"}</div></div>
        </div>
        <ListFrame
          list={list}
          searchPlaceholder="Search damage ID"
          dateFilter
          statusOptions={[
            { value: "DRAFT", label: "Draft" },
            { value: "SUBMITTED", label: "Submitted" },
            { value: "STOCK_ADJUSTED", label: "Stock adjusted" },
            { value: "REJECTED", label: "Rejected" },
          ]}
          extraFilters={
            <FilterSelect
              value={String(list.extras.reason ?? "")}
              onChange={(v) => list.setFilter("reason", v)}
              placeholder="Reason"
              options={DAMAGE_REASONS.map((r) => ({ value: r.value, label: r.label }))}
            />
          }
          columnCount={6}
          emptyTitle="No records found"
          emptyHint="Draft a report, submit it, then approve to move stock."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className={tableCellNumeric}>Qty</TableHead>
                <TableHead className={tableCellNumeric}>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium"><Link className="hover:underline" href={`/damage/${r.id}`}>{r.number}</Link></TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell className={tableCellNumeric}>{Number(r.totalQty)}</TableCell>
                  <TableCell className={tableCellNumeric}>{moneyCell(r.totalCost)}</TableCell>
                  <TableCell><StatusBadge value={r.status} /></TableCell>
                  <TableCell className="space-x-2">
                    {r.status === "DRAFT" && can("inventory.damage.create") ? (
                      <IconActionButton icon={<Send className="h-3.5 w-3.5" />} label="Submit damage report" onClick={() => setPending({ id: r.id, action: "submit" })} />
                    ) : null}
                    {r.status === "SUBMITTED" && (can("inventory.damage.approve") || can("inventory.adjust")) ? (
                      <>
                        <IconActionButton icon={<Check className="h-3.5 w-3.5" />} label="Approve and adjust stock" variant="success" onClick={() => setPending({ id: r.id, action: "approve" })} />
                        <IconActionButton icon={<X className="h-3.5 w-3.5" />} label="Reject report" variant="destructive" onClick={() => setPending({ id: r.id, action: "reject" })} />
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListFrame>
        <Dialog
          open={open}
          title="Report damage"
          description="Stock is unchanged until a manager approves this report."
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" form="dmg-form" disabled={create.isPending}>{form.submit ? "Submit" : "Save draft"}</Button>
            </>
          }
        >
          <form id="dmg-form" className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <Field label="Branch *">
              <select className={inputClass} required value={form.branchId} onChange={(e) => setForm((s) => ({ ...s, branchId: e.target.value }))}>
                <option value="">Select</option>
                {(me?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <select className={inputClass} value={form.locationId} onChange={(e) => setForm((s) => ({ ...s, locationId: e.target.value }))}>
                <option value="">Branch default</option>
                {(locs.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Reason *">
              <select className={inputClass} value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}>
                {DAMAGE_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="SKU *">
              <select className={inputClass} required value={form.variantId} onChange={(e) => setForm((s) => ({ ...s, variantId: e.target.value }))}>
                <option value="">Select</option>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}
              </select>
            </Field>
            <Field label="Qty *"><input className={inputClass} type="number" min="0.0001" step="any" required value={form.qty} onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))} /></Field>
            <Field label="Description"><input className={inputClass} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></Field>
            <div className="sm:col-span-2 space-y-2">
              {extraDamage.map((line, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-3">
                  <select className={inputClass} value={line.variantId} onChange={(e) => setExtraDamage((rows) => rows.map((r, i) => i === idx ? { ...r, variantId: e.target.value } : r))}>
                    <option value="">SKU</option>
                    {variants.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}
                  </select>
                  <input className={inputClass} type="number" min="0.0001" step="any" value={line.qty} onChange={(e) => setExtraDamage((rows) => rows.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))} />
                  <Button type="button" variant="outline" onClick={() => setExtraDamage((rows) => rows.filter((_, i) => i !== idx))}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setExtraDamage((rows) => [...rows, { variantId: "", qty: "1" }])}>Add another SKU</Button>
            </div>
            <Field label="Photo">
              <input
                className={inputClass}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return setForm((s) => ({ ...s, photo: "" }));
                  const reader = new FileReader();
                  reader.onload = () => setForm((s) => ({ ...s, photo: String(reader.result ?? "") }));
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.submit} onChange={(e) => setForm((s) => ({ ...s, submit: e.target.checked }))} />
              Submit for approval
            </label>
          </form>
        </Dialog>
        <ConfirmDialog
          open={Boolean(pending)}
          title={pending?.action === "approve" ? "Approve damage and adjust stock?" : pending?.action === "reject" ? "Reject this report?" : "Submit damage report?"}
          description={pending?.action === "approve" ? "Available stock decreases and damaged stock increases by the reported qty." : "No stock change until approval."}
          confirmLabel={pending?.action === "approve" ? "Approve" : pending?.action === "reject" ? "Reject" : "Submit"}
          variant={pending?.action === "reject" ? "danger" : "warning"}
          loading={act.isPending}
          onClose={() => setPending(null)}
          onConfirm={() => pending && act.mutate(pending)}
        />
      </motion.div>
    </AppShell>
  );
}
