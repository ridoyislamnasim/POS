"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, DataTable, Field, Kpi, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, inputClass, tableCellNumeric } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePagedRows } from "@/lib/use-pagination";
import { toastError, toastSuccess, toastUpdated } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";
import { DocumentActions } from "@/components/documents/document-actions";
import { useState } from "react";

type Profile = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  creditDue: string;
  creditLimit: string;
  sales: { id: string; invoiceNumber: string; total: string; due: string; createdAt: string; branch: { name: string } }[];
  loyalty: { id: string; type: string; points: number; createdAt: string; notes?: string }[];
  payments: { id: string; amount: string; method: string; createdAt: string }[];
};

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ["customer", id], queryFn: () => api<Profile>(`/api/v1/customers/${id}`) });
  const [pts, setPts] = useState("10");
  const [type, setType] = useState("EARN");
  const [editOpen, setEditOpen] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", creditLimit: "" });
  const loyalty = useMutation({
    mutationFn: () => api(`/api/v1/customers/${id}/loyalty`, { method: "POST", body: JSON.stringify({ type, points: Number(pts) }) }),
    onSuccess: () => {
      toastSuccess("Points updated");
      setLoyaltyOpen(false);
      q.refetch();
    },
    onError: (e) => toastError(e, "Loyalty failed"),
  });
  const save = useMutation({
    mutationFn: () => api(`/api/v1/customers/${id}`, { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => {
      toastUpdated("customer");
      setEditOpen(false);
      q.refetch();
    },
    onError: (e) => toastError(e, "Could not save customer"),
  });
  const c = q.data;
  const { rows: salesRows, pager: salesPager } = usePagedRows(c?.sales);
  const { rows: loyaltyRows, pager: loyaltyPager } = usePagedRows(c?.loyalty);
  const { rows: paymentRows, pager: paymentPager } = usePagedRows(c?.payments);
  return (
    <AppShell>
      <PageHeader title={c?.name ?? "Customer"} description={`${c?.phone ?? ""} · history, credit, and loyalty`}>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!c) return;
            setForm({
              name: c.name,
              phone: c.phone,
              email: c.email ?? "",
              address: c.address ?? "",
              creditLimit: String(c.creditLimit ?? ""),
            });
            setEditOpen(true);
          }}
        >
          Edit
        </Button>
      </PageHeader>
      <div className="grid gap-1.5 sm:grid-cols-3 sm:gap-2">
        <Kpi label="Loyalty points" value={c?.loyaltyPoints ?? 0} accent="violet" />
        <Kpi label="Credit due" value={`৳ ${Number(c?.creditDue ?? 0).toFixed(2)}`} tone={Number(c?.creditDue) ? "warning" : "neutral"} accent={Number(c?.creditDue) ? "amber" : "emerald"} />
        <Kpi label="Credit limit" value={`৳ ${Number(c?.creditLimit ?? 0).toFixed(2)}`} accent="sky" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader><CardTitle>Sales history</CardTitle></CardHeader>
          <CardContent>
            <DataTable variant="inset">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead className={tableCellNumeric}>Total</TableHead>
                    <TableHead className={tableCellNumeric}>Due</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.invoiceNumber}</TableCell>
                      <TableCell className={tableCellNumeric}>{moneyCell(s.total)}</TableCell>
                      <TableCell className={tableCellNumeric}>{moneyCell(s.due)}</TableCell>
                      <TableCell><DocumentActions type="sale" id={s.id} number={s.invoiceNumber} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination {...salesPager} />
            </DataTable>
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Loyalty / Points</CardTitle></CardHeader>
          <CardContent>
            <Button className="mb-2" size="xs" onClick={() => setLoyaltyOpen(true)}>Adjust points</Button>
            <DataTable variant="inset">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className={tableCellNumeric}>Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loyaltyRows.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell><Badge variant="secondary">{l.type}</Badge></TableCell>
                      <TableCell>{l.notes ?? "—"}</TableCell>
                      <TableCell className={tableCellNumeric}>{l.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination {...loyaltyPager} />
            </DataTable>
          </CardContent>
        </ShellCard>
      </div>
      <ShellCard className="mt-6">
        <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
        <CardContent>
          <DataTable variant="inset">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className={tableCellNumeric}>Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentRows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell className={tableCellNumeric}>{moneyCell(p.amount)}</TableCell>
                    <TableCell><DocumentActions type="payment" id={p.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...paymentPager} />
          </DataTable>
        </CardContent>
      </ShellCard>
      <Dialog
        open={editOpen}
        title="Edit customer"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></Field>
          <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} /></Field>
          <Field label="Email"><input className={inputClass} value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} /></Field>
          <Field label="Address"><input className={inputClass} value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} /></Field>
          <Field label="Credit limit"><input className={inputClass} type="number" value={form.creditLimit} onChange={(e) => setForm((s) => ({ ...s, creditLimit: e.target.value }))} /></Field>
        </div>
      </Dialog>
      <ConfirmDialog
        open={loyaltyOpen}
        title="Adjust loyalty points?"
        description="This writes a loyalty transaction on the customer ledger."
        confirmLabel="Apply"
        variant="warning"
        loading={loyalty.isPending}
        onClose={() => setLoyaltyOpen(false)}
        onConfirm={() => loyalty.mutate()}
      >
        <div className="mt-3 flex gap-2">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="EARN">Earn</option>
            <option value="REDEEM">Redeem</option>
            <option value="ADJUST">Adjust</option>
          </select>
          <input className={inputClass} type="number" value={pts} onChange={(e) => setPts(e.target.value)} />
        </div>
      </ConfirmDialog>
    </AppShell>
  );
}
