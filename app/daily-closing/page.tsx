"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { Button, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, inputClass, EmptyState, Kpi } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";

type Close = {
  id: string;
  businessDate: string;
  expectedCash: string;
  countedCash: string;
  variance: string;
  branch: { name: string };
};

export default function DailyClosingPage() {
  const { me } = useMe();
  const list = useQuery({ queryKey: ["closing"], queryFn: () => api<Close[]>("/api/v1/finance/daily-closing") });
  const [form, setForm] = useState({ branchId: "", countedCash: "", openingCash: "0" });
  const save = useMutation({
    mutationFn: () => api("/api/v1/finance/daily-closing", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toastSuccess("Day closed");
      list.refetch();
    },
    onError: (e) => toastError(e, "Close failed"),
  });
  const last = list.data?.[0];
  const { rows, pager } = usePagedRows(list.data);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <AppShell>
      <PageHeader title="Daily Closing" description="Count cash and lock the business date for a branch." />
      {last ? (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <Kpi label="Expected" value={`৳ ${Number(last.expectedCash).toFixed(2)}`} />
          <Kpi label="Counted" value={`৳ ${Number(last.countedCash).toFixed(2)}`} />
          <Kpi label="Variance" value={`৳ ${Number(last.variance).toFixed(2)}`} tone={Number(last.variance) ? "warning" : "increase"} />
        </div>
      ) : null}
      <form className="mb-4 grid gap-2 rounded-lg border bg-card p-4 md:grid-cols-4" onSubmit={onSubmit}>
        <select className={inputClass} required value={form.branchId} onChange={(e) => setForm((s) => ({ ...s, branchId: e.target.value }))}>
          <option value="">Branch</option>
          {(me?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input className={inputClass} type="number" placeholder="Opening cash" value={form.openingCash} onChange={(e) => setForm((s) => ({ ...s, openingCash: e.target.value }))} />
        <input className={inputClass} type="number" placeholder="Counted cash" required value={form.countedCash} onChange={(e) => setForm((s) => ({ ...s, countedCash: e.target.value }))} />
        <Button type="submit">Close day</Button>
      </form>
      {!list.data?.length ? <EmptyState title="No closings yet" /> : null}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Counted</TableHead>
              <TableHead>Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{String(r.businessDate).slice(0, 10)}</TableCell>
                <TableCell>{r.branch?.name}</TableCell>
                <TableCell>{moneyCell(r.expectedCash)}</TableCell>
                <TableCell>{moneyCell(r.countedCash)}</TableCell>
                <TableCell>{moneyCell(r.variance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
    </AppShell>
  );
}
