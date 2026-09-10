"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, PageHeader, SummaryCards, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellNumeric } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  const list = useServerList<Close>("closing", "/api/v1/finance/daily-closing");
  const [form, setForm] = useState({ branchId: "", countedCash: "", openingCash: "0" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const save = useMutation({
    mutationFn: () => api("/api/v1/finance/daily-closing", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      toastSuccess("Day closed");
      setConfirmOpen(false);
      list.refetch();
    },
    onError: (e) => toastError(e, "Close failed"),
  });
  const last = list.rows[0];

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setConfirmOpen(true);
  }

  return (
    <AppShell>
      <PageHeader title="Daily Closing" description="Count cash and lock the business date for a branch." />
      {last ? (
        <SummaryCards
          items={[
            { label: "Expected", value: `৳ ${Number(last.expectedCash).toFixed(2)}`, accent: "sky" },
            { label: "Counted", value: `৳ ${Number(last.countedCash).toFixed(2)}`, accent: "emerald" },
            { label: "Variance", value: `৳ ${Number(last.variance).toFixed(2)}`, accent: Number(last.variance) ? "amber" : "lime" },
          ]}
        />
      ) : null}
      <form className="mb-3 grid gap-2 rounded-md border bg-card p-2 md:grid-cols-4 md:p-3" onSubmit={onSubmit}>
        <select className={inputClass} required value={form.branchId} onChange={(e) => setForm((s) => ({ ...s, branchId: e.target.value }))}>
          <option value="">Branch</option>
          {(me?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input className={inputClass} type="number" placeholder="Opening cash" value={form.openingCash} onChange={(e) => setForm((s) => ({ ...s, openingCash: e.target.value }))} />
        <input className={inputClass} type="number" placeholder="Counted cash" required value={form.countedCash} onChange={(e) => setForm((s) => ({ ...s, countedCash: e.target.value }))} />
        <Button type="submit">Close day</Button>
      </form>
      <ListFrame list={list} searchPlaceholder="Search branch" dateFilter columnCount={5} emptyTitle="No records found">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className={tableCellNumeric}>Expected</TableHead>
              <TableHead className={tableCellNumeric}>Counted</TableHead>
              <TableHead className={tableCellNumeric}>Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{String(r.businessDate).slice(0, 10)}</TableCell>
                <TableCell>{r.branch?.name}</TableCell>
                <TableCell className={tableCellNumeric}>{moneyCell(r.expectedCash)}</TableCell>
                <TableCell className={tableCellNumeric}>{moneyCell(r.countedCash)}</TableCell>
                <TableCell className={tableCellNumeric}>{moneyCell(r.variance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
      <ConfirmDialog
        open={confirmOpen}
        title="Close this business day?"
        description="Counted cash is locked for this branch date. You can overwrite by running close again."
        confirmLabel="Close day"
        variant="warning"
        loading={save.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => save.mutate()}
      />
    </AppShell>
  );
}
