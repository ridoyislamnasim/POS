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
import { toastError, toastUpdated } from "@/lib/toast";
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
  const { rows: purchaseRows, pager: purchasePager } = usePagedRows(s?.purchases);
  const { rows: paymentRows, pager: paymentPager } = usePagedRows(s?.payments);
  return (
    <AppShell>
      <PageHeader title={s?.name ?? "Supplier"} description={s?.phone ?? "Purchase history and payments"}>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.invoiceNumber}</TableCell>
                      <TableCell className={tableCellNumeric}>{moneyCell(p.total)}</TableCell>
                      <TableCell className={tableCellNumeric}>{moneyCell(p.due)}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                    </TableRow>
                  ))}
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
    </AppShell>
  );
}
