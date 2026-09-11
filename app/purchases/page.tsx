"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { useMe } from "@/lib/auth";
import { useVariantOptions } from "@/lib/lookups";
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
  const { me } = useMe();
  const suppliers = useQuery({ queryKey: ["suppliers-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers?limit=100") });
  const variantsQ = useVariantOptions();
  const variants = variantsQ.data ?? [];
  const list = useServerList<Purchase>("purchases", "/api/v1/purchases");
  const returns = useServerList<PurchaseReturn>("purchase-returns", "/api/v1/purchases/returns", { namespace: "prn" });
  const [open, setOpen] = useState(false);
  useHelpCreateAction(() => setOpen(true));
  const [ret, setRet] = useState<Purchase | null>(null);
  const [retQty, setRetQty] = useState("1");
  const [retItem, setRetItem] = useState("");
  const [retReason, setRetReason] = useState("Damaged goods");
  const [form, setForm] = useState({ branchId: "", supplierId: "", variantId: "", qty: "1", unitCost: "", paid: "0" });
  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/purchases", {
        method: "POST",
        body: JSON.stringify({
          branchId: form.branchId,
          supplierId: form.supplierId,
          paid: form.paid,
          items: [{ variantId: form.variantId, qty: Number(form.qty), unitCost: Number(form.unitCost) }],
        }),
      }),
    onSuccess: () => {
      toastCreated("purchase", "Stock was increased");
      setOpen(false);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not receive purchase"),
  });
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <AppShell>
      <PageHeader title="Purchases" description="Goods received — stock is increased on save.">
        <Button type="button" onClick={() => setOpen(true)}>
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
        open={open}
        title="Receive purchase"
        description="Stock increases as soon as you save."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="receive-purchase-form" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Receive
            </Button>
          </>
        }
      >
        <form id="receive-purchase-form" className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Branch *">
            <select className={inputClass} required value={form.branchId} onChange={(e) => setForm((s) => ({ ...s, branchId: e.target.value }))}>
              <option value="">Select branch</option>
              {(me?.branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Supplier *">
            <select className={inputClass} required value={form.supplierId} onChange={(e) => setForm((s) => ({ ...s, supplierId: e.target.value }))}>
              <option value="">Select supplier</option>
              {(suppliers.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="SKU *">
            <select className={inputClass} required value={form.variantId} onChange={(e) => setForm((s) => ({ ...s, variantId: e.target.value }))}>
              <option value="">Select SKU</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{v.sku}{v.name ? ` · ${v.name}` : ""}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity *">
            <input className={inputClass} type="number" min="1" required placeholder="Qty" value={form.qty} onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))} />
          </Field>
          <Field label="Unit cost *">
            <input className={inputClass} type="number" required placeholder="Unit cost" value={form.unitCost} onChange={(e) => setForm((s) => ({ ...s, unitCost: e.target.value }))} />
          </Field>
          <Field label="Paid now">
            <input className={inputClass} type="number" placeholder="Paid now" value={form.paid} onChange={(e) => setForm((s) => ({ ...s, paid: e.target.value }))} />
          </Field>
        </form>
      </Dialog>
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
