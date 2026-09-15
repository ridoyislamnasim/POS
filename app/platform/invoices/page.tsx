"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { downloadPlatformInvoice } from "@/lib/documents";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Button,
  Field,
  PageHeader,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  inputClass,
  tableCellActions,
  tableCellNumeric,
  IconActionButton,
  ActionTooltip,
} from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import { FileText, Send, CheckCircle, Receipt, RotateCcw, BadgePercent, Pencil, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

type DiscountType = "NONE" | "PERCENT" | "FLAT";

type Invoice = {
  id: string;
  number: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: string;
  subtotal?: string | null;
  discountType?: string;
  discountValue?: string;
  discountAmount?: string | null;
  currency: string;
  status: string;
  sentAt?: string | null;
  paidAt?: string | null;
  tenant?: { id: string; name: string };
};

type TenantOpt = {
  id: string;
  name: string;
  plan?: { id?: string; name?: string; price: string; currency: string } | null;
  discountType?: string;
  discountValue?: string;
};

type ConfirmKind = "send" | "paid" | "receipt" | null;

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastMonthDefaults() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 7));
  return { periodStart: ymd(start), periodEnd: ymd(end), dueDate: ymd(due) };
}

export default function PlatformInvoicesPage() {
  const router = useRouter();
  const { me, isSuccess } = useMe();
  const defaults = lastMonthDefaults();
  const list = useServerList<Invoice>("platform-invoices", "/api/v1/platform-billing/invoices", {
    enabled: Boolean(me?.isPlatform),
  });
  const tenants = useQuery({
    queryKey: ["platform-tenant-options"],
    queryFn: () => api<TenantOpt[]>("/api/v1/platform-billing/tenants?limit=100"),
    enabled: Boolean(me?.isPlatform),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [amount, setAmount] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("NONE");
  const [discountValue, setDiscountValue] = useState("");
  const [periodStart, setPeriodStart] = useState(defaults.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaults.periodEnd);
  const [dueDate, setDueDate] = useState(defaults.dueDate);
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState<Invoice | null>(null);
  const [kind, setKind] = useState<ConfirmKind>(null);
  const [editing, setEditing] = useState<Invoice | null>(null);

  const isEditable = (row: Invoice) => row.status === "PENDING" || row.status === "OVERDUE";

  useEffect(() => {
    if (isSuccess && me && !me.isPlatform) router.replace("/dashboard");
  }, [isSuccess, me, router]);

  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/platform-billing/invoices", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          amount: amount || undefined,
          discountType,
          discountValue: discountType === "NONE" ? 0 : Number(discountValue) || 0,
          periodStart,
          periodEnd,
          dueDate,
          notes: notes || undefined,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Invoice created");
      closeCreate();
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not create invoice"),
  });

  const act = useMutation({
    mutationFn: async () => {
      if (!target || !kind) return;
      if (kind === "send") return api(`/api/v1/platform-billing/invoices/${target.id}/send`, { method: "POST" });
      if (kind === "paid") {
        return api(`/api/v1/platform-billing/invoices/${target.id}/status`, {
          method: "POST",
          body: JSON.stringify({ status: "PAID" }),
        });
      }
      return api(`/api/v1/platform-billing/invoices/${target.id}/receipt`, { method: "POST" });
    },
    onSuccess: () => {
      toastSuccess(kind === "send" ? "Invoice sent" : kind === "paid" ? "Marked paid" : "Receipt sent");
      setTarget(null);
      setKind(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not update invoice"),
  });

  const save = useMutation({
    mutationFn: () =>
      api(`/api/v1/platform-billing/invoices/${editing?.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: amount || undefined,
          discountType,
          discountValue: discountType === "NONE" ? 0 : Number(discountValue) || 0,
          periodStart,
          periodEnd,
          dueDate,
          notes: notes || undefined,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Invoice updated");
      closeCreate();
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not update invoice"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (editing) save.mutate();
    else create.mutate();
  }

  const tenantRows = ((tenants.data as unknown as TenantOpt[]) ?? []).filter((t) => t.id);

  const selectedTenant = tenantRows.find((t) => t.id === tenantId) ?? null;
  const tenantPlanName = selectedTenant?.plan?.name ?? null;
  const tenantPlanPrice = selectedTenant?.plan ? Number(selectedTenant.plan.price) || 0 : 0;
  const tenantCurrency = selectedTenant?.plan?.currency ?? "BDT";
  const typedAmount = amount.trim() === "" ? null : Math.max(0, Number(amount) || 0);
  const amountOverridden = typedAmount !== null && typedAmount !== tenantPlanPrice;
  const baseAmount = typedAmount ?? tenantPlanPrice;

  function tenantDefaultOf(t: TenantOpt | null): { type: DiscountType; value: number } {
    if (!t) return { type: "NONE", value: 0 };
    const dt = String(t.discountType ?? "NONE").toUpperCase();
    const dv = Number(t.discountValue ?? 0) || 0;
    if ((dt === "PERCENT" || dt === "FLAT") && dv > 0) return { type: dt, value: dv };
    return { type: "NONE", value: 0 };
  }
  const tenantDefault = tenantDefaultOf(selectedTenant);
  const discountModified = discountType !== tenantDefault.type || (Number(discountValue) || 0) !== tenantDefault.value;

  const draftDiscValue = discountType === "NONE" ? 0 : Math.max(0, Number(discountValue) || 0);
  const percentCapped = discountType === "PERCENT" && draftDiscValue > 100;
  const flatCapped = discountType === "FLAT" && draftDiscValue > baseAmount && baseAmount > 0;
  const draftDiscAmount =
    discountType === "PERCENT"
      ? Math.min(baseAmount, (baseAmount * Math.min(100, draftDiscValue)) / 100)
      : discountType === "FLAT"
        ? Math.min(baseAmount, draftDiscValue)
        : 0;
  const draftPayable = Math.max(0, baseAmount - draftDiscAmount);

  function pickTenant(id: string) {
    setTenantId(id);
    setAmount("");
    const t = tenantRows.find((r) => r.id === id) ?? null;
    const d = tenantDefaultOf(t);
    setDiscountType(d.type);
    setDiscountValue(d.value > 0 ? String(d.value) : "");
  }

  function resetDiscountToDefault() {
    setDiscountType(tenantDefault.type);
    setDiscountValue(tenantDefault.value > 0 ? String(tenantDefault.value) : "");
  }

  function openCreate() {
    setEditing(null);
    if (!tenantId && tenantRows[0]) {
      pickTenant(tenantRows[0].id);
    } else if (tenantId) {
      pickTenant(tenantId);
    }
    setPeriodStart(defaults.periodStart);
    setPeriodEnd(defaults.periodEnd);
    setDueDate(defaults.dueDate);
    setNotes("");
    setCreateOpen(true);
  }

  function openEdit(row: Invoice) {
    if (!isEditable(row)) return;
    setEditing(row);
    setTenantId(row.tenantId);
    setAmount(row.subtotal != null ? String(Number(row.subtotal)) : "");
    const dt = String(row.discountType ?? "NONE").toUpperCase();
    setDiscountType(dt === "PERCENT" || dt === "FLAT" ? dt : "NONE");
    const dv = Number(row.discountValue ?? 0);
    setDiscountValue(dv > 0 ? String(dv) : "");
    setPeriodStart(row.periodStart.slice(0, 10));
    setPeriodEnd(row.periodEnd.slice(0, 10));
    setDueDate(row.dueDate.slice(0, 10));
    setNotes("");
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setEditing(null);
    setNotes("");
    setAmount("");
    setDiscountType("NONE");
    setDiscountValue("");
  }

  function invoiceDiscountLabel(row: Invoice) {
    const t = String(row.discountType ?? "NONE").toUpperCase();
    const v = Number(row.discountValue ?? 0);
    if (t === "PERCENT" && v > 0) return `${v}%`;
    const off = Number(row.discountAmount ?? 0);
    if (off > 0) return `−${row.currency} ${off.toFixed(0)}`;
    return null;
  }

  return (
    <AppShell>
      <PageHeader title="Platform invoices" description="Create a bill, send it to the tenant, mark paid after you verify payment, then send a receipt.">
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          New invoice
        </Button>
      </PageHeader>
      <ListFrame
        list={list}
        searchPlaceholder="Search number or shop"
        dateFilter
        columnCount={8}
        statusOptions={[
          { value: "PENDING", label: "Pending" },
          { value: "OVERDUE", label: "Overdue" },
          { value: "PAID", label: "Paid" },
          { value: "VOID", label: "Void" },
        ]}
        emptyTitle="No invoices"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className={tableCellNumeric}>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className={tableCellActions}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.number}</TableCell>
                <TableCell>{row.tenant?.name ?? row.tenantId}</TableCell>
                <TableCell>
                  {row.periodStart.slice(0, 10)} – {row.periodEnd.slice(0, 10)}
                </TableCell>
                <TableCell>{row.dueDate.slice(0, 10)}</TableCell>
                <TableCell className={tableCellNumeric}>
                  {row.currency} {Number(row.amount).toFixed(0)}
                  {invoiceDiscountLabel(row) ? (
                    <div className="text-[11px] font-normal text-sky-700 dark:text-sky-300">discount {invoiceDiscountLabel(row)}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusBadge value={row.status} />
                </TableCell>
                <TableCell>{row.sentAt ? new Date(row.sentAt).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className={tableCellActions}>
                    <IconActionButton icon={<FileText className="h-3.5 w-3.5" />} label="Download PDF" onClick={() => downloadPlatformInvoice(row.id, "invoice", row.number).catch((e) => toastError(e, "PDF failed"))} />
                    {isEditable(row) ? (
                      <IconActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Edit invoice" onClick={() => openEdit(row)} />
                    ) : (
                      <IconActionButton
                        icon={<Lock className="h-3.5 w-3.5" />}
                        label={row.status === "PAID" ? "Paid — editing locked" : "Void — editing locked"}
                        description={row.status === "PAID" ? "Paid invoices can't be edited" : "Void invoices can't be edited"}
                        disabled
                      />
                    )}
                    {row.status !== "VOID" ? (
                      <IconActionButton icon={<Send className="h-3.5 w-3.5" />} label="Send invoice" onClick={() => {
                        setTarget(row);
                        setKind("send");
                      }} />
                    ) : null}
                    {row.status !== "PAID" && row.status !== "VOID" ? (
                      <IconActionButton icon={<CheckCircle className="h-3.5 w-3.5" />} label="Mark as paid" onClick={() => {
                        setTarget(row);
                        setKind("paid");
                      }} />
                    ) : null}
                    {row.status === "PAID" ? (
                      <IconActionButton icon={<Receipt className="h-3.5 w-3.5" />} label="Send receipt" onClick={() => {
                        setTarget(row);
                        setKind("receipt");
                      }} />
                    ) : null}
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>

      <Dialog
        open={createOpen}
        title={editing ? `Edit invoice ${editing.number}` : "Create platform invoice"}
        description={
          editing
            ? "Unpaid invoices can be edited until payment. Paid or void invoices are locked."
            : "Billed amount defaults to the tenant’s plan price minus its default discount. Adjust only when needed."
        }
        size="lg"
        onClose={closeCreate}
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeCreate}>
              Cancel
            </Button>
            <ActionTooltip label={tenantId ? `${editing ? "Save invoice" : "Create invoice"} · payable ${tenantCurrency} ${draftPayable.toFixed(0)}` : "Select a tenant first"} side="top" variant="primary">
              <span className="inline-flex">
                <Button type="submit" form="platform-invoice-form" disabled={create.isPending || save.isPending || !tenantId}>
                  {create.isPending || save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editing ? "Save" : "Create"} · {tenantCurrency} {draftPayable.toFixed(0)}
                </Button>
              </span>
            </ActionTooltip>
          </>
        }
      >
        <form id="platform-invoice-form" className="grid gap-4" onSubmit={onSubmit}>
          <Field label="Tenant *">
            <select
              className={inputClass}
              required
              autoFocus={!editing}
              value={tenantId}
              onChange={(e) => pickTenant(e.target.value)}
              disabled={Boolean(editing)}
              aria-describedby={editing ? "invoice-tenant-locked" : undefined}
            >
              <option value="">Select tenant</option>
              {tenantRows.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.plan?.name ? ` — ${t.plan.name} · ${t.plan.currency} ${Number(t.plan.price).toFixed(0)}` : " — no plan"}
                </option>
              ))}
            </select>
          </Field>
          {editing ? (
            <p id="invoice-tenant-locked" className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden />
              Tenant can’t be changed after creation — edit amount, discount, dates, or notes.
            </p>
          ) : null}

          {selectedTenant ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-orange-200/70 bg-gradient-to-r from-orange-50/80 to-amber-50/50 px-3 py-2.5 text-sm dark:border-orange-900 dark:from-orange-950/30 dark:to-amber-950/20">
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Plan default price</div>
                <div className="truncate text-base font-semibold tabular-nums">
                  {tenantPlanName ?? "No plan"}{" "}
                  <span className="text-muted-foreground">·</span> {tenantCurrency} {tenantPlanPrice.toFixed(0)}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                {tenantDefault.type === "NONE" ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">No default discount</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800">
                    <BadgePercent className="h-3 w-3" aria-hidden />
                    Default {tenantDefault.type === "PERCENT" ? `${tenantDefault.value}%` : `−${tenantCurrency} ${tenantDefault.value}`} off
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
              Select a tenant to see its plan default price and discount.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Field label="Billed amount">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={tenantPlanPrice ? `Plan default ${tenantPlanPrice.toFixed(0)}` : "Enter amount"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-describedby="invoice-amount-hint"
                />
              </Field>
              <div id="invoice-amount-hint" className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{amountOverridden ? "Custom amount" : "Using plan default price"}</span>
                {amountOverridden ? (
                  <button
                    type="button"
                    onClick={() => setAmount("")}
                    className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-300"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden />
                    Use plan price
                  </button>
                ) : null}
              </div>
            </div>
            <div>
              <span className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                Discount
                {discountModified && tenantDefault.type !== "NONE" ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    modified
                  </span>
                ) : null}
              </span>
              <div className="inline-flex rounded-md border bg-background p-0.5" role="group" aria-label="Discount type">
                {(["NONE", "PERCENT", "FLAT"] as DiscountType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={discountType === t}
                    onClick={() => {
                      setDiscountType(t);
                      if (t === "NONE") setDiscountValue("");
                    }}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      discountType === t ? "bg-sky-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t === "NONE" ? "None" : t === "PERCENT" ? "% Percent" : "৳ Flat"}
                  </button>
                ))}
              </div>
              {discountType !== "NONE" ? (
                <>
                  <input
                    className={cn(inputClass, "mt-1.5")}
                    type="number"
                    min="0"
                    max={discountType === "PERCENT" ? 100 : undefined}
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "PERCENT" ? "Percent 0–100" : `Flat ${tenantCurrency}`}
                    aria-label={discountType === "PERCENT" ? "Discount percent" : "Discount flat amount"}
                  />
                  {percentCapped ? (
                    <p className="mt-1 text-[11px] text-destructive">Percent is capped at 100%.</p>
                  ) : flatCapped ? (
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Flat discount is capped at the subtotal.</p>
                  ) : discountModified && tenantDefault.type !== "NONE" ? (
                    <button
                      type="button"
                      onClick={resetDiscountToDefault}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-300"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden />
                      Reset to tenant default ({tenantDefault.type === "PERCENT" ? `${tenantDefault.value}%` : `${tenantCurrency} ${tenantDefault.value}`})
                    </button>
                  ) : null}
                </>
              ) : tenantDefault.type !== "NONE" ? (
                <button
                  type="button"
                  onClick={resetDiscountToDefault}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-300"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Apply tenant default ({tenantDefault.type === "PERCENT" ? `${tenantDefault.value}%` : `${tenantCurrency} ${tenantDefault.value}`})
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm" aria-live="polite">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal {amountOverridden ? "(custom)" : "(plan default)"}</span>
              <span className="tabular-nums">{tenantCurrency} {baseAmount.toFixed(0)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-muted-foreground">
              <span>Discount {discountType === "NONE" ? "" : discountType === "PERCENT" ? `(${draftDiscValue}%)` : "(flat)"}</span>
              <span className="tabular-nums text-sky-700 dark:text-sky-300">−{tenantCurrency} {draftDiscAmount.toFixed(0)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t pt-1.5 text-base font-semibold">
              <span>Payable</span>
              <span className="tabular-nums">{tenantCurrency} {draftPayable.toFixed(0)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Period start">
              <input className={inputClass} type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </Field>
            <Field label="Period end">
              <input className={inputClass} type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </Field>
            <Field label="Due date">
              <input className={inputClass} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Notes">
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </Field>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(target && kind)}
        title={
          kind === "send"
            ? "Send this invoice?"
            : kind === "paid"
              ? "Mark invoice as paid?"
              : "Send payment receipt?"
        }
        description={
          kind === "send"
            ? `${target?.number} will appear in the tenant owner’s notifications.`
            : kind === "paid"
              ? `${target?.number} will be marked paid. You can send a receipt next.`
              : `${target?.number} receipt will be sent to the tenant owner.`
        }
        confirmLabel={kind === "send" ? "Send" : kind === "paid" ? "Mark paid" : "Send receipt"}
        variant="warning"
        loading={act.isPending}
        onClose={() => {
          setTarget(null);
          setKind(null);
        }}
        onConfirm={() => act.mutate()}
      />
    </AppShell>
  );
}
