"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button, Field, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, inputClass } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { toastCreated, toastError, toastSuccess } from "@/lib/toast";

type SettingsPayload = {
  settings: {
    currency: string;
    taxEnabled: boolean;
    defaultTaxRate: string;
    invoiceTemplate: string;
    receiptPrinter?: string;
    barcodePrinter?: string;
    language: string;
    theme: string;
    lowStockThreshold: number;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
    emailEnabled: boolean;
    invoiceFooter?: string;
  };
  tax: { id: string; name: string; rate: string }[];
  currencies: { code: string; name: string }[];
};

export default function SettingsPage() {
  const q = useQuery({ queryKey: ["settings"], queryFn: () => api<SettingsPayload>("/api/v1/settings") });
  const [form, setForm] = useState<Record<string, string | boolean | number>>({});
  useEffect(() => {
    if (!q.data?.settings) return;
    setForm({ ...q.data.settings });
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => api("/api/v1/settings", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => toastSuccess("Settings saved"),
    onError: (e) => toastError(e, "Save failed"),
  });
  const tax = useMutation({
    mutationFn: (body: { name: string; rate: string }) => api("/api/v1/settings/tax", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toastCreated("tax category", taxName);
      setTaxOpen(false);
      q.refetch();
    },
    onError: (e) => toastError(e, "Tax failed"),
  });
  const [taxName, setTaxName] = useState("VAT 15%");
  const [taxRate, setTaxRate] = useState("15");
  const [taxOpen, setTaxOpen] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <AppShell>
      <PageHeader title="Settings" description="Business profile extras: currency, tax, printers, payments, notifications, language, theme." />
      <form className="grid gap-6 lg:grid-cols-2" onSubmit={onSubmit}>
        <ShellCard>
          <CardHeader><CardTitle>Currency & tax</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <select className={inputClass} value={String(form.currency ?? "BDT")} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}>
              {(q.data?.currencies ?? [{ code: "BDT", name: "BDT" }]).map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form.taxEnabled)} onChange={(e) => setForm((s) => ({ ...s, taxEnabled: e.target.checked }))} />
              Tax / VAT enabled
            </label>
            <input className={inputClass} placeholder="Default tax rate" value={String(form.defaultTaxRate ?? "")} onChange={(e) => setForm((s) => ({ ...s, defaultTaxRate: e.target.value }))} />
            <input className={inputClass} placeholder="Low-stock threshold" value={String(form.lowStockThreshold ?? 5)} onChange={(e) => setForm((s) => ({ ...s, lowStockThreshold: Number(e.target.value) }))} />
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Invoice & printers</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <input className={inputClass} placeholder="Invoice template" value={String(form.invoiceTemplate ?? "")} onChange={(e) => setForm((s) => ({ ...s, invoiceTemplate: e.target.value }))} />
            <input className={inputClass} placeholder="Receipt printer" value={String(form.receiptPrinter ?? "")} onChange={(e) => setForm((s) => ({ ...s, receiptPrinter: e.target.value }))} />
            <input className={inputClass} placeholder="Barcode printer" value={String(form.barcodePrinter ?? "")} onChange={(e) => setForm((s) => ({ ...s, barcodePrinter: e.target.value }))} />
            <input className={inputClass} placeholder="Invoice footer" value={String(form.invoiceFooter ?? "")} onChange={(e) => setForm((s) => ({ ...s, invoiceFooter: e.target.value }))} />
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Language, theme, notifications</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <select className={inputClass} value={String(form.language ?? "en")} onChange={(e) => setForm((s) => ({ ...s, language: e.target.value }))}>
              <option value="en">English</option>
              <option value="bn">বাংলা</option>
            </select>
            <select className={inputClass} value={String(form.theme ?? "system")} onChange={(e) => setForm((s) => ({ ...s, theme: e.target.value }))}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.whatsappEnabled)} onChange={(e) => setForm((s) => ({ ...s, whatsappEnabled: e.target.checked }))} /> WhatsApp invoices</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.smsEnabled)} onChange={(e) => setForm((s) => ({ ...s, smsEnabled: e.target.checked }))} /> SMS notifications</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.emailEnabled)} onChange={(e) => setForm((s) => ({ ...s, emailEnabled: e.target.checked }))} /> Email invoice</label>
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Tax categories</CardTitle></CardHeader>
          <CardContent>
            <ul className="mb-3 text-sm">
              {(q.data?.tax ?? []).map((t) => (
                <li key={t.id}>{t.name} — {t.rate}%</li>
              ))}
            </ul>
            <Button type="button" variant="outline" onClick={() => setTaxOpen(true)}>
              Add tax category
            </Button>
          </CardContent>
        </ShellCard>
        <div className="lg:col-span-2">
          <Button type="submit">Save settings</Button>
        </div>
      </form>
      <Dialog
        open={taxOpen}
        title="Add tax category"
        description="Used on products and invoices."
        onClose={() => setTaxOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setTaxOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={tax.isPending} onClick={() => tax.mutate({ name: taxName, rate: taxRate })}>
              {tax.isPending ? "Saving…" : "Add category"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Name *">
            <input className={inputClass} value={taxName} onChange={(e) => setTaxName(e.target.value)} />
          </Field>
          <Field label="Rate % *">
            <input className={inputClass} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </AppShell>
  );
}
