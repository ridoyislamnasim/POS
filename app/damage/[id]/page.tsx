"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api, fileUrl } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, ConfirmDialog, DataTable, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";
import { newIdempotencyKey, statusVariant } from "@/lib/stock-workflow";

type Detail = {
  id: string;
  number: string;
  status: string;
  reason: string;
  description?: string | null;
  attachmentUrl?: string | null;
  totalQty: string;
  totalCost: string;
  items: { id: string; skuSnapshot?: string | null; qty: string; unitCost: string; lineCost: string; stockBefore?: string | null; stockAfter?: string | null }[];
};

export default function DamageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useMe();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<"submit" | "approve" | "reject" | null>(null);
  const q = useQuery({ queryKey: ["damage", id], queryFn: () => api<Detail>(`/api/v1/inventory/damages/${id}`) });
  const row = q.data;
  const act = useMutation({
    mutationFn: (action: "submit" | "approve" | "reject") =>
      api(`/api/v1/inventory/damages/${id}/${action}`, {
        method: "POST",
        idempotencyKey: newIdempotencyKey(),
        body: action === "reject" ? JSON.stringify({ reason: "Rejected from detail" }) : undefined,
      }),
    onSuccess: (_, action) => {
      toastSuccess(action === "approve" ? "Stock adjusted" : action === "reject" ? "Rejected" : "Submitted");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["damage", id] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toastError(e, "Action failed"),
  });
  const canApprove = can("inventory.damage.approve") || can("inventory.adjust");

  return (
    <AppShell>
      <PageHeader title={row?.number ?? "Damage"} description={row?.reason}>
        <Button variant="outline" onClick={() => router.push("/damage")}>Back</Button>
        {row?.status === "DRAFT" && can("inventory.damage.create") ? <Button onClick={() => setConfirm("submit")}>Submit</Button> : null}
        {row?.status === "SUBMITTED" && canApprove ? (
          <>
            <Button onClick={() => setConfirm("approve")}>Approve</Button>
            <Button variant="outline" onClick={() => setConfirm("reject")}>Reject</Button>
          </>
        ) : null}
      </PageHeader>
      {!row ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
            <span className="text-sm text-muted-foreground">{row.description}</span>
          </div>
          {row.attachmentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(row.attachmentUrl)} alt="Damage" className="mb-3 max-h-48 rounded-md border" />
          ) : null}
          <DataTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit cost</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Stock before</TableHead>
                  <TableHead>Stock after</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {row.items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.skuSnapshot ?? "—"}</TableCell>
                    <TableCell>{Number(i.qty)}</TableCell>
                    <TableCell>{moneyCell(i.unitCost)}</TableCell>
                    <TableCell>{moneyCell(i.lineCost)}</TableCell>
                    <TableCell>{i.stockBefore ?? "—"}</TableCell>
                    <TableCell>{i.stockAfter ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTable>
          <p className="mt-2 text-sm">Total qty {Number(row.totalQty)} · {moneyCell(row.totalCost)}</p>
        </>
      )}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === "approve" ? "Approve and adjust stock?" : confirm === "reject" ? "Reject report?" : "Submit report?"}
        description={confirm === "approve" ? "Available stock will decrease. Damaged stock will increase. This cannot be silently retried into a double deduction." : "No inventory change."}
        confirmLabel={confirm === "approve" ? "Approve" : confirm === "reject" ? "Reject" : "Submit"}
        variant={confirm === "reject" ? "danger" : "warning"}
        loading={act.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && act.mutate(confirm)}
      />
    </AppShell>
  );
}
