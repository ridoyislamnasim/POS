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
} from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type Invoice = {
  id: string;
  number: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: string;
  currency: string;
  status: string;
  sentAt?: string | null;
  paidAt?: string | null;
  tenant?: { id: string; name: string };
};

type TenantOpt = { id: string; name: string; plan?: { price: string; currency: string } | null };

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
  const [periodStart, setPeriodStart] = useState(defaults.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaults.periodEnd);
  const [dueDate, setDueDate] = useState(defaults.dueDate);
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState<Invoice | null>(null);
  const [kind, setKind] = useState<ConfirmKind>(null);

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
          periodStart,
          periodEnd,
          dueDate,
          notes: notes || undefined,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Invoice created");
      setCreateOpen(false);
      setNotes("");
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

  function onCreate(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  const tenantRows = ((tenants.data as unknown as TenantOpt[]) ?? []).filter((t) => t.id);

  return (
    <AppShell>
      <PageHeader title="Platform invoices" description="Create a bill, send it to the tenant, mark paid after you verify payment, then send a receipt.">
        <Button
          onClick={() => {
            setCreateOpen(true);
            if (!tenantId && tenantRows[0]) setTenantId(tenantRows[0].id);
          }}
        >
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
                </TableCell>
                <TableCell>
                  <StatusBadge value={row.status} />
                </TableCell>
                <TableCell>{row.sentAt ? new Date(row.sentAt).toLocaleDateString() : "—"}</TableCell>
                <TableCell className={tableCellActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadPlatformInvoice(row.id, "invoice", row.number).catch((e) => toastError(e, "PDF failed"))}
                  >
                    PDF
                  </Button>
                  {row.status !== "VOID" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTarget(row);
                        setKind("send");
                      }}
                    >
                      Send
                    </Button>
                  ) : null}
                  {row.status !== "PAID" && row.status !== "VOID" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTarget(row);
                        setKind("paid");
                      }}
                    >
                      Mark paid
                    </Button>
                  ) : null}
                  {row.status === "PAID" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTarget(row);
                        setKind("receipt");
                      }}
                    >
                      Receipt
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>

      <Dialog
        open={createOpen}
        title="Create platform invoice"
        description="Defaults to last calendar month and the tenant’s plan price."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="platform-invoice-form" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </>
        }
      >
        <form id="platform-invoice-form" className="grid gap-3" onSubmit={onCreate}>
          <Field label="Tenant *">
            <select className={inputClass} required value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
              <option value="">Select tenant</option>
              {tenantRows.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              placeholder="Plan price if empty"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
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
