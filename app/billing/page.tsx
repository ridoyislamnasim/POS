"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BadgePercent, CreditCard, Eye, FileText, Receipt, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Badge,
  Button,
  Dialog,
  IconActionButton,
  PageHeader,
  Panel,
  StatusBadge,
  SummaryCards,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  tableCellActions,
  tableCellNumeric,
} from "@/components/ui";
import { downloadPlatformInvoice } from "@/lib/documents";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/cn";

type PlanInfo = {
  tenant: {
    id: string;
    name: string;
    subscriptionStatus: string;
    discountType: string;
    discountValue: number;
    discountReason: string | null;
  };
  plan: {
    id: string;
    name: string;
    code: string;
    price: string;
    yearlyPrice: string | null;
    currency: string;
  } | null;
};

type MyInvoice = {
  id: string;
  number: string;
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
  notes?: string | null;
};

function discountOff(subtotal: number, type: string, value: number) {
  const t = String(type ?? "NONE").toUpperCase();
  if (t === "PERCENT") return Math.min(subtotal, (subtotal * Math.min(100, value)) / 100);
  if (t === "FLAT") return Math.min(subtotal, Math.max(0, value));
  return 0;
}

function discountLabel(type: string, value: number, currency: string) {
  const t = String(type ?? "NONE").toUpperCase();
  if (t === "PERCENT" && value > 0) return `${value}%`;
  if (t === "FLAT" && value > 0) return `−${currency} ${value.toFixed(0)}`;
  return "—";
}

function isOverdue(row: MyInvoice) {
  return (row.status === "PENDING" || row.status === "OVERDUE") && new Date(row.dueDate).getTime() < Date.now();
}

export default function BillingPage() {
  const router = useRouter();
  const { me, can, isSuccess } = useMe();
  const [view, setView] = useState<MyInvoice | null>(null);

  useEffect(() => {
    if (!isSuccess || !me) return;
    if (me.isPlatform) router.replace("/platform/invoices");
    else if (!can("plan.manage")) router.replace("/dashboard");
  }, [isSuccess, me, can, router]);

  const enabled = Boolean(me && !me.isPlatform);

  const planInfo = useQuery({
    queryKey: ["my-billing-plan"],
    queryFn: () => api<PlanInfo>("/api/v1/saas/plan"),
    enabled,
  });

  const list = useServerList<MyInvoice>("my-invoices", "/api/v1/platform-billing/my-invoices", { enabled });

  const unpaid = useQuery({
    queryKey: ["my-invoices-unpaid"],
    queryFn: () => api<MyInvoice[]>("/api/v1/platform-billing/my-invoices?unpaid=true&limit=100"),
    enabled,
  });

  const summary = useMemo(() => {
    const rows = unpaid.data ?? [];
    const unpaidAmount = rows.reduce((n, r) => n + (Number(r.amount) || 0), 0);
    const overdue = rows.filter((r) => new Date(r.dueDate).getTime() < Date.now()).length;
    const currency = rows[0]?.currency ?? planInfo.data?.plan?.currency ?? "BDT";
    const nextDue = rows
      .map((r) => new Date(r.dueDate).getTime())
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b)[0];
    return {
      unpaidAmount,
      unpaidCount: rows.length,
      overdue,
      currency,
      nextDue: nextDue ? new Date(nextDue).toLocaleDateString() : "—",
    };
  }, [unpaid.data, planInfo.data]);

  const plan = planInfo.data?.plan ?? null;
  const tenant = planInfo.data?.tenant ?? null;
  const planPrice = plan ? Number(plan.price) || 0 : 0;
  const planCurrency = plan?.currency ?? summary.currency;
  const tenantDiscount = tenant ? discountOff(planPrice, tenant.discountType, Number(tenant.discountValue) || 0) : 0;
  const planPayable = Math.max(0, planPrice - tenantDiscount);

  return (
    <AppShell>
      <PageHeader title="Billing & Invoices" description="Your plan price, discount, and every bill from the platform.">
        <Button variant="outline" onClick={() => router.push("/subscription")}>
          <CreditCard className="mr-1.5 h-4 w-4" />
          Manage subscription
        </Button>
      </PageHeader>

      <SummaryCards
        items={[
          {
            label: "Unpaid total",
            value: `${summary.currency} ${summary.unpaidAmount.toFixed(0)}`,
            description: summary.unpaidCount ? `${summary.unpaidCount} bill${summary.unpaidCount > 1 ? "s" : ""} · next due ${summary.nextDue}` : "All clear",
            tone: summary.unpaidCount ? "warning" : "increase",
          },
          {
            label: "Overdue",
            value: summary.overdue,
            description: summary.overdue ? "Pay soon to keep access" : "Nothing overdue",
            tone: summary.overdue ? "decrease" : "increase",
          },
          {
            label: "Current plan",
            value: plan ? `${planCurrency} ${planPayable.toFixed(0)}/mo` : "—",
            description: plan ? `${plan.name}${tenantDiscount > 0 ? " · discount applied" : ""}` : "No plan assigned",
          },
          {
            label: "Subscription",
            value: tenant?.subscriptionStatus?.replace(/_/g, " ") ?? "—",
            description: tenant?.name ?? "",
          },
        ]}
      />

      {plan && tenant ? (
        <Panel className="mb-3 border-amber-200/70 bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:border-amber-900 dark:from-amber-950/30 dark:to-orange-950/20">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Plan default price</div>
              <div className="text-lg font-semibold tabular-nums">
                {plan.name} · {planCurrency} {planPrice.toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
            </div>
            {tenantDiscount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Discount {discountLabel(tenant.discountType, Number(tenant.discountValue) || 0, planCurrency)} · pay {planCurrency} {planPayable.toFixed(0)}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">No discount on your plan</span>
            )}
            {tenant.discountReason ? <span className="text-xs text-muted-foreground">{tenant.discountReason}</span> : null}
            <Badge variant={tenant.subscriptionStatus === "ACTIVE" ? "default" : "secondary"} className="ml-auto">
              {tenant.subscriptionStatus.replace(/_/g, " ")}
            </Badge>
          </div>
        </Panel>
      ) : null}

      <ListFrame
        list={list}
        searchPlaceholder="Search invoice number"
        dateFilter
        columnCount={7}
        emptyTitle="No bills yet"
        emptyHint="Bills from the platform appear here every month."
        statusOptions={[
          { value: "PENDING", label: "Pending" },
          { value: "OVERDUE", label: "Overdue" },
          { value: "PAID", label: "Paid" },
          { value: "VOID", label: "Void" },
        ]}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className={tableCellNumeric}>Payable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className={tableCellActions}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-medium">{row.number}</div>
                  {Number(row.discountAmount ?? 0) > 0 ? (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                      <BadgePercent className="h-3 w-3" aria-hidden />
                      discount {row.currency} {Number(row.discountAmount).toFixed(0)}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {row.periodStart.slice(0, 10)} – {row.periodEnd.slice(0, 10)}
                </TableCell>
                <TableCell className={cn("whitespace-nowrap text-xs", isOverdue(row) && "font-medium text-destructive")}>
                  {row.dueDate.slice(0, 10)}
                </TableCell>
                <TableCell className={tableCellNumeric}>
                  {row.currency} {Number(row.amount).toFixed(0)}
                </TableCell>
                <TableCell>
                  <StatusBadge value={row.status} />
                </TableCell>
                <TableCell className={tableCellActions}>
                  <IconActionButton icon={<Eye className="h-3.5 w-3.5" />} label="View bill details" onClick={() => setView(row)} />
                  <IconActionButton
                    icon={<FileText className="h-3.5 w-3.5" />}
                    label="Download invoice PDF"
                    onClick={() => downloadPlatformInvoice(row.id, "invoice", row.number).catch((e) => toastError(e, "PDF failed"))}
                  />
                  {row.status === "PAID" ? (
                    <IconActionButton
                      icon={<Receipt className="h-3.5 w-3.5" />}
                      label="Download payment receipt"
                      variant="success"
                      onClick={() => downloadPlatformInvoice(row.id, "receipt", row.number).catch((e) => toastError(e, "Receipt failed"))}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>

      <Dialog
        open={Boolean(view)}
        title={view ? `Bill ${view.number}` : "Bill"}
        description="Full breakdown of this platform bill."
        onClose={() => setView(null)}
        footer={
          view ? (
            <>
              <Button type="button" variant="outline" onClick={() => downloadPlatformInvoice(view.id, "invoice", view.number).catch((e) => toastError(e, "PDF failed"))}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Invoice PDF
              </Button>
              {view.status === "PAID" ? (
                <Button type="button" onClick={() => downloadPlatformInvoice(view.id, "receipt", view.number).catch((e) => toastError(e, "Receipt failed"))}>
                  <Receipt className="mr-1.5 h-3.5 w-3.5" />
                  Receipt
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      >
        {view ? (
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Period</span>
              <span className="tabular-nums">{view.periodStart.slice(0, 10)} – {view.periodEnd.slice(0, 10)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Due date</span>
              <span className={cn("tabular-nums", isOverdue(view) && "font-medium text-destructive")}>{view.dueDate.slice(0, 10)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{view.currency} {Number(view.subtotal ?? view.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums text-emerald-700 dark:text-emerald-300">
                −{view.currency} {Number(view.discountAmount ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between gap-2 border-t pt-2 text-base font-semibold">
              <span>Payable</span>
              <span className="tabular-nums">{view.currency} {Number(view.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge value={view.status} />
            </div>
            {view.paidAt ? (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Paid on</span>
                <span className="tabular-nums">{new Date(view.paidAt).toLocaleDateString()}</span>
              </div>
            ) : null}
            {view.notes ? (
              <p className="rounded-md bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">{view.notes}</p>
            ) : null}
            {view.status !== "PAID" && view.status !== "VOID" ? (
              <p className="text-xs text-muted-foreground">Pay offline, then the platform owner marks this bill paid and you get a receipt here.</p>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </AppShell>
  );
}
