"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Kpi, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow } from "@/components/ui";
import { usePagedRows } from "@/lib/use-pagination";
import { moneyCell, statusBadge } from "@/components/erp-page";

type Supplier = {
  id: string;
  name: string;
  phone?: string;
  creditDue: string;
  purchases: { id: string; invoiceNumber: string; total: string; due: string; status: string }[];
  payments: { id: string; amount: string; method: string; createdAt: string }[];
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ["supplier", id], queryFn: () => api<Supplier>(`/api/v1/suppliers/${id}`) });
  const s = q.data;
  const { rows: purchaseRows, pager: purchasePager } = usePagedRows(s?.purchases);
  const { rows: paymentRows, pager: paymentPager } = usePagedRows(s?.payments);
  return (
    <AppShell>
      <PageHeader title={s?.name ?? "Supplier"} description={s?.phone ?? "Purchase history and payments"} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Kpi label="Supplier due" value={`৳ ${Number(s?.creditDue ?? 0).toFixed(2)}`} />
        <Kpi label="Purchases" value={s?.purchases.length ?? 0} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader><CardTitle>Purchase history</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseRows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.invoiceNumber}</TableCell>
                    <TableCell>{moneyCell(p.total)}</TableCell>
                    <TableCell>{moneyCell(p.due)}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...purchasePager} />
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Supplier payments</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentRows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.method}</TableCell>
                    <TableCell className="text-right">{moneyCell(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...paymentPager} />
          </CardContent>
        </ShellCard>
      </div>
    </AppShell>
  );
}
