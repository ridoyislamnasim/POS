"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, ConfirmDialog, DataTable, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingSkeleton, TableRow } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";
import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentLivePreview } from "@/components/documents/document-preview";
import { newIdempotencyKey, statusVariant } from "@/lib/stock-workflow";

type Detail = {
  id: string;
  number: string;
  kind: string;
  status: string;
  refundStatus: string;
  reason: string;
  notes?: string;
  refundMethod?: string;
  refundAmount: string;
  refundedAmount: string;
  createdAt: string;
  sale: { id: string; invoiceNumber: string; customer?: { name: string } | null; items: { id: string; productNameSnapshot: string; skuSnapshot: string; qty: string }[] };
  items: { id: string; saleItemId?: string; qty: string; unitPrice: string; lineRefund: string; condition: string; restock: boolean; reason?: string }[];
  payments: { id: string; method: string; amount: string; status: string }[];
};

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useMe();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<"approve" | "reject" | "refund" | null>(null);
  const refundKey = useRef(newIdempotencyKey());
  const q = useQuery({ queryKey: ["sale-return", id], queryFn: () => api<Detail>(`/api/v1/sales/returns/${id}`) });
  const row = q.data;
  const decide = useMutation({
    mutationFn: (approve: boolean) => api(`/api/v1/sales/returns/${id}/${approve ? "approve" : "reject"}`, { method: "POST" }),
    onSuccess: (_, approve) => {
      toastSuccess(approve ? "Return posted" : "Return rejected");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["sale-return", id] });
    },
    onError: (e) => toastError(e, "Action failed"),
  });
  const refund = useMutation({
    mutationFn: () =>
      api(`/api/v1/sales/returns/${id}/refund`, {
        method: "POST",
        idempotencyKey: refundKey.current,
      }),
    onSuccess: () => {
      toastSuccess("Refund recorded");
      setConfirm(null);
      refundKey.current = newIdempotencyKey();
      qc.invalidateQueries({ queryKey: ["sale-return", id] });
    },
    onError: (e) => toastError(e, "Refund failed"),
  });
  const canDecide = can("sale.return.approve") || can("refund.approve");

  return (
    <AppShell>
      <PageHeader title={row?.number ?? "Return"} description={row ? `${row.sale.invoiceNumber} · ${row.reason}` : "Loading"}>
        <Button variant="outline" onClick={() => router.push("/returns")}>Back</Button>
        {row?.sale?.id ? (
          <Button variant="outline" onClick={() => router.push(`/sales/${row.sale.id}`)}>Invoice</Button>
        ) : null}
        {row ? <DocumentActions type="return" id={row.id} number={row.number} preview size="sm" compact={false} /> : null}
        {row?.status === "PENDING" && canDecide ? (
          <>
            <Button onClick={() => setConfirm("approve")}>Approve</Button>
            <Button variant="outline" onClick={() => setConfirm("reject")}>Reject</Button>
          </>
        ) : null}
        {row && (row.status === "APPROVED" || row.status === "COMPLETED") && row.refundStatus !== "REFUNDED" && Number(row.refundAmount) > 0 && can("refund.approve") ? (
          <Button onClick={() => setConfirm("refund")}>Refund</Button>
        ) : null}
      </PageHeader>
      {!row ? (q.isLoading ? <TableLoadingSkeleton columns={5} rows={4} /> : <p className="text-sm text-muted-foreground">Return not found.</p>) : (
        <>
        <div className="mb-4 rounded-md border bg-card p-3">
          <div className="mb-2 text-sm font-semibold">Print preview</div>
          <DocumentLivePreview type="return" id={row.id} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border bg-card p-3 lg:col-span-2">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
              <Badge variant={statusVariant(row.refundStatus)}>{row.refundStatus}</Badge>
              <span className="text-sm text-muted-foreground">{row.sale.customer?.name ?? "Walk-in"}</span>
            </div>
            <DataTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Refund</TableHead>
                    <TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {row.items.map((i) => {
                    const saleLine = row.sale.items.find((s) => s.id === i.saleItemId);
                    return (
                    <TableRow key={i.id}>
                      <TableCell className="text-sm">
                        {saleLine?.productNameSnapshot ?? i.reason ?? "Line"}
                        <div className="text-xs text-muted-foreground">{saleLine?.skuSnapshot ?? ""}</div>
                      </TableCell>
                      <TableCell>{Number(i.qty)}</TableCell>
                      <TableCell><Badge variant="secondary">{i.condition}</Badge></TableCell>
                      <TableCell>{moneyCell(i.lineRefund)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{i.restock ? "Available if GOOD" : "Not sellable"}</TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTable>
          </div>
          <div className="space-y-3">
            <div className="rounded-md border bg-card p-3 text-sm">
              <div>Refund due {moneyCell(row.refundAmount)}</div>
              <div>Refunded {moneyCell(row.refundedAmount)}</div>
              <div className="text-muted-foreground">{row.refundMethod}</div>
            </div>
            <div className="rounded-md border bg-card p-3 text-sm">
              <div className="mb-1 font-medium">Payments</div>
              {row.payments.length === 0 ? <p className="text-muted-foreground">None yet</p> : null}
              {row.payments.map((p) => (
                <div key={p.id}>{p.method} {moneyCell(p.amount)} · {p.status}</div>
              ))}
            </div>
          </div>
        </div>
        </>
      )}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === "reject" ? "Reject return?" : confirm === "refund" ? "Process refund?" : "Approve return?"}
        description={
          confirm === "refund"
            ? "This posts a single refund against the original sale. Retrying with the same key will not duplicate it."
            : confirm === "reject"
              ? "No stock or refund will be posted."
              : "Stock moves by condition: GOOD → available, damaged/expired → damaged stock, restock not allowed → quarantine."
        }
        confirmLabel={confirm === "reject" ? "Reject" : confirm === "refund" ? "Refund" : "Approve"}
        variant={confirm === "reject" ? "danger" : "warning"}
        loading={decide.isPending || refund.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === "refund") refund.mutate();
          else if (confirm === "approve") decide.mutate(true);
          else if (confirm === "reject") decide.mutate(false);
        }}
      />
    </AppShell>
  );
}
