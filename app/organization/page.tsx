"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button, PageHeader, inputClass, ShellCard, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type Biz = {
  business: { name: string; legalName?: string; vatId?: string; address?: string; phone?: string; email?: string; currency?: string };
  tenant: { name: string; timezone?: string; locale?: string };
};

export default function OrganizationPage() {
  const q = useQuery({ queryKey: ["org"], queryFn: () => api<Biz>("/api/v1/org/business") });
  const [form, setForm] = useState({ name: "", legalName: "", vatId: "", address: "", phone: "", email: "", currency: "BDT", tenantName: "" });
  const hydrated = useRef(false);
  useEffect(() => {
    if (!q.data || hydrated.current) return;
    hydrated.current = true;
    setForm({
      name: q.data.business?.name ?? "",
      legalName: q.data.business?.legalName ?? "",
      vatId: q.data.business?.vatId ?? "",
      address: q.data.business?.address ?? "",
      phone: q.data.business?.phone ?? "",
      email: q.data.business?.email ?? "",
      currency: q.data.business?.currency ?? "BDT",
      tenantName: q.data.tenant?.name ?? "",
    });
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => api("/api/v1/org/business", { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => toastSuccess("Business profile saved"),
    onError: (e) => toastError(e, "Save failed"),
  });
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }
  return (
    <AppShell>
      <PageHeader title="Business / Organization" description="Legal profile used on invoices and receipts." />
      <ShellCard>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            {(["tenantName", "name", "legalName", "vatId", "address", "phone", "email", "currency"] as const).map((k) => (
              <input key={k} className={inputClass} placeholder={k} value={form[k]} onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))} />
            ))}
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </ShellCard>
    </AppShell>
  );
}
