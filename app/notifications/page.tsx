"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { Button, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, inputClass, Badge } from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type Log = { id: string; channel: string; to: string; template: string; status: string; createdAt: string };

export default function NotificationsPage() {
  const list = useQuery({ queryKey: ["notifs"], queryFn: () => api<Log[]>("/api/v1/extras/notifications") });
  const [form, setForm] = useState({ channel: "WHATSAPP", to: "+88017", template: "INVOICE", payload: "" });
  const send = useMutation({
    mutationFn: () => api("/api/v1/extras/notifications", { method: "POST", body: JSON.stringify({ ...form, payload: form.payload ? JSON.parse(form.payload) : {} }) }),
    onSuccess: () => {
      toastSuccess("Queued / sent");
      list.refetch();
    },
    onError: (e) => toastError(e, "Send failed"),
  });
  const low = useMutation({
    mutationFn: () => api("/api/v1/extras/notifications/low-stock", { method: "POST" }),
    onSuccess: (d) => {
      toastSuccess(`Low-stock alerts: ${(d as { queued: number }).queued}`);
      list.refetch();
    },
    onError: (e) => toastError(e, "Alert failed"),
  });
  const { rows, pager } = usePagedRows(list.data);
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send.mutate();
  }
  return (
    <AppShell>
      <PageHeader title="Notifications" description="WhatsApp, SMS, and email invoices. Low-stock alerts are automated from this screen.">
        <Button variant="outline" onClick={() => low.mutate()}>Send low-stock alerts</Button>
      </PageHeader>
      <form className="mb-4 grid gap-2 rounded-lg border bg-card p-4 md:grid-cols-5" onSubmit={onSubmit}>
        <select className={inputClass} value={form.channel} onChange={(e) => setForm((s) => ({ ...s, channel: e.target.value }))}>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="SMS">SMS</option>
          <option value="EMAIL">Email</option>
          <option value="IN_APP">In-app</option>
        </select>
        <input className={inputClass} placeholder="To" value={form.to} onChange={(e) => setForm((s) => ({ ...s, to: e.target.value }))} />
        <input className={inputClass} placeholder="Template" value={form.template} onChange={(e) => setForm((s) => ({ ...s, template: e.target.value }))} />
        <input className={inputClass} placeholder='Payload JSON' value={form.payload} onChange={(e) => setForm((s) => ({ ...s, payload: e.target.value }))} />
        <Button type="submit">Send</Button>
      </form>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((n) => (
              <TableRow key={n.id}>
                <TableCell>{n.channel}</TableCell>
                <TableCell>{n.to}</TableCell>
                <TableCell>{n.template}</TableCell>
                <TableCell><Badge>{n.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
    </AppShell>
  );
}
