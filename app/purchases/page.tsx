"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2, Mail, MoreHorizontal, Plus, Printer, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { Dialog } from "@/components/ui/dialog";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, Field, PageHeader, SummaryCards, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellNumeric } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { toastCreated, toastError, toastSuccess } from "@/lib/toast";
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
  const [pay, setPay] = useState<Purchase | null>(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "CASH", reference: "", notes: "" });

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

  const payMutation = useMutation({
    mutationFn: () =>
      api(`/api/v1/finance/payments`, {
        method: "POST",
        body: JSON.stringify({
          partyType: "SUPPLIER",
          partyId: pay?.supplier.id,
          direction: "OUT",
          amount: Number(payForm.amount),
          method: payForm.method,
          reference: payForm.reference || undefined,
          notes: payForm.notes || undefined,
          purchaseId: pay?.id,
        }),
      }),
    onSuccess: () => {
      toastSuccess(`Paid ${payForm.amount} for ${pay?.invoiceNumber}`);
      setPay(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not record payment"),
  });

  function openPay(p: Purchase) {
    setPay(p);
    setPayForm({ amount: String(p.due), method: "CASH", reference: "", notes: "" });
  }

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
                  <div className="flex items-center justify-end gap-1">
                    {/* Primary — Pay with amount + icon (always visible if due) */}
                    {Number(p.due) > 0.005 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs font-medium"
                        onClick={() => openPay(p)}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Pay {moneyText(p.due)}
                      </Button>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">Paid</span>
                    )}

                    {/* Secondary — Print + SMS as icons, Return as icon */}
                    <div className="hidden items-center gap-1 sm:flex">
                      <IconActionButton
                        icon={<Undo2 className="h-3.5 w-3.5" />}
                        label="Return"
                        description="Create purchase return"
                        size="xs"
                        onClick={() => {
                          setRet(p);
                          setRetItem(p.items?.[0]?.id ?? "");
                        }}
                      />
                      <DocumentActions type="purchase" id={p.id} number={p.invoiceNumber} iconOnly />
                      <SendSmsButton
                        iconOnly
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
                    </div>

                    {/* Overflow menu — mobile + extra */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {Number(p.due) > 0.005 ? (
                          <DropdownMenuItem onClick={() => openPay(p)}>
                            <CreditCard className="h-4 w-4" /> Pay {moneyText(p.due)}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          onClick={() => {
                            setRet(p);
                            setRetItem(p.items?.[0]?.id ?? "");
                          }}
                        >
                          <Undo2 className="h-4 w-4" /> Return
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1">
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <Printer className="h-3 w-3" /> Documents
                          </div>
                          <DocumentActions type="purchase" id={p.id} number={p.invoiceNumber} />
                        </div>
                        <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                          <div className="flex w-full items-center gap-2">
                            <Mail className="h-4 w-4" />
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
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    <div className="flex items-center justify-end gap-1">
                      <div className="hidden sm:flex items-center gap-1">
                        <DocumentActions type="purchase-return" id={r.id} number={r.number} iconOnly />
                        {r.purchase?.supplier ? (
                          <SendSmsButton
                            iconOnly
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <div className="px-2 py-1">
                            <DocumentActions type="purchase-return" id={r.id} number={r.number} />
                          </div>
                          {r.purchase?.supplier ? (
                            <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                              <div className="flex w-full items-center gap-2">
                                <Mail className="h-4 w-4" />
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
                              </div>
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <Dialog
        open={!!pay}
        title={pay ? `Pay ${pay.invoiceNumber}` : "Pay purchase"}
        onClose={() => setPay(null)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setPay(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={payMutation.isPending || !payForm.amount || Number(payForm.amount) <= 0 || Number(payForm.amount) > Number(pay?.due ?? 0) + 0.001}
              onClick={() => payMutation.mutate()}
            >
              Pay {payForm.amount ? moneyText(payForm.amount) : ""}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {pay ? (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">GRN</span><span className="font-medium">{pay.invoiceNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span>{pay.supplier?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{moneyText(pay.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span className="font-semibold">{moneyText(pay.due)}</span></div>
              <div className="mt-1 text-[11px] text-muted-foreground">Partial or full allowed. Leave due: {moneyText(String(Math.max(Number(pay.due) - Number(payForm.amount || 0), 0)))} — supplier `creditDue` updated, excess not allowed here.</div>
            </div>
          ) : null}
          <Field label="Amount *" hint={pay ? `Max ${pay.due}` : undefined}>
            <input className={inputClass} type="number" min="0" step="0.01" value={payForm.amount} onChange={(e) => setPayForm((x) => ({ ...x, amount: e.target.value }))} placeholder={pay?.due ?? ""} />
          </Field>
          <Field label="Method">
            <select className={inputClass} value={payForm.method} onChange={(e) => setPayForm((x) => ({ ...x, method: e.target.value }))}>
              {["CASH", "BANK", "MFS", "CARD"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Reference"><input className={inputClass} value={payForm.reference} onChange={(e) => setPayForm((x) => ({ ...x, reference: e.target.value }))} placeholder="Cheque / trx id" /></Field>
          <Field label="Notes"><input className={inputClass} value={payForm.notes} onChange={(e) => setPayForm((x) => ({ ...x, notes: e.target.value }))} placeholder="Optional" /></Field>
        </div>
      </Dialog>
    </AppShell>
  );
}
