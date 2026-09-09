"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, EmptyState } from "@/components/ui";
import { usePagedRows } from "@/lib/use-pagination";

type Customer = { id: string; name: string; phone: string; loyaltyPoints: number };

export default function LoyaltyPage() {
  const q = useQuery({ queryKey: ["customers"], queryFn: () => api<Customer[]>("/api/v1/customers?limit=100") });
  const allRows = (q.data ?? []).filter((c) => c.loyaltyPoints);
  const { rows, pager } = usePagedRows(allRows);
  return (
    <AppShell>
      <PageHeader title="Loyalty / Points" description="Open a customer to earn, redeem, or adjust points." />
      {!allRows.length ? <EmptyState title="No loyalty balances yet" /> : null}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="text-primary hover:underline">{c.name}</Link>
                </TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell className="tabular-nums">{c.loyaltyPoints}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
    </AppShell>
  );
}
