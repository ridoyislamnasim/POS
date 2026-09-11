"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import {
  Badge,
  Button,
  ConfirmDialog,
  Field,
  PageHeader,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  inputClass,
  tableCellNumeric,
  tableSubText,
} from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyCell } from "@/components/erp-page";
import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentLivePreview } from "@/components/documents/document-preview";
import { newIdempotencyKey, RETURN_CONDITIONS } from "@/lib/stock-workflow";
import { SendSmsButton } from "@/components/sms/send-sms-dialog";

type Item = {
  id: string;
  variantId: string;
  qty: string;
  lineTotal: string;
  productNameSnapshot: string;
  skuSnapshot: string;
};
type Sale = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: string;
  paid: string;
  due: string;
  currency: string;
  customer?: { id: string; name: string; phone: string } | null;
  branch: { name: string };
  items: Item[];
  payments: { id: string; method: string; amount: string; status: string }[];
  returns: {
    id: string;
    number: string;
    status: string;
    kind: string;
    refundAmount: string;
    reason: string;
    items?: { saleItemId: string; qty: string }[];
  }[];
};

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { can } = useMe();
  const q = useQuery({ queryKey: ["sale", id], queryFn: () => api<Sale>(`/api/v1/sales/${id}`) });
  const products = useQuery({
    queryKey: ["products-exchange"],
    queryFn: () => api<{ id: string; sku: string; price: string }[]>("/api/v1/catalog/variants?limit=100"),
  });
  const variants = products.data ?? [];
  const sale = q.data;
  const [kind, setKind] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [reason, setReason] = useState("Customer request");
  const [method, setMethod] = useState("CASH");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [condition, setCondition] = useState<Record<string, string>>({});
  const [exVariant, setExVariant] = useState("");
  const [exQty, setExQty] = useState("1");
  const [voidOpen, setVoidOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("Cashier error");
  const returnKeyRef = useRef(newIdempotencyKey());

  const submit = useMutation({
    mutationFn: () => {
      const items = (sale?.items ?? [])
        .map((i) => ({
          saleItemId: i.id,
          qty: Number(qty[i.id] || 0),
          condition: condition[i.id] || "GOOD",
        }))
        .filter((i) => i.qty > 0);
      return api(`/api/v1/sales/${id}/returns`, {
        method: "POST",
        idempotencyKey: returnKeyRef.current,
        body: JSON.stringify({
          kind,
          reason,
          refundMethod: method,
          items,
          exchangeItems: kind === "EXCHANGE" && exVariant ? [{ variantId: exVariant, qty: Number(exQty) }] : [],
        }),
      });
    },
    onSuccess: () => {
      toastSuccess("Return saved");
      setReturnOpen(false);
      returnKeyRef.current = newIdempotencyKey();
      qc.invalidateQueries({ queryKey: ["sale", id] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      setQty({});
    },
    onError: (e) => toastError(e, "Return failed"),
  });

  const voidSale = useMutation({
    mutationFn: () => api(`/api/v1/sales/${id}/void`, { method: "POST", body: JSON.stringify({ reason: voidReason }) }),
    onSuccess: () => {
      toastSuccess("Sale voided");
      setVoidOpen(false);
      qc.invalidateQueries({ queryKey: ["sale", id] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e) => toastError(e, "Void failed"),
  });

  if (!sale) {
    return (
      <AppShell>
        <PageHeader title="Sale" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  const canAct = sale.status === "COMPLETED" || sale.status === "PARTIALLY_RETURNED";
  const remainingByItem = Object.fromEntries(
    sale.items.map((i) => {
      const used = (sale.returns ?? [])
        .filter((r) => r.status === "PENDING" || r.status === "APPROVED" || r.status === "COMPLETED")
        .flatMap((r) => r.items ?? [])
        .filter((line) => line.saleItemId === i.id)
        .reduce((n, line) => n + Number(line.qty), 0);
      return [i.id, Math.max(0, Number(i.qty) - used)];
    }),
  );

  return (
    <AppShell>
      <PageHeader title={sale.invoiceNumber} description={`${sale.branch.name} · original invoice`}>
        <Button variant="outline" onClick={() => router.push("/sales")}>
          Back
        </Button>
        <DocumentActions type="sale" id={sale.id} number={sale.invoiceNumber} preview size="sm" compact={false} />
        {sale.customer ? (
          <SendSmsButton
            size="sm"
            label="SMS"
            target={{
              recipientType: "CUSTOMER",
              recipientId: sale.customer.id,
              phone: sale.customer.phone,
              name: sale.customer.name,
              referenceType: "Sale",
              referenceId: sale.id,
              templateKey: "SALE_CONFIRMATION",
              vars: { invoiceNo: sale.invoiceNumber, amount: sale.total, dueAmount: sale.due, paidAmount: sale.paid },
            }}
          />
        ) : null}
        {can("sale.void") && sale.status === "COMPLETED" ? (
          <Button variant="destructive" onClick={() => setVoidOpen(true)}>
            Void
          </Button>
        ) : null}
      </PageHeader>
      <div className="mb-4 flex gap-2">
        <Badge>{sale.status}</Badge>
        <span className="text-sm text-muted-foreground">
          Total {moneyCell(sale.total)} · Paid {moneyCell(sale.paid)} · Due {moneyCell(sale.due)}
        </span>
      </div>
      <div className="mb-4 rounded-md border bg-card p-3">
        <div className="mb-2 text-sm font-semibold">Print preview</div>
        <DocumentLivePreview type="sale" id={sale.id} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable>
          <div className="border-b border-border px-2 py-1.5 sm:px-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lines</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Return qty</TableHead>
                <TableHead>Condition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((i) => {
                const remaining = remainingByItem[i.id] ?? Number(i.qty);
                return (
                <TableRow key={i.id}>
                  <TableCell>
                    {i.productNameSnapshot}
                    <div className={tableSubText}>{i.skuSnapshot} · remaining {remaining}</div>
                  </TableCell>
                  <TableCell className={tableCellNumeric}>{Number(i.qty)}</TableCell>
                  <TableCell className={tableCellNumeric}>{moneyCell(i.lineTotal)}</TableCell>
                  <TableCell>
                    <input
                      className={inputClass + " w-20"}
                      type="number"
                      min="0"
                      max={remaining}
                      disabled={!canAct || !can("sale.return") || remaining <= 0}
                      value={qty[i.id] ?? ""}
                      onChange={(e) => setQty((s) => ({ ...s, [i.id]: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      className={inputClass + " min-w-[140px]"}
                      disabled={!canAct || !can("sale.return")}
                      value={condition[i.id] ?? "GOOD"}
                      onChange={(e) => setCondition((s) => ({ ...s, [i.id]: e.target.value }))}
                    >
                      {RETURN_CONDITIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTable>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Return / refund / exchange</h2>
          <div className="grid gap-3">
            <Field label="Type">
              <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as "RETURN" | "EXCHANGE")}>
                <option value="RETURN">Return / refund</option>
                <option value="EXCHANGE">Exchange</option>
              </select>
            </Field>
            <Field label="Reason">
              <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
                <option>Customer request</option>
                <option>Damaged</option>
                <option>Wrong size</option>
                <option>Wrong item</option>
                <option>Quality issue</option>
              </select>
            </Field>
            <Field label="Refund method">
              <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="MFS">MFS</option>
                <option value="STORE_CREDIT">Store credit</option>
              </select>
            </Field>
            {kind === "EXCHANGE" ? (
              <div className="grid grid-cols-2 gap-2">
                <Field label="New SKU">
                  <select className={inputClass} value={exVariant} onChange={(e) => setExVariant(e.target.value)}>
                    <option value="">Select</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.sku}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Qty">
                  <input className={inputClass} type="number" min="1" value={exQty} onChange={(e) => setExQty(e.target.value)} />
                </Field>
              </div>
            ) : null}
            <Button disabled={!canAct || !can("sale.return") || submit.isPending} onClick={() => setReturnOpen(true)}>
              {can("refund.approve") ? "Post return" : "Submit for approval"}
            </Button>
            <p className="text-xs text-muted-foreground">Good items return to sellable stock. Damaged, defective, expired, or missing-parts go to damaged stock. Restock not allowed stays in quarantine. The original invoice is never rewritten.</p>
          </div>
          <h3 className="mb-2 mt-6 text-sm font-semibold">Return history</h3>
          {(sale.returns ?? []).length === 0 ? <p className="text-sm text-muted-foreground">None yet</p> : null}
          {(sale.returns ?? []).map((r) => (
            <div key={r.id} className="mb-2 rounded border p-2 text-sm">
              <button type="button" className="hover:underline" onClick={() => router.push(`/returns/${r.id}`)}>
                {r.number}
              </button>
              {" "}· {r.kind} · {r.status} · {moneyCell(r.refundAmount)}
              <div className="text-xs text-muted-foreground">{r.reason}</div>
            </div>
          ))}
          <h3 className="mb-2 mt-4 text-sm font-semibold">Payments</h3>
          {sale.payments.map((p) => (
            <div key={p.id} className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span>{p.method} {moneyCell(p.amount)} · {p.status}</span>
              <DocumentActions type="sale-payment" id={p.id} />
            </div>
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={voidOpen}
        title="Void this sale?"
        description="Stock will be restored and captured payments cancelled. This cannot be undone."
        confirmLabel="Void sale"
        loading={voidSale.isPending}
        onConfirm={() => voidSale.mutate()}
        onClose={() => setVoidOpen(false)}
      >
        <Field label="Void reason">
          <input className={inputClass} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={returnOpen}
        title="Post this return?"
        description="Stock moves by condition after approval. Cashiers without approval create a pending ticket. Refreshing will not duplicate this request."
        confirmLabel={can("refund.approve") ? "Post return" : "Submit"}
        variant="warning"
        loading={submit.isPending}
        onConfirm={() => submit.mutate()}
        onClose={() => setReturnOpen(false)}
      />
    </AppShell>
  );
}
