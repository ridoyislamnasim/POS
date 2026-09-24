"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button, DataTable, Field, Kpi, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, inputClass, tableCellNumeric } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { usePagedRows } from "@/lib/use-pagination";
import { moneyCell, statusBadge } from "@/components/erp-page";
import { toastError, toastUpdated, toastSuccess } from "@/lib/toast";
import { SendSmsButton } from "@/components/sms/send-sms-dialog";

type Supplier = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  creditDue: string;
  purchases: { id: string; invoiceNumber: string; total: string; due: string; status: string }[];
  payments: { id: string; amount: string; method: string; createdAt: string }[];
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ["supplier", id], queryFn: () => api<Supplier>(`/api/v1/suppliers/${id}`) });
  const s = q.data;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", taxId: "" });
  const save = useMutation({
    mutationFn: () => api(`/api/v1/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      toastUpdated("supplier");
      setOpen(false);
      q.refetch();
    },
    onError: (e) => toastError(e, "Could not save supplier"),
  });
  const [payOpen, setPayOpen] = useState(false);
  const [payPurchase, setPayPurchase] = useState<{ id: string; invoiceNumber: string; due: string; total: string } | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "CASH", reference: "", notes: "" });
  const payMutation = useMutation({
    mutationFn: () =>
      api(`/api/v1/finance/payments`, {
        method: "POST",
        body: JSON.stringify({
          partyType: "SUPPLIER",
          partyId: id,
          direction: "OUT",
          amount: Number(payForm.amount),
          method: payForm.method,
          reference: payForm.reference || undefined,
          notes: payForm.notes || undefined,
          purchaseId: payPurchase?.id || undefined,
        }),
      }),
    onSuccess: () => {
      toastSuccess(payPurchase ? `Paid ${payForm.amount} for ${payPurchase.invoiceNumber}` : `Advance paid ${payForm.amount}`);
      setPayOpen(false);
      setPayPurchase(null);
      q.refetch();
    },
    onError: (e) => toastError(e, "Could not record payment"),
  });
  function openPay(p: { id: string; invoiceNumber: string; due: string; total: string }) {
    setPayPurchase(p);
    setPayForm({ amount: String(p.due), method: "CASH", reference: "", notes: "" });
    setPayOpen(true);
  }
  function openAdvance() {
    setPayPurchase(null);
    setPayForm({ amount: "", method: "CASH", reference: "", notes: "" });
    setPayOpen(true);
  }
  const { rows: purchaseRows, pager: purchasePager } = usePagedRows(s?.purchases);
  const { rows: paymentRows, pager: paymentPager } = usePagedRows(s?.payments);
  return (
    <AppShell>
      <PageHeader title={s?.name ?? "Supplier"} description={s?.phone ?? "Purchase history and payments"}>
        <Button type="button" variant="outline" onClick={openAdvance}>
          Advance Pay
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!s) return;
            setForm({
              name: s.name,
              phone: s.phone ?? "",
              email: s.email ?? "",
              address: s.address ?? "",
              taxId: s.taxId ?? "",
            });
            setOpen(true);
          }}
        >
          Edit
        </Button>
        {s ? (
          <SendSmsButton
            size="sm"
            label="Send SMS"
            target={{
              recipientType: "SUPPLIER",
              recipientId: s.id,
              phone: s.phone,
              name: s.name,
              templateKey: "MANUAL_SUPPLIER",
              vars: { dueAmount: String(s.creditDue ?? "0") },
            }}
          />
        ) : null}
      </PageHeader>
      <div className="mb-3 grid gap-1.5 sm:grid-cols-2 sm:gap-2">
        <Kpi label="Supplier due" value={`৳ ${Number(s?.creditDue ?? 0).toFixed(2)}`} accent="amber" />
        <Kpi label="Purchases" value={s?.purchases.length ?? 0} accent="sky" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader><CardTitle>Purchase history</CardTitle></CardHeader>
          <CardContent>
            <DataTable variant="inset">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN</TableHead>
                    <TableHead className={tableCellNumeric}>Total</TableHead>
                    <TableHead className={tableCellNumeric}>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[90px]">Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRows.map((p) => {
                    const dueNum = Number(p.due);
                    const isPaid = dueNum <= 0.005;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.invoiceNumber}</TableCell>
                        <TableCell className={tableCellNumeric}>{moneyCell(p.total)}</TableCell>
                        <TableCell className={tableCellNumeric}>{moneyCell(p.due)}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={isPaid}
                            onClick={() => openPay(p)}
                            title={isPaid ? "Fully paid" : `Pay due ${p.due}`}
                          >
                            {isPaid ? "Paid" : "Pay"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination {...purchasePager} />
            </DataTable>
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Supplier payments</CardTitle></CardHeader>
          <CardContent>
            <DataTable variant="inset">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead className={tableCellNumeric}>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.method}</TableCell>
                      <TableCell className={tableCellNumeric}>{moneyCell(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination {...paymentPager} />
            </DataTable>
          </CardContent>
        </ShellCard>
      </div>
      <Dialog
        open={open}
        title="Edit supplier"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))} /></Field>
          <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm((x) => ({ ...x, phone: e.target.value }))} /></Field>
          <Field label="Email"><input className={inputClass} value={form.email} onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))} /></Field>
          <Field label="Address"><input className={inputClass} value={form.address} onChange={(e) => setForm((x) => ({ ...x, address: e.target.value }))} /></Field>
          <Field label="Tax ID"><input className={inputClass} value={form.taxId} onChange={(e) => setForm((x) => ({ ...x, taxId: e.target.value }))} /></Field>
        </div>
      </Dialog>
      <Dialog
        open={payOpen}
        title={payPurchase ? `Pay ${payPurchase.invoiceNumber}` : `Advance payment — ${s?.name ?? "Supplier"}`}
        onClose={() => setPayOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={payMutation.isPending || !payForm.amount || Number(payForm.amount) <= 0 || (payPurchase ? Number(payForm.amount) > Number(payPurchase.due) + 0.001 : false)}
              onClick={() => payMutation.mutate()}
            >
              {payPurchase ? `Pay ${payForm.amount || ""}` : `Pay advance`}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {payPurchase ? (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{moneyCell(payPurchase.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span className="font-semibold">{moneyCell(payPurchase.due)}</span></div>
              <div className="mt-1 text-[11px] text-muted-foreground">Partial or full allowed. Leave due: {moneyCell(String(Math.max(Number(payPurchase.due) - Number(payForm.amount || 0), 0)))} — excess becomes advance not clamped.</div>
            </div>
          ) : (
            <div className="rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No purchase selected — this is advance. Supplier due will go negative (prepayment) and future purchase dues will be offset.
            </div>
          )}
          <Field label={payPurchase ? "Amount *" : "Advance amount *" } hint={payPurchase ? `Max ${payPurchase.due} (due) — excess → advance` : undefined}>
            <input className={inputClass} type="number" min="0" step="0.01" value={payForm.amount} onChange={(e) => setPayForm((x) => ({ ...x, amount: e.target.value }))} placeholder={payPurchase ? payPurchase.due : "e.g. 5000"} />
          </Field>
          <Field label="Method">
            <select className={inputClass} value={payForm.method} onChange={(e) => setPayForm((x) => ({ ...x, method: e.target.value }))}>
              {["CASH", "BANK", "MFS", "CARD"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Reference"><input className={inputClass} value={payForm.reference} onChange={(e) => setPayForm((x) => ({ ...x, reference: e.target.value }))} placeholder="Cheque / trx id" /></Field>
          <Field label="Notes"><input className={inputClass} value={payForm.notes} onChange={(e) => setPayForm((x) => ({ ...x, notes: e.target.value }))} placeholder="Optional" /></Field>
        </div>
      </Dialog>
    </AppShell>
  );
}
