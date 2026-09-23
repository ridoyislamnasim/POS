"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Printer, ShoppingCart, Truck, PackageCheck, Check, X, MessageCircle, MessageSquare } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Button, inputClass, Field } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { SendSmsDialog, type SendSmsTarget } from "@/components/sms/send-sms-dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import { moneyText } from "@/components/erp-page";
import { useState } from "react";

type SOItem = {
  id: string;
  variantId: string;
  qty: string;
  unitPrice: string;
  originalPrice?: string;
  discountAmount?: string;
  taxRate?: string;
  taxAmount?: string;
  lineTotal: string;
  nameSnapshot: string;
  skuSnapshot: string;
  variantSnapshot?: string | null;
  variant?: { product?: { name: string }; sku: string; imageUrl?: string | null };
  stock?: { available: number | null } | null;
};

type SO = {
  id: string;
  number: string;
  status: string;
  branchId: string;
  locationId?: string | null;
  customerId?: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes?: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
  deliveryNotes?: string | null;
  expectedDeliveryAt?: string | null;
  reference?: string | null;
  saleId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  branch?: { name: string; locationId?: string };
  customer?: { id: string; name: string; phone?: string; email?: string | null; address?: string | null };
  items: SOItem[];
};

function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const router = useRouter();
  const sp = useSearchParams();
  const editMode = sp.get("edit") === "1";
  const { can } = useMe();
  const canManage = can("order.manage");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editExpected, setEditExpected] = useState("");
  const [smsTarget, setSmsTarget] = useState<SendSmsTarget | null>(null);

  const q = useQuery({
    queryKey: ["so-detail", id],
    queryFn: () => api<SO>(`/api/v1/commerce/sales-orders/${id}`),
  });

  const data = q.data;

  const cancelMut = useMutation({
    mutationFn: () => api(`/api/v1/commerce/sales-orders/${id}`, { method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }) }),
    onSuccess: () => {
      toastSuccess("Cancelled");
      q.refetch();
      setCancelOpen(false);
    },
    onError: (e) => toastError(e, "Cancel failed"),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => api(`/api/v1/commerce/sales-orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toastSuccess("Status updated");
      q.refetch();
    },
    onError: (e) => toastError(e, "Status update failed"),
  });

  const dupMut = useMutation({
    mutationFn: () => api<{ id: string }>(`/api/v1/commerce/sales-orders/${id}/duplicate`, { method: "POST" }),
    onSuccess: (d) => {
      toastSuccess("Duplicated as draft");
      router.push(`/orders/${d.id}`);
    },
    onError: (e) => toastError(e, "Duplicate failed"),
  });

  const convertMut = useMutation({
    mutationFn: async () => {
      const payload = await api<{ id: string; branchId: string; customerId: string | null; items: { variantId: string; qty: string; unitPrice: string }[] }>(
        `/api/v1/commerce/sales-orders/${id}/convert`,
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem("so_convert_payload", JSON.stringify(payload));
        window.localStorage.setItem("so_convert_id", id);
      }
      return payload;
    },
    onSuccess: () => {
      toastSuccess("Opening POS");
      router.push("/pos?so=convert");
    },
    onError: (e) => toastError(e, "Convert failed"),
  });

  function printSO() {
    if (!data) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = data.items.map((it) => `<tr><td>${it.nameSnapshot}</td><td>${it.variantSnapshot ?? ""}</td><td>${it.skuSnapshot}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">৳ ${Number(it.unitPrice).toFixed(2)}</td><td style="text-align:right">৳ ${Number(it.lineTotal).toFixed(2)}</td></tr>`).join("");
    w.document.write(`<html><head><title>SALES ORDER ${data.number}</title><style>body{font-family:system-ui;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;font-size:12px}h1{font-size:18px}</style></head><body><h1>SALES ORDER</h1><div>${data.number} · ${data.status}</div><div>Customer: ${data.customer?.name ?? "Walk-in"}</div><div>Branch: ${data.branch?.name ?? ""}</div><table><thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:12px;text-align:right">Subtotal ${moneyText(data.subtotal)} · Discount ${moneyText(data.discount)} · Tax ${moneyText(data.tax)} · <b>Total ${moneyText(data.total)}</b></div><p style="font-size:11px;color:#666;margin-top:16px">SALES ORDER — not a Tax Invoice. Revenue and stock apply only when converted to a Sale.</p><script>window.print()</script></body></html>`);
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

  function waMessage(d: SO) {
    return [
      `Hello ${d.customer?.name ?? "Customer"},`,
      `Your Sales Order ${d.number} is ${d.status}.`,
      `Branch: ${d.branch?.name ?? ""}`,
      `Total: ${moneyText(d.total)} · Items: ${d.items.length}`,
      d.expectedDeliveryAt ? `Expected delivery: ${formatDate(d.expectedDeliveryAt)}` : "",
      d.reference ? `Ref: ${d.reference}` : "",
      "",
      "Thank you for your order!",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function shareWhatsApp() {
    if (!data?.customer?.phone) {
      toastError(new Error("No customer phone"), "WhatsApp requires customer phone");
      return;
    }
    const digits = waDigits(data.customer.phone);
    if (!digits) {
      toastError(new Error("Invalid phone"), "Could not parse phone");
      return;
    }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(waMessage(data))}`, "_blank", "noopener,noreferrer");
  }

  function openSms() {
    if (!data) return;
    if (!data.customerId && !data.customer?.phone) {
      toastError(new Error("No customer"), "Add a customer to send SMS");
      return;
    }
    setSmsTarget({
      recipientType: "CUSTOMER",
      recipientId: data.customerId ?? undefined,
      phone: data.customer?.phone ?? undefined,
      name: data.customer?.name ?? undefined,
      referenceType: "SalesOrder",
      referenceId: data.id,
      templateKey: "ORDER_STATUS",
      vars: {
        orderNo: data.number,
        status: data.status,
        amount: String(data.total),
        customerName: data.customer?.name ?? "Customer",
        branchName: data.branch?.name ?? "",
      },
    });
  }

  if (q.isLoading) return <AppShell><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppShell>;
  if (q.isError || !data) return <AppShell><div className="p-6 text-sm text-destructive">Could not load order.</div></AppShell>;

  const canEdit = canManage && !["CONVERTED", "CANCELLED"].includes(data.status);
  const canConvert = canManage && ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"].includes(data.status);

  const canSms = can("sms.send");

  return (
    <AppShell>
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/orders")}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={shareWhatsApp} className="gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </Button>
          {canSms ? (
            <Button variant="outline" size="sm" onClick={openSms} className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> SMS
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={printSO}><Printer className="mr-1 h-3.5 w-3.5" />Print</Button>
          <Button variant="outline" size="sm" onClick={() => dupMut.mutate()} disabled={dupMut.isPending}><Copy className="mr-1 h-3.5 w-3.5" />Duplicate</Button>
          {canConvert ? <Button size="sm" onClick={() => convertMut.mutate()} disabled={convertMut.isPending}><ShoppingCart className="mr-1 h-3.5 w-3.5" />Convert to Sale</Button> : null}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{data.number}</h1>
              <StatusBadge value={data.status} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">Branch: {data.branch?.name ?? data.branchId} {data.locationId ? `· Location ${data.locationId.slice(-8)}` : ""} · Created {formatDate(data.createdAt)}</div>
            {data.expectedDeliveryAt ? <div className="text-sm">Expected delivery: {formatDate(data.expectedDeliveryAt)}</div> : null}
            {data.reference ? <div className="text-sm">Ref: {data.reference}</div> : null}
          </div>
          <div className="text-sm">
            <div className="font-medium">{data.customer?.name ?? "Walk-in Customer"}</div>
            {data.customer?.phone ? <div className="text-muted-foreground">{data.customer.phone}</div> : null}
            {data.customer?.email ? <div className="text-muted-foreground">{data.customer.email}</div> : null}
          </div>
        </div>

        {data.saleId ? (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            Converted to Sale <Link href={`/sales?search=${data.number}`} className="font-medium text-primary underline-offset-4 hover:underline">{data.saleId.slice(0, 8)}… View Sale</Link> · <button className="underline" onClick={() => window.open(`/api/v1/sales/${data.saleId}/documents/invoice.pdf`, "_blank")}>Invoice</button>
          </div>
        ) : null}

        <div className="mt-4">
          <div className="text-sm font-semibold">Products</div>
          <div className="mt-2 divide-y rounded-md border">
            {data.items.map((it) => (
              <div key={it.id} className="flex gap-3 p-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.variant?.imageUrl ? <img src={fileUrl(it.variant.imageUrl)} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No img</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.nameSnapshot}</div>
                  <div className="text-xs text-muted-foreground">{it.variantSnapshot ?? ""} {it.variantSnapshot ? "·" : ""} <span className="font-mono">{it.skuSnapshot}</span></div>
                  <div className="text-xs tabular-nums text-muted-foreground">Avail: {it.stock?.available != null ? it.stock.available : "—"}</div>
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums">
                  <div>{Number(it.qty)} × ৳ {Number(it.unitPrice).toFixed(2)}</div>
                  {Number(it.discountAmount ?? 0) > 0 ? <div className="text-xs text-amber-600">Disc ৳ {Number(it.discountAmount).toFixed(2)}</div> : null}
                  {Number(it.taxAmount ?? 0) > 0 ? <div className="text-xs text-muted-foreground">VAT ৳ {Number(it.taxAmount).toFixed(2)}</div> : null}
                  <div className="font-semibold">৳ {Number(it.lineTotal).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium">Notes</div>
            <div className="mt-1 space-y-1 text-muted-foreground">
              <div>Customer: {data.customerNotes ?? data.notes ?? "—"}</div>
              <div>Internal: {data.internalNotes ?? "—"}</div>
              <div>Delivery: {data.deliveryNotes ?? "—"}</div>
            </div>
            {canEdit && editMode ? (
              <div className="mt-2 space-y-2">
                <Field label="Internal notes">
                  <textarea className={inputClass + " min-h-[60px]"} defaultValue={data.internalNotes ?? ""} onChange={(e) => setEditNotes(e.target.value)} />
                </Field>
                <Field label="Expected delivery">
                  <input type="date" className={inputClass} defaultValue={data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt).toISOString().slice(0,10) : ""} onChange={(e) => setEditExpected(e.target.value)} />
                </Field>
                <Button size="sm" onClick={() => statusMut.mutate("DRAFT")}>Save</Button>
              </div>
            ) : null}
          </div>
          <div className="rounded-md border p-3">
            <div className="text-sm font-medium">Order Summary</div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{moneyText(data.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="tabular-nums">{moneyText(data.discount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{moneyText(data.tax)}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><span>Grand Total</span><span className="tabular-nums">{moneyText(data.total)}</span></div>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Sales Order — payment when converted.</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium">Timeline</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {["DRAFT","CONFIRMED","PACKED","SHIPPED","DELIVERED","CONVERTED"].map((s) => {
              const idx = ["DRAFT","CONFIRMED","PACKED","SHIPPED","DELIVERED","CONVERTED"].indexOf(data.status);
              const cur = ["DRAFT","CONFIRMED","PACKED","SHIPPED","DELIVERED","CONVERTED"].indexOf(s);
              const done = cur <= idx && idx >=0;
              const isCancelled = data.status === "CANCELLED";
              return <span key={s} className={`rounded-full border px-2 py-1 ${done && !isCancelled ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground"}`}>{s}</span>;
            })}
            {data.status === "CANCELLED" ? <span className="rounded-full bg-destructive px-2 py-1 text-destructive-foreground">CANCELLED</span> : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {data.status === "DRAFT" && canEdit ? <Button size="sm" onClick={() => statusMut.mutate("CONFIRMED")} disabled={statusMut.isPending}><Check className="mr-1 h-3.5 w-3.5" />Confirm</Button> : null}
          {data.status === "CONFIRMED" && canEdit ? <Button size="sm" onClick={() => statusMut.mutate("PACKED")}><PackageCheck className="mr-1 h-3.5 w-3.5" />Pack</Button> : null}
          {data.status === "PACKED" && canEdit ? <Button size="sm" onClick={() => statusMut.mutate("SHIPPED")}><Truck className="mr-1 h-3.5 w-3.5" />Ship</Button> : null}
          {data.status === "SHIPPED" && canEdit ? <Button size="sm" onClick={() => statusMut.mutate("DELIVERED")}>Deliver</Button> : null}
          {canEdit ? <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button> : null}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel Sales Order?"
        description={`${data.number} will be cancelled and no longer available for conversion.`}
        confirmLabel="Cancel order"
        loading={cancelMut.isPending}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelMut.mutate()}
      />
      <SendSmsDialog open={Boolean(smsTarget)} target={smsTarget} onClose={() => setSmsTarget(null)} />
    </AppShell>
  );
}
