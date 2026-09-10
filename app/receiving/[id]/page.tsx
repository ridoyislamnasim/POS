"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, ConfirmDialog, DataTable, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";
import { newIdempotencyKey, statusVariant } from "@/lib/stock-workflow";

type Detail = {
  id: string;
  number: string;
  kind: string;
  status: string;
  notes?: string | null;
  totalQty: string;
  totalCost: string;
  supplier?: { name: string } | null;
  saleReturnId?: string | null;
  purchaseId?: string | null;
  sourceRef?: string | null;
  items: { id: string; variantId: string; sku?: string; product?: string; qty: string; unitCost: string; batchLot?: string | null; expiryDate?: string | null }[];
};

export default function ReceivingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useMe();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<"receive" | "cancel" | null>(null);
  const q = useQuery({ queryKey: ["receipt", id], queryFn: () => api<Detail>(`/api/v1/inventory/receipts/${id}`) });
  const row = q.data;
  const receive = useMutation({
    mutationFn: () => api(`/api/v1/inventory/receipts/${id}/receive`, { method: "POST", idempotencyKey: newIdempotencyKey() }),
    onSuccess: () => {
      toastSuccess("Stock received");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["receipt", id] });
    },
    onError: (e) => toastError(e, "Receive failed"),
  });
  const cancel = useMutation({
    mutationFn: () => api(`/api/v1/inventory/receipts/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason: "Cancelled from detail" }) }),
    onSuccess: () => {
      toastSuccess("Cancelled");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["receipt", id] });
    },
    onError: (e) => toastError(e, "Cancel failed"),
  });
  const canPost = can("inventory.receive.approve") || can("purchase.manage");
  const system = Boolean(row?.saleReturnId || (row?.purchaseId && row.sourceRef === row.purchaseId));

  return (
    <AppShell>
      <PageHeader title={row?.number ?? "Receiving"} description={row ? `${row.kind} · ${row.supplier?.name ?? ""}` : "Loading"}>
        <Button variant="outline" onClick={() => router.push("/receiving")}>Back</Button>
        {row?.status === "DRAFT" && canPost ? <Button onClick={() => setConfirm("receive")}>Receive</Button> : null}
        {row && row.status !== "CANCELLED" && canPost && !system ? <Button variant="outline" onClick={() => setConfirm("cancel")}>Cancel</Button> : null}
      </PageHeader>
      {!row ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          <div className="mb-3 flex gap-2"><Badge variant={statusVariant(row.status)}>{row.status}</Badge></div>
          <DataTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {row.items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.sku ?? i.variantId}
                      {i.product ? <div className="font-sans text-xs text-muted-foreground">{i.product}</div> : null}
                    </TableCell>
                    <TableCell>{Number(i.qty)}</TableCell>
                    <TableCell>{moneyCell(i.unitCost)}</TableCell>
                    <TableCell>{i.batchLot ?? "—"}</TableCell>
                    <TableCell>{i.expiryDate ? String(i.expiryDate).slice(0, 10) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTable>
          <p className="mt-2 text-sm text-muted-foreground">Total {Number(row.totalQty)} · {moneyCell(row.totalCost)} {row.notes ? `· ${row.notes}` : ""}</p>
        </>
      )}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === "cancel" ? "Cancel receiving?" : "Post receiving?"}
        description={confirm === "cancel" ? "Received stock will be reversed if this document was posted." : "Available stock increases only after this confirmation."}
        confirmLabel={confirm === "cancel" ? "Cancel document" : "Receive"}
        variant={confirm === "cancel" ? "danger" : "warning"}
        loading={receive.isPending || cancel.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => (confirm === "receive" ? receive.mutate() : cancel.mutate())}
      />
    </AppShell>
  );
}
