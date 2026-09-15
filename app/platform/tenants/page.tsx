"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Badge,
  Button,
  Dialog,
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
import { Pencil, Ban, Users, Percent, BadgePercent } from "lucide-react";
import { cn } from "@/lib/cn";

type DiscountType = "NONE" | "PERCENT" | "FLAT";

type TenantRow = {
  id: string;
  name: string;
  country: string;
  subscriptionStatus: string;
  apiAccessEnabled: boolean;
  plan?: { id: string; name: string; price: string; currency: string } | null;
  discountType?: DiscountType | string;
  discountValue?: string;
  discountReason?: string | null;
  unpaidCount: number;
  overdueCount: number;
  unpaidAmount: string;
  invoiceCount: number;
  trialEnd?: string | null;
};

type PlanOpt = { id: string; code: string; name: string; interval: string; price: string; currency: string };

const SUBSCRIPTION_OPTIONS = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "GRACE_PERIOD",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
];

export default function PlatformTenantsPage() {
  const router = useRouter();
  const { me, isSuccess } = useMe();
  const list = useServerList<TenantRow>("platform-tenants", "/api/v1/platform-billing/tenants", {
    enabled: Boolean(me?.isPlatform),
    defaultSort: "createdAt",
  });
  const [pending, setPending] = useState<TenantRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TenantRow | null>(null);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("BD");
  const [planId, setPlanId] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("TRIAL");
  const [trialEnd, setTrialEnd] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("NONE");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");

  const plans = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => api<PlanOpt[]>("/api/v1/platform-billing/plans"),
    enabled: Boolean(me?.isPlatform),
  });

  useEffect(() => {
    if (isSuccess && me && !me.isPlatform) router.replace("/dashboard");
  }, [isSuccess, me, router]);

  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/platform-billing/tenants", {
        method: "POST",
        body: JSON.stringify({
          name,
          country: country || undefined,
          planId: planId || undefined,
          subscriptionStatus,
          trialEnd: trialEnd || undefined,
          discountType,
          discountValue: discountType === "NONE" ? 0 : Number(discountValue) || 0,
          discountReason: discountReason || undefined,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Tenant created", name);
      closeForm();
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not create tenant"),
  });

  const update = useMutation({
    mutationFn: () =>
      api(`/api/v1/platform-billing/tenants/${editing?.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          country: country || undefined,
          planId: planId || undefined,
          subscriptionStatus,
          trialEnd: trialEnd || undefined,
          discountType,
          discountValue: discountType === "NONE" ? 0 : Number(discountValue) || 0,
          discountReason: discountReason || undefined,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Tenant saved", name);
      closeForm();
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not save tenant"),
  });

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setName("");
    setCountry("BD");
    setPlanId("");
    setSubscriptionStatus("TRIAL");
    setTrialEnd("");
    setDiscountType("NONE");
    setDiscountValue("");
    setDiscountReason("");
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setCountry("BD");
    setPlanId(planRows[0]?.id ?? "");
    setSubscriptionStatus("TRIAL");
    setTrialEnd("");
    setDiscountType("NONE");
    setDiscountValue("");
    setDiscountReason("");
    setFormOpen(true);
  }

  function openEdit(row: TenantRow) {
    setEditing(row);
    setName(row.name);
    setCountry(row.country);
    setPlanId(row.plan?.id ?? "");
    setSubscriptionStatus(row.subscriptionStatus);
    setTrialEnd(row.trialEnd ? row.trialEnd.slice(0, 10) : "");
    const dt = String(row.discountType ?? "NONE").toUpperCase() as DiscountType;
    setDiscountType(dt === "PERCENT" || dt === "FLAT" ? dt : "NONE");
    const dv = Number(row.discountValue ?? 0);
    setDiscountValue(dv > 0 ? String(dv) : "");
    setDiscountReason(row.discountReason ?? "");
    setFormOpen(true);
  }

  const toggle = useMutation({
    mutationFn: (row: TenantRow) =>
      api(`/api/v1/platform-billing/tenants/${row.id}/api-access`, {
        method: "POST",
        body: JSON.stringify({
          enabled: !row.apiAccessEnabled,
          reason: row.apiAccessEnabled
            ? "Please pay your previous month's bill to continue using the platform."
            : undefined,
        }),
      }),
    onSuccess: (_data, row) => {
      toastSuccess(row.apiAccessEnabled ? "API access disabled" : "API access restored", row.name);
      setPending(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not update API access"),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (editing) update.mutate();
    else create.mutate();
  }

  const planRows = (plans.data ?? []).filter((p) => p.id);

  const selectedPlan = planRows.find((p) => p.id === planId) ?? null;
  const selectedPlanPrice = selectedPlan ? Number(selectedPlan.price) || 0 : 0;
  const selectedPlanCurrency = selectedPlan?.currency ?? "BDT";
  const draftDiscountValue = discountType === "NONE" ? 0 : Math.max(0, Number(discountValue) || 0);
  const draftDiscountAmount =
    discountType === "PERCENT"
      ? Math.min(selectedPlanPrice, (selectedPlanPrice * Math.min(100, draftDiscountValue)) / 100)
      : discountType === "FLAT"
        ? Math.min(selectedPlanPrice, draftDiscountValue)
        : 0;
  const draftPayable = Math.max(0, selectedPlanPrice - draftDiscountAmount);

  function discountLabel(row: TenantRow) {
    const t = String(row.discountType ?? "NONE").toUpperCase();
    const v = Number(row.discountValue ?? 0);
    if (t === "PERCENT" && v > 0) return `${v}%`;
    if (t === "FLAT" && v > 0) return `৳ ${v.toFixed(0)}`;
    return "—";
  }

  function payableFor(row: TenantRow) {
    const price = Number(row.plan?.price ?? 0) || 0;
    const t = String(row.discountType ?? "NONE").toUpperCase();
    const v = Number(row.discountValue ?? 0) || 0;
    const off = t === "PERCENT" ? Math.min(price, (price * Math.min(100, v)) / 100) : t === "FLAT" ? Math.min(price, v) : 0;
    return Math.max(0, price - off);
  }

  return (
    <AppShell>
      <PageHeader title="Tenants" description="Every shop on the platform. Disable API access when last month’s bill is unpaid.">
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          New tenant
        </Button>
      </PageHeader>
      <ListFrame list={list} searchPlaceholder="Search tenants" columnCount={9} emptyTitle="No tenants">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead className={tableCellNumeric}>Payable</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>API</TableHead>
              <TableHead className={tableCellNumeric}>Unpaid</TableHead>
              <TableHead className={tableCellNumeric}>Overdue</TableHead>
              <TableHead className={tableCellActions}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.country}</div>
                </TableCell>
                <TableCell>
                  {row.plan?.name ?? "—"}
                  {row.plan ? <div className="text-xs text-muted-foreground">৳ {Number(row.plan.price).toFixed(0)}</div> : null}
                </TableCell>
                <TableCell>
                  {discountLabel(row) === "—" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <ActionTooltip label={`Discount ${discountLabel(row)}`} description={row.discountReason ?? `Default off on ${row.plan?.name ?? "plan"} invoices`} side="top" variant="info">
                      <span className="inline-flex cursor-default items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800">
                        <BadgePercent className="h-3 w-3" aria-hidden />
                        {discountLabel(row)}
                      </span>
                    </ActionTooltip>
                  )}
                </TableCell>
                <TableCell className={tableCellNumeric}>
                  {row.plan ? `৳ ${payableFor(row).toFixed(0)}` : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge value={row.subscriptionStatus} />
                </TableCell>
                <TableCell>
                  <Badge>{row.apiAccessEnabled ? "Enabled" : "Disabled"}</Badge>
                </TableCell>
                <TableCell className={tableCellNumeric}>
                  {row.unpaidCount} · ৳ {Number(row.unpaidAmount).toFixed(0)}
                </TableCell>
                <TableCell className={tableCellNumeric}>{row.overdueCount}</TableCell>
                  <TableCell className={tableCellActions}>
                    <IconActionButton icon={<Users className="h-3.5 w-3.5" />} label="View invoices" onClick={() => router.push(`/platform/invoices?search=${encodeURIComponent(row.name)}`)} />
                    <IconActionButton icon={<Percent className="h-3.5 w-3.5" />} label={discountLabel(row) === "—" ? "Add discount" : `Edit discount (${discountLabel(row)})`} variant="info" onClick={() => openEdit(row)} />
                    <IconActionButton icon={<Pencil className="h-3.5 w-3.5" />} label="Edit tenant" onClick={() => openEdit(row)} />
                    <IconActionButton icon={<Ban className="h-3.5 w-3.5" />} label={row.apiAccessEnabled ? "Disable API access" : "Enable API access"} variant="warning" onClick={() => setPending(row)} />
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>

      <Dialog
        open={formOpen}
        title={editing ? "Edit tenant" : "Create tenant"}
        description={
          editing
            ? "Update the shop’s profile, plan, subscription status, trial end, or default discount."
            : "Creates the shop with a default business, main branch, register, and settings. You’ll invite its owner separately."
        }
        onClose={closeForm}
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" form="platform-tenant-form" disabled={create.isPending || update.isPending}>
              {(create.isPending || update.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="platform-tenant-form" className="grid gap-3" onSubmit={onCreate}>
          <Field label="Shop name *">
            <input
              className={inputClass}
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nokshi Lifestyle"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Country">
              <input className={inputClass} maxLength={2} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} />
            </Field>
            <Field label="Plan">
              <select className={inputClass} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">No plan</option>
                {planRows.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.currency} {Number(p.price).toFixed(0)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subscription status">
              <select className={inputClass} value={subscriptionStatus} onChange={(e) => setSubscriptionStatus(e.target.value)}>
                {SUBSCRIPTION_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trial end">
              <input className={inputClass} type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} />
            </Field>
          </div>
          <div className="rounded-lg border border-sky-200/70 bg-sky-50/50 p-3 dark:border-sky-900 dark:bg-sky-950/30">
            <div className="mb-2 text-sm font-medium">Default discount <span className="font-normal text-muted-foreground">— auto-applied to new invoices</span></div>
            <div className="mb-2 inline-flex rounded-md border bg-background p-0.5" role="group" aria-label="Discount type">
              {(["NONE", "PERCENT", "FLAT"] as DiscountType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={discountType === t}
                  onClick={() => setDiscountType(t)}
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
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={discountType === "PERCENT" ? "Percent (0–100)" : "Flat amount (BDT)"}>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max={discountType === "PERCENT" ? 100 : undefined}
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "PERCENT" ? "e.g. 10" : "e.g. 200"}
                  />
                </Field>
                <Field label="Reason (optional)">
                  <input
                    className={inputClass}
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g. Launch offer"
                    maxLength={200}
                  />
                </Field>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
              <span className="text-muted-foreground">Plan price <span className="font-medium text-foreground">{selectedPlan ? `${selectedPlanCurrency} ${selectedPlanPrice.toFixed(0)}` : "—"}</span></span>
              <span className="text-muted-foreground">Discount <span className="font-medium text-sky-700 dark:text-sky-300">−{selectedPlanCurrency} {draftDiscountAmount.toFixed(0)}</span></span>
              <span className="text-muted-foreground">Payable <span className="font-semibold text-foreground">{selectedPlan ? `${selectedPlanCurrency} ${draftPayable.toFixed(0)}` : "—"}</span></span>
            </div>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.apiAccessEnabled ? "Disable this tenant’s API access?" : "Restore API access?"}
        description={
          pending?.apiAccessEnabled
            ? `${pending.name} will see: Please pay your previous month's bill to continue using the platform.`
            : `${pending?.name ?? "This tenant"} can use POS, sales, and reports again.`
        }
        confirmLabel={pending?.apiAccessEnabled ? "Disable API" : "Enable API"}
        variant="warning"
        loading={toggle.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && toggle.mutate(pending)}
      />
    </AppShell>
  );
}