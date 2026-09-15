"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, PageHeader, StatusBadge, SummaryCards, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, tableCellNumeric, IconActionButton } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";
import { DocumentActions } from "@/components/documents/document-actions";
import { SendSmsButton } from "@/components/sms/send-sms-dialog";
import { Check, X } from "lucide-react";

type Row = {
  id: string;
  number: string;
  kind: string;
  status: string;
  refundStatus?: string;
  reason: string;
  refundAmount: string;
  refundedAmount?: string;
  refundMethod?: string;
  createdAt: string;
  sale: { id: string; invoiceNumber: string; customer?: { id: string; name: string; phone: string } | null };
};

export default function ReturnsPage() {
  const { can } = useMe();
  const qc = useQueryClient();
  const [pending, setPending] = useState<{ id: string; number: string; action: "approve" | "reject" } | null>(null);
  const list = useServerList<Row>("sale-returns", "/api/v1/sales/returns");
  const summary = useQuery({
    queryKey: ["sale-returns-summary"],
    queryFn: () => api<{ returnedQty: number; returnValue: string; refundAmount: string; pendingRefund: string }>("/api/v1/sales/returns/summary"),
  });
  const approve = useMutation({
    mutationFn: (id: string) => api(`/api/v1/sales/returns/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Return approved");
      setPending(null);
      qc.invalidateQueries({ queryKey: ["sale-returns"] });
      qc.invalidateQueries({ queryKey: ["sale-returns-summary"] });
    },
    onError: (e) => toastError(e, "Approve failed"),
  });
  const reject = useMutation({
    mutationFn: (id: string) => api(`/api/v1/sales/returns/${id}/reject`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Return rejected");
      setPending(null);
      qc.invalidateQueries({ queryKey: ["sale-returns"] });
    },
    onError: (e) => toastError(e, "Reject failed"),
  });
  const canDecide = can("sale.return.approve") || can("refund.approve");

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
        <PageHeader title="Sales returns" description="A return is not an automatic restock. Condition decides available, damaged, or quarantine." />
        <SummaryCards
          items={[
            { label: "Returned qty", value: summary.data?.returnedQty ?? "—", accent: "sky", loading: summary.isLoading },
            { label: "Return value", value: summary.data?.returnValue ?? "—", accent: "orange", loading: summary.isLoading },
            { label: "Refunded", value: summary.data?.refundAmount ?? "—", accent: "emerald", loading: summary.isLoading },
            { label: "Pending refund", value: summary.data?.pendingRefund ?? "—", accent: "amber", loading: summary.isLoading },
          ]}
        />
        <ListFrame
          list={list}
          searchPlaceholder="Search invoice / RET"
          dateFilter
          statusOptions={[
            { value: "PENDING", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "COMPLETED", label: "Completed" },
            { value: "REJECTED", label: "Rejected" },
          ]}
          columnCount={7}
          emptyTitle="No records found"
          emptyHint="Open a completed sale and post a return from the original invoice."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead className={tableCellNumeric}>Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link className="hover:underline" href={`/returns/${r.id}`}>{r.number}</Link>
                  </TableCell>
                  <TableCell>
                    <Link className="hover:underline" href={`/sales/${r.sale?.id}`}>{r.sale?.invoiceNumber}</Link>
                  </TableCell>
                  <TableCell>{r.kind}</TableCell>
                  <TableCell><StatusBadge value={r.status} /></TableCell>
                  <TableCell><StatusBadge value={r.refundStatus ?? "—"} /></TableCell>
                  <TableCell className={tableCellNumeric}>{r.refundMethod ?? ""} {moneyCell(r.refundAmount)}</TableCell>
                  <TableCell className="space-x-2">
                    <DocumentActions type="return" id={r.id} number={r.number} />
                    {r.sale?.customer ? (
                      <SendSmsButton
                        target={{
                          recipientType: "CUSTOMER",
                          recipientId: r.sale.customer.id,
                          phone: r.sale.customer.phone,
                          name: r.sale.customer.name,
                          referenceType: "SaleReturn",
                          referenceId: r.id,
                          templateKey: r.kind === "EXCHANGE" ? "EXCHANGE_NOTIFICATION" : "RETURN_CONFIRMATION",
                          vars: { invoiceNo: r.sale.invoiceNumber, orderNo: r.number, refundAmount: r.refundAmount },
                        }}
                      />
                    ) : null}
                    {r.status === "PENDING" && canDecide ? (
                      <>
                        <IconActionButton icon={<Check className="h-3.5 w-3.5" />} label="Approve return" variant="success" onClick={() => setPending({ id: r.id, number: r.number, action: "approve" })} />
                        <IconActionButton icon={<X className="h-3.5 w-3.5" />} label="Reject return" variant="destructive" onClick={() => setPending({ id: r.id, number: r.number, action: "reject" })} />
                      </>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListFrame>
        <ConfirmDialog
          open={Boolean(pending)}
          title={pending?.action === "reject" ? "Reject this return?" : "Approve this return?"}
          description={pending ? `${pending.number} will ${pending.action === "reject" ? "stay out of stock" : "post stock by item condition, then refund if you have refund permission"}.` : "Confirm."}
          confirmLabel={pending?.action === "reject" ? "Reject" : "Approve"}
          variant={pending?.action === "reject" ? "danger" : "warning"}
          loading={approve.isPending || reject.isPending}
          onClose={() => setPending(null)}
          onConfirm={() => {
            if (!pending) return;
            if (pending.action === "approve") approve.mutate(pending.id);
            else reject.mutate(pending.id);
          }}
        />
      </motion.div>
    </AppShell>
  );
}
