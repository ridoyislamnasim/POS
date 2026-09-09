"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, EmptyState } from "@/components/ui";
import { statusBadge } from "@/components/erp-page";

type Shift = {
  id: string;
  status: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: string;
  closingCash?: string;
  branch: { name: string };
  register: { name: string };
  cashier: { name: string };
};

export default function ShiftsPage() {
  const q = useQuery({ queryKey: ["shifts"], queryFn: () => api<Shift[]>("/api/v1/shifts") });
  const { rows, pager } = usePagedRows(q.data);
  return (
    <AppShell>
      <PageHeader title="Shift Management" description="Open and closed register sessions. Templates live with staff settings." />
      {!q.data?.length ? <EmptyState title="No shifts yet" /> : null}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cashier</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Register</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.cashier?.name}</TableCell>
                <TableCell>{s.branch?.name}</TableCell>
                <TableCell>{s.register?.name}</TableCell>
                <TableCell>{new Date(s.openedAt).toLocaleString()}</TableCell>
                <TableCell>{statusBadge(s.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
    </AppShell>
  );
}
