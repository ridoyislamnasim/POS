"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Copy, Eye, MoreHorizontal, Printer, ShoppingCart, X, MessageCircle, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Button,
  PageHeader,
  SummaryCards,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  tableCellNumeric,
  tableCellActions,
  FilterSelect,
} from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SendSmsDialog, type SendSmsTarget } from "@/components/sms/send-sms-dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyCell, moneyText, statusBadge, sumField } from "@/components/erp-page";

type SO = {
  id: string;
  number: string;
  total: string;
  subtotal?: string;
  discount?: string;
  tax?: string;
  status: string;
  branchId?: string;
  locationId?: string | null;
  customerId?: string | null;
  expectedDeliveryAt?: string | null;
  reference?: string | null;
  saleId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  customer?: { id: string; name: string; phone?: string } | null;
  branch: { id: string; name: string; locationId?: string };
  _count?: { items: number };
};

function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OrdersPage() {
  const { me, can } = useMe();
  const router = useRouter();
  const list = useServerList<SO>("so", "/api/v1/commerce/sales-orders", {
    extraKeys: ["branchId", "customerId", "locationId"],
    extraLabels: { branchId: "Branch", customerId: "Customer", locationId: "Location" },
  });
  const [cancelRow, setCancelRow] = useState<SO | null>(null);
  const [smsTarget, setSmsTarget] = useState<SendSmsTarget | null>(null);
  const canManage = can("order.manage");
  const canSms = can("sms.send");

  // branch options from me
  const branches = me?.branches ?? [];

  const cancelSo = useMutation({
    mutationFn: (id: string) => api(`/api/v1/commerce/sales-orders/${id}`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }),
    onSuccess: () => {
      toastSuccess("Sales order cancelled");
      setCancelRow(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not cancel sales order"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/v1/commerce/sales-orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toastSuccess("Status updated");
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not update status"),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => api(`/api/v1/commerce/sales-orders/${id}/duplicate`, { method: "POST" }),
    onSuccess: (data: unknown) => {
      const row = data as { id: string };
      toastSuccess("Order duplicated as draft");
      list.refetch();
      if (row?.id) router.push(`/orders/${row.id}`);
    },
    onError: (e) => toastError(e, "Could not duplicate"),
  });

  const convertMut = useMutation({
    mutationFn: async (id: string) => {
      const payload = await api<{ id: string; branchId: string; customerId: string | null; items: { variantId: string; qty: string; unitPrice: string }[] }>(
        `/api/v1/commerce/sales-orders/${id}/convert`,
      );
      // store for POS handoff
      if (typeof window !== "undefined") {
        window.localStorage.setItem("so_convert_payload", JSON.stringify(payload));
        window.localStorage.setItem("so_convert_id", id);
      }
      return payload;
    },
    onSuccess: () => {
      toastSuccess("Opening POS with order items");
      router.push("/pos?so=convert");
    },
    onError: (e) => toastError(e, "Could not prepare conversion"),
  });

  function printOrder(o: SO) {
    if (typeof window === "undefined") return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>SALES ORDER ${o.number}</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;font-size:13px;text-align:left} .muted{color:#666;font-size:12px}</style>
      </head><body>
      <h1>SALES ORDER</h1>
      <div class="muted">${o.number} · ${o.status} · ${formatDate(o.createdAt)}</div>
      <div>Customer: ${o.customer?.name ?? "Walk-in"}${o.customer?.phone ? " · " + o.customer.phone : ""}</div>
      <div>Branch: ${o.branch?.name ?? ""}${o.locationId ? " · Location: " + o.locationId : ""}</div>
      <div>Total: ${moneyText(o.total)} ${o._count ? "· Items: " + o._count.items : ""}</div>
      <div class="muted" style="margin-top:16px">This is a Sales Order, not a Tax Invoice. Stock and revenue apply only when converted to a Sale.</div>
      <script>window.print();</script>
      </body></html>`);
    w.document.close();
  }

  function waDigits(phone?: string | null) {
    if (!phone) return "";
    const d = phone.replace(/\D/g, "");
    if (!d) return "";
    if (d.startsWith("880")) return d;
    if (d.startsWith("0") && d.length === 11) return `880${d.slice(1)}`;
    if (d.length === 10 && d.startsWith("1")) return `880${d}`;
    return d;
  }

  function waMessage(o: SO) {
    const lines = [
      `Hello ${o.customer?.name ?? "Customer"},`,
      `Your Sales Order ${o.number} is ${o.status}.`,
      `Branch: ${o.branch?.name ?? ""}`,
      `Total: ${moneyText(o.total)}${o._count ? ` · Items: ${o._count.items}` : ""}`,
      o.expectedDeliveryAt ? `Expected delivery: ${formatDate(o.expectedDeliveryAt)}` : "",
      o.reference ? `Ref: ${o.reference}` : "",
      "",
      "Thank you for your order!",
    ]
      .filter(Boolean)
      .join("\n");
    return lines;
  }

  function shareWhatsApp(o: SO) {
    if (!o.customer?.phone) {
      toastError(new Error("No customer phone for this order"), "WhatsApp requires customer phone");
      return;
    }
    const digits = waDigits(o.customer.phone);
    if (!digits) {
      toastError(new Error("Invalid phone"), "Could not parse phone");
      return;
    }
    const text = waMessage(o);
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function openSms(o: SO) {
    if (!o.customerId && !o.customer?.phone) {
      toastError(new Error("No customer for this order"), "Add a customer to send SMS");
      return;
    }
    setSmsTarget({
      recipientType: "CUSTOMER",
      recipientId: o.customerId ?? undefined,
      phone: o.customer?.phone ?? undefined,
      name: o.customer?.name ?? undefined,
      referenceType: "SalesOrder",
      referenceId: o.id,
      templateKey: "ORDER_STATUS",
      vars: {
        orderNo: o.number,
        status: o.status,
        amount: String(o.total),
        customerName: o.customer?.name ?? "Customer",
        branchName: o.branch?.name ?? "",
      },
    });
  }

  return (
    <AppShell>
      <PageHeader title="Sales Orders" description="Pre-sale order management — confirm, pack, and hand off to POS. Orders do not deduct stock until converted.">
        {canManage ? (
          <Button type="button" onClick={() => router.push("/orders/new")}>
            Create Sales Order
          </Button>
        ) : null}
      </PageHeader>
      <SummaryCards
        items={[
          { label: "Orders", value: list.pager.total, accent: "sky" },
          { label: "Total (page)", value: moneyText(sumField(list.rows, "total")), accent: "emerald" },
          { label: "Open", value: list.rows.filter((r) => ["DRAFT", "CONFIRMED", "PACKED"].includes(r.status)).length, accent: "amber" },
          { label: "Converted", value: list.rows.filter((r) => r.status === "CONVERTED").length, accent: "teal" },
        ]}
      />
      <ListFrame
        list={list}
        searchPlaceholder="Search SO number, customer, reference…"
        dateFilter
        statusOptions={[
          { value: "DRAFT", label: "Draft" },
          { value: "CONFIRMED", label: "Confirmed" },
          { value: "PACKED", label: "Packed" },
          { value: "SHIPPED", label: "Shipped" },
          { value: "DELIVERED", label: "Delivered" },
          { value: "CONVERTED", label: "Converted" },
          { value: "CANCELLED", label: "Cancelled" },
        ]}
        columnCount={7}
        emptyTitle="No sales orders"
        emptyHint="Create an order to confirm it before the register."
        extraFilters={
          branches.length > 1 ? (
            <FilterSelect
              value={String(list.extras.branchId ?? "")}
              onChange={(v) => list.setFilter("branchId", v)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="Branch"
            />
          ) : null
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SO Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className={tableCellNumeric}>Items</TableHead>
                <TableHead className={tableCellNumeric}>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/orders/${o.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                      {o.number}
                    </Link>
                    {o.reference ? <div className="text-[11px] text-muted-foreground">{o.reference}</div> : null}
                    {o.expectedDeliveryAt ? (
                      <div className="text-[11px] text-muted-foreground">Exp: {formatDate(o.expectedDeliveryAt)}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{o.customer?.name ?? "Walk-in"}</div>
                    {o.customer?.phone ? <div className="text-[11px] text-muted-foreground">{o.customer.phone}</div> : null}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{o.branch?.name ?? "—"}</div>
                    {o.locationId ? <div className="text-[11px] font-mono text-muted-foreground">{o.locationId.slice(-6)}</div> : null}
                  </TableCell>
                  <TableCell className={tableCellNumeric}>{o._count?.items ?? "—"}</TableCell>
                  <TableCell className={tableCellNumeric}>{moneyCell(o.total)}</TableCell>
                  <TableCell>{statusBadge(o.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                  <TableCell className={tableCellActions}>
                    <div className="flex items-center justify-end gap-1">
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => router.push(`/orders/${o.id}`)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="h-7 px-2">
                            More <ChevronDown className="ml-1 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="bottom" sideOffset={6} collisionPadding={8} className="w-[200px] max-h-[70vh] overflow-y-auto">
                          {o.status === "DRAFT" && canManage ? (
                            <DropdownMenuItem onSelect={() => statusMut.mutate({ id: o.id, status: "CONFIRMED" })}>Confirm</DropdownMenuItem>
                          ) : null}
                          {o.status === "CONFIRMED" && canManage ? (
                            <DropdownMenuItem onSelect={() => statusMut.mutate({ id: o.id, status: "PACKED" })}>Mark Packed</DropdownMenuItem>
                          ) : null}
                          {o.status === "PACKED" && canManage ? (
                            <DropdownMenuItem onSelect={() => statusMut.mutate({ id: o.id, status: "SHIPPED" })}>Mark Shipped</DropdownMenuItem>
                          ) : null}
                          {o.status === "SHIPPED" && canManage ? (
                            <DropdownMenuItem onSelect={() => statusMut.mutate({ id: o.id, status: "DELIVERED" })}>Mark Delivered</DropdownMenuItem>
                          ) : null}
                          {["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"].includes(o.status) && canManage ? (
                            <DropdownMenuItem onSelect={() => convertMut.mutate(o.id)} className="gap-2">
                              <ShoppingCart className="h-3.5 w-3.5" />
                              Convert to Sale
                            </DropdownMenuItem>
                          ) : null}
                          {o.saleId ? (
                            <DropdownMenuItem asChild>
                              <Link href={`/sales?search=${o.number}`} className="w-full cursor-pointer">
                                View Sale {o.saleId.slice(-6)}
                              </Link>
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => shareWhatsApp(o)} className="gap-2">
                            <MessageCircle className="h-3.5 w-3.5" />
                            Share on WhatsApp
                          </DropdownMenuItem>
                          {canSms ? (
                            <DropdownMenuItem onSelect={() => openSms(o)} className="gap-2">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Send SMS
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => duplicateMut.mutate(o.id)} className="gap-2">
                            <Copy className="h-3.5 w-3.5" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => printOrder(o)} className="gap-2">
                            <Printer className="h-3.5 w-3.5" />
                            Print
                          </DropdownMenuItem>
                          {canManage ? (
                            <DropdownMenuItem asChild>
                              <Link href={`/orders/${o.id}?edit=1`} className="w-full cursor-pointer">
                                Edit
                              </Link>
                            </DropdownMenuItem>
                          ) : null}
                          {o.status !== "CANCELLED" && o.status !== "CONVERTED" && canManage ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => setCancelRow(o)}
                                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListFrame>
      <ConfirmDialog
        open={Boolean(cancelRow)}
        title="Cancel Sales Order?"
        description={cancelRow ? `${cancelRow.number} will be cancelled and no longer available for conversion.` : "Cancel this order."}
        confirmLabel="Cancel order"
        loading={cancelSo.isPending}
        onClose={() => setCancelRow(null)}
        onConfirm={() => cancelRow && cancelSo.mutate(cancelRow.id)}
      />
      <SendSmsDialog open={Boolean(smsTarget)} target={smsTarget} onClose={() => setSmsTarget(null)} />
    </AppShell>
  );
}
