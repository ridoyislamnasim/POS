"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Kpi, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, inputClass } from "@/components/ui";
import { usePagedRows } from "@/lib/use-pagination";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";
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
  const loyalty = useMutation({
    mutationFn: () => api(`/api/v1/customers/${id}/loyalty`, { method: "POST", body: JSON.stringify({ type, points: Number(pts) }) }),
    onSuccess: () => {
      toastSuccess("Points updated");
      q.refetch();
    },
    onError: (e) => toastError(e, "Loyalty failed"),
  });
  const c = q.data;
  const { rows: salesRows, pager: salesPager } = usePagedRows(c?.sales);
  const { rows: loyaltyRows, pager: loyaltyPager } = usePagedRows(c?.loyalty);
  return (
    <AppShell>
      <PageHeader title={c?.name ?? "Customer"} description={`${c?.phone ?? ""} · history, credit, and loyalty`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Loyalty points" value={c?.loyaltyPoints ?? 0} />
        <Kpi label="Credit due" value={`৳ ${Number(c?.creditDue ?? 0).toFixed(2)}`} tone={Number(c?.creditDue) ? "warning" : "neutral"} />
        <Kpi label="Credit limit" value={`৳ ${Number(c?.creditLimit ?? 0).toFixed(2)}`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader><CardTitle>Sales history</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesRows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.invoiceNumber}</TableCell>
                    <TableCell>{moneyCell(s.total)}</TableCell>
                    <TableCell>{moneyCell(s.due)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...salesPager} />
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Loyalty / Points</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2">
              <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="EARN">Earn</option>
                <option value="REDEEM">Redeem</option>
                <option value="ADJUST">Adjust</option>
              </select>
              <input className={inputClass} type="number" value={pts} onChange={(e) => setPts(e.target.value)} />
              <Button onClick={() => loyalty.mutate()}>Apply</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loyaltyRows.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Badge variant="secondary">{l.type}</Badge></TableCell>
                    <TableCell>{l.notes ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination {...loyaltyPager} />
          </CardContent>
        </ShellCard>
      </div>
    </AppShell>
  );
}
