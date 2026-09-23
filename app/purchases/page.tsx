"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/ui/dialog";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, Field, PageHeader, SummaryCards, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellNumeric } from "@/components/ui";
import { toastCreated, toastError } from "@/lib/toast";
import { moneyCell, moneyText, statusBadge, sumField } from "@/components/erp-page";
import { DocumentActions } from "@/components/documents/document-actions";
import { SendSmsButton } from "@/components/sms/send-sms-dialog";
import { useHelpCreateAction } from "@/lib/help";

type Purchase = {
  id: string;
  invoiceNumber: string;
  total: string;
  paid: string;
  due: string;
  status: string;
  supplier: { id: string; name: string; phone?: string };
  branch: { name: string };
  items: { id: string; variantId: string; qty: string; unitCost: string }[];
};

type PurchaseReturn = { id: string; number: string; reason: string; total: string; purchase?: { invoiceNumber: string; supplier?: { id: string; name: string; phone?: string } } };

export default function PurchasesPage() {
  const router = useRouter();
  const list = useServerList<Purchase>("purchases", "/api/v1/purchases");
  const returns = useServerList<PurchaseReturn>("purchase-returns", "/api/v1/purchases/returns", { namespace: "prn" });
  const [ret, setRet] = useState<Purchase | null>(null);
  const [retQty, setRetQty] = useState("1");
  const [retItem, setRetItem] = useState("");
  const [retReason, setRetReason] = useState("Damaged goods");

  useHelpCreateAction(() => router.push("/purchases/new"));

  const purchaseReturn = useMutation({
    mutationFn: () =>
      api(`/api/v1/purchases/${ret?.id}/returns`, {
        method: "POST",
        body: JSON.stringify({
          reason: retReason,
          items: [{ purchaseItemId: retItem, qty: Number(retQty) }],
        }),
      }),
    onSuccess: () => {
      toastCreated("purchase return", "Stock was reduced");
      setRet(null);
      list.refetch();
      returns.refetch();
    },
    onError: (e) => toastError(e, "Purchase return failed"),
  });

  return (
    <AppShell>
      <PageHeader title="Purchases" description="Goods received — stock is increased on save. Variant-aware, partial receiving supported.">
        <Button type="button" onClick={() => router.push("/purchases/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Receive purchase
        </Button>
      </PageHeader>
      <SummaryCards
        items={[
          { label: "GRNs", value: list.pager.total, accent: "sky" },
          { label: "Total", value: moneyText(sumField(list.rows, "total")), accent: "orange", description: "This page" },
          { label: "Due", value: moneyText(sumField(list.rows, "due")), accent: "rose", description: "This page" },
          { label: "Returns", value: returns.pager.total, accent: "violet" },
        ]}
      />
      <ListFrame
        list={list}
        searchPlaceholder="Search GRN or supplier"
        dateFilter
        statusOptions={[
          { value: "DRAFT", label: "Draft" },
          { value: "ORDERED", label: "Ordered" },
          { value: "PARTIAL", label: "Partial" },
          { value: "RECEIVED", label: "Received" },
          { value: "CANCELLED", label: "Cancelled" },
        ]}
        columnCount={7}
        emptyTitle="No records found"
        emptyHint="Receive goods to add stock."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className={tableCellNumeric}>Total</TableHead>
              <TableHead className={tableCellNumeric}>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.invoiceNumber}</TableCell>
                <TableCell>{p.supplier?.name}</TableCell>
                <TableCell>{p.branch?.name}</TableCell>
                <TableCell className={tableCellNumeric}>{moneyCell(p.total)}</TableCell>
                <TableCell className={tableCellNumeric}>{moneyCell(p.due)}</TableCell>
                <TableCell>{statusBadge(p.status)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <DocumentActions type="purchase" id={p.id} number={p.invoiceNumber} />
                    <SendSmsButton
                      target={{
                        recipientType: "SUPPLIER",
                        recipientId: p.supplier?.id,
                        phone: p.supplier?.phone,
                        name: p.supplier?.name,
                        referenceType: "Purchase",
                        referenceId: p.id,
                        templateKey: "PURCHASE_RECEIVED",
                        vars: { invoiceNo: p.invoiceNumber, amount: p.total, dueAmount: p.due, paidAmount: p.paid },
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRet(p);
                        setRetItem(p.items?.[0]?.id ?? "");
                      }}
                    >
                      Return
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold">Purchase returns</h2>
        <ListFrame
          list={returns}
          searchPlaceholder="Search return number"
          dateFilter
          columnCount={5}
          emptyTitle="No purchase returns"
          emptyHint="Supplier returns appear here."
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return</TableHead>
                <TableHead>GRN</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className={tableCellNumeric}>Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.number}</TableCell>
                  <TableCell>{r.purchase?.invoiceNumber ?? "—"}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell className={tableCellNumeric}>{moneyCell(r.total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <DocumentActions type="purchase-return" id={r.id} number={r.number} />
                      {r.purchase?.supplier ? (
                        <SendSmsButton
                          target={{
                            recipientType: "SUPPLIER",
                            recipientId: r.purchase.supplier.id,
                            phone: r.purchase.supplier.phone,
                            name: r.purchase.supplier.name,
                            referenceType: "PurchaseReturn",
                            referenceId: r.id,
                            templateKey: "PURCHASE_RETURN",
                            vars: { invoiceNo: r.purchase.invoiceNumber, orderNo: r.number, refundAmount: r.total },
                          }}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListFrame>
      </div>

      <Dialog
        open={!!ret}
        title="Purchase return"
        description="Stock leaves the location and supplier due is reduced when this GRN still has due."
        onClose={() => setRet(null)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setRet(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={purchaseReturn.isPending || !retItem} onClick={() => purchaseReturn.mutate()}>
              Post return
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Line">
            <select className={inputClass} value={retItem} onChange={(e) => setRetItem(e.target.value)}>
              {(ret?.items ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.variantId.slice(0, 8)} · qty {i.qty}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qty">
            <input className={inputClass} type="number" min="1" value={retQty} onChange={(e) => setRetQty(e.target.value)} />
          </Field>
          <Field label="Reason">
            <input className={inputClass} value={retReason} onChange={(e) => setRetReason(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </AppShell>
  );
}
