"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { downloadPlatformInvoice } from "@/lib/documents";
import { AppShell } from "@/components/app-shell";
import { Button, Kpi, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, Badge, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, tableCellNumeric } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError, toastSuccess } from "@/lib/toast";

type Sub = {
  tenant: { name: string; subscriptionStatus: string; plan?: { id: string; name: string; code: string } | null };
  usage: { branches: number; users: number; products: number; warehouses: number };
  limits: { maxBranches?: number; maxUsers?: number; maxProducts?: number; maxWarehouses?: number };
};
type Plan = { id: string; name: string; code: string; price: string; features: string[] };
type Bill = {
  id: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: string;
  currency: string;
  status: string;
};

export default function SubscriptionPage() {
  const [planId, setPlanId] = useState<string | null>(null);
  const sub = useQuery({ queryKey: ["sub"], queryFn: () => api<Sub>("/api/v1/saas/subscription") });
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api<Plan[]>("/api/v1/saas/plans") });
  const bills = useQuery({
    queryKey: ["my-platform-invoices"],
    queryFn: () => api<Bill[]>("/api/v1/platform-billing/my-invoices?limit=50"),
  });
  const choose = useMutation({
    mutationFn: (planId: string) => api("/api/v1/saas/subscription", { method: "POST", body: JSON.stringify({ planId }) }),
    onSuccess: () => {
      toastSuccess("Plan updated");
      setPlanId(null);
      sub.refetch();
    },
    onError: (e) => toastError(e, "Could not change plan"),
  });
  const u = sub.data?.usage;
  const l = sub.data?.limits ?? {};
  return (
    <AppShell>
      <PageHeader title="Subscription / Billing" description="Plan, feature limits, current usage, and bills from the platform." />
      <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
        <Kpi label="Branches" value={`${u?.branches ?? 0}/${l.maxBranches ?? "∞"}`} accent="sky" />
        <Kpi label="Users" value={`${u?.users ?? 0}/${l.maxUsers ?? "∞"}`} accent="violet" />
        <Kpi label="Products" value={`${u?.products ?? 0}/${l.maxProducts ?? "∞"}`} accent="orange" />
        <Kpi label="Warehouses" value={`${u?.warehouses ?? 0}/${l.maxWarehouses ?? "∞"}`} accent="teal" />
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Current: <Badge>{sub.data?.tenant.plan?.name ?? "None"}</Badge> · {sub.data?.tenant.subscriptionStatus}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {(plans.data ?? []).map((p) => (
          <ShellCard key={p.id}>
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 text-2xl font-semibold">৳ {Number(p.price).toFixed(0)}</div>
              <ul className="mb-3 list-disc pl-4 text-sm text-muted-foreground">
                {(Array.isArray(p.features) ? p.features : []).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Button onClick={() => setPlanId(p.id)}>Select</Button>
            </CardContent>
          </ShellCard>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(planId)}
        title="Change subscription plan?"
        description="Feature limits update immediately for this tenant."
        confirmLabel="Change plan"
        variant="warning"
        loading={choose.isPending}
        onClose={() => setPlanId(null)}
        onConfirm={() => planId && choose.mutate(planId)}
      />
      <h2 className="mb-2 mt-8 text-lg font-semibold">Bills from platform</h2>
      <p className="mb-3 text-sm text-muted-foreground">Invoices issued by the platform owner for this shop.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className={tableCellNumeric}>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(bills.data ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-sm text-muted-foreground">
                No platform invoices yet.
              </TableCell>
            </TableRow>
          ) : (
            (bills.data ?? []).map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.number}</TableCell>
                <TableCell>
                  {b.periodStart.slice(0, 10)} – {b.periodEnd.slice(0, 10)}
                </TableCell>
                <TableCell>{b.dueDate.slice(0, 10)}</TableCell>
                <TableCell className={tableCellNumeric}>
                  {b.currency} {Number(b.amount).toFixed(0)}
                </TableCell>
                <TableCell>
                  <StatusBadge value={b.status} />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadPlatformInvoice(b.id, "invoice", b.number).catch((e) => toastError(e, "PDF failed"))}
                  >
                    PDF
                  </Button>
                  {b.status === "PAID" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadPlatformInvoice(b.id, "receipt", `${b.number}-receipt`).catch((e) => toastError(e, "Receipt failed"))}
                    >
                      Receipt
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </AppShell>
  );
}
