"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
} from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type TenantRow = {
  id: string;
  name: string;
  country: string;
  subscriptionStatus: string;
  apiAccessEnabled: boolean;
  plan?: { id: string; name: string; price: string; currency: string } | null;
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
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setCountry("BD");
    setPlanId(planRows[0]?.id ?? "");
    setSubscriptionStatus("TRIAL");
    setTrialEnd("");
    setFormOpen(true);
  }

  function openEdit(row: TenantRow) {
    setEditing(row);
    setName(row.name);
    setCountry(row.country);
    setPlanId(row.plan?.id ?? "");
    setSubscriptionStatus(row.subscriptionStatus);
    setTrialEnd(row.trialEnd ? row.trialEnd.slice(0, 10) : "");
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

  return (
    <AppShell>
      <PageHeader title="Tenants" description="Every shop on the platform. Disable API access when last month’s bill is unpaid.">
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          New tenant
        </Button>
      </PageHeader>
      <ListFrame list={list} searchPlaceholder="Search tenants" columnCount={7} emptyTitle="No tenants">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Plan</TableHead>
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
                <TableCell>{row.plan?.name ?? "—"}</TableCell>
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
                  <Link
                    href={`/platform/invoices?search=${encodeURIComponent(row.name)}`}
                    className="inline-flex h-9 items-center rounded-md px-3 text-sm hover:bg-accent"
                  >
                    Invoices
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPending(row)}>
                    {row.apiAccessEnabled ? "Disable API" : "Enable API"}
                  </Button>
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
            ? "Update the shop’s profile, plan, subscription status, or trial end."
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