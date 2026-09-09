"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, downloadDocument, printDocument } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, EmptyState, ErrorState, PageHeader, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow } from "@/components/ui";
import { toastError } from "@/lib/toast";

type Sale = {
  id: string;
  invoiceNumber: string;
  total: string;
  currency: string;
  createdAt: string;
  branch: { name: string };
};

type Me = { permissions: string[] };

export default function SalesPage() {
  const router = useRouter();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/api/v1/auth/me"), retry: false });
  useEffect(() => {
    if (me.isError) router.replace("/login");
  }, [me.isError, router]);
  const sales = useQuery({
    queryKey: ["sales"],
    queryFn: () => api<Sale[]>("/api/v1/sales?limit=100"),
    enabled: me.isSuccess,
  });
  const { rows, pager } = usePagedRows(sales.data ?? []);
  return (
    <AppShell>
      <PageHeader title="Sales" description="Tickets from this tenant." />
      {sales.isLoading ? <Skeleton rows={8} /> : null}
      {sales.isError ? <ErrorState message={(sales.error as Error).message} onRetry={() => sales.refetch()} /> : null}
      {!sales.isLoading && !sales.data?.length ? <EmptyState title="No sales yet" /> : null}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.invoiceNumber}</TableCell>
                <TableCell>{s.branch.name}</TableCell>
                <TableCell className="tabular-nums">
                  {s.currency} {Number(s.total).toFixed(2)}
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => printDocument(s.id, "bill").catch((e) => toastError(e, "Print failed"))}>
                    Print bill
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadDocument(s.id, "invoice").catch((e) => toastError(e, "Download failed"))}>
                    Invoice PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
    </AppShell>
  );
}
