"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Badge, Button, FilterSelect, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, ActionTooltip } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/cn";

type Row = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  channel: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
};

const TABS = [
  { value: "", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "critical", label: "Critical" },
  { value: "stock", label: "Stock" },
  { value: "sales", label: "Sales" },
  { value: "purchase", label: "Purchase" },
  { value: "returns", label: "Returns" },
  { value: "staff", label: "Staff" },
  { value: "system", label: "System" },
];

function relativeTime(iso: string) {
  const delta = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

function priorityVariant(priority: string) {
  if (priority === "CRITICAL") return "destructive" as const;
  if (priority === "HIGH") return "warning" as const;
  if (priority === "LOW") return "secondary" as const;
  return "outline" as const;
}

export default function NotificationsPage() {
  const { can } = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const reduceMotion = useReducedMotion();
  const list = useServerList<Row>("notifs", "/api/v1/extras/notifications", {
    extraKeys: ["tab", "priority"],
    extraLabels: { tab: "Tab", priority: "Priority" },
  });
  const tab = String(list.extras.tab ?? "");
  const [form, setForm] = useState({ channel: "IN_APP", to: "", title: "", message: "", type: "MANUAL" });
  const [sendOpen, setSendOpen] = useState(false);
  const [lowOpen, setLowOpen] = useState(false);
  const canSend = can("notification.send");

  function invalidate() {
    void list.refetch();
    void qc.invalidateQueries({ queryKey: ["notif-unread"] });
    void qc.invalidateQueries({ queryKey: ["notif-recent"] });
  }

  const readOne = useMutation({
    mutationFn: (id: string) => api(`/api/v1/extras/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: invalidate,
  });
  const readAll = useMutation({
    mutationFn: () => api("/api/v1/extras/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      toastSuccess("All notifications marked read");
      invalidate();
    },
    onError: (e) => toastError(e, "Could not mark all read"),
  });
  const send = useMutation({
    mutationFn: () =>
      api("/api/v1/extras/notifications", {
        method: "POST",
        body: JSON.stringify({
          channel: form.channel,
          to: form.to,
          title: form.title,
          message: form.message,
          type: form.type,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Notification sent");
      setSendOpen(false);
      invalidate();
    },
    onError: (e) => toastError(e, "Send failed"),
  });
  const low = useMutation({
    mutationFn: () => api("/api/v1/extras/notifications/low-stock", { method: "POST" }),
    onSuccess: (d) => {
      toastSuccess(`Stock scan queued ${(d as { queued: number }).queued} alerts`);
      setLowOpen(false);
      invalidate();
    },
    onError: (e) => toastError(e, "Scan failed"),
  });

  async function openRow(row: Row) {
    if (!row.isRead) await readOne.mutateAsync(row.id).catch(() => undefined);
    if (row.actionUrl && row.actionUrl.startsWith("/")) router.push(row.actionUrl);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send.mutate();
  }

  const motionProps = useMemo(
    () => (reduceMotion ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } }),
    [reduceMotion],
  );

  return (
    <AppShell>
      <motion.div {...motionProps}>
        <PageHeader title="Notifications" description="Inbox for stock, sales, and operational alerts.">
          <Button variant="outline" disabled={readAll.isPending} onClick={() => readAll.mutate()}>
            Mark all as read
          </Button>
          {canSend ? (
            <>
              <Button variant="outline" onClick={() => setLowOpen(true)}>Scan low stock</Button>
              <Button onClick={() => setSendOpen(true)}>Send notification</Button>
            </>
          ) : null}
        </PageHeader>
        <div className="mb-2 flex flex-wrap gap-1">
          {TABS.map((item) => (
            <button
              key={item.value || "all"}
              type="button"
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                tab === item.value ? "border-highlight bg-highlight/15 font-medium text-highlight-foreground" : "border-transparent bg-muted/40 text-muted-foreground",
              )}
              onClick={() => list.setFilter("tab", item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <ListFrame
          list={list}
          searchPlaceholder="Search title or message"
          dateFilter
          columnCount={5}
          emptyTitle="No notifications"
          extraFilters={
            <FilterSelect
              value={String(list.extras.priority ?? "")}
              onChange={(v) => list.setFilter("priority", v)}
              placeholder="Priority"
              options={[
                { value: "CRITICAL", label: "Critical" },
                { value: "HIGH", label: "High" },
                { value: "NORMAL", label: "Normal" },
                { value: "LOW", label: "Low" },
              ]}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-6" />
                <TableHead>Notification</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.rows.map((n) => (
                <TableRow
                  key={n.id}
                  className={cn("cursor-pointer", !n.isRead && "bg-highlight/10")}
                  onClick={() => void openRow(n)}
                >
                  <TableCell>
                    <span className={cn("inline-block h-2 w-2 rounded-full", n.isRead ? "bg-transparent" : "bg-highlight")} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium leading-tight">{n.title}</div>
                    <div className="text-[11px] leading-tight text-muted-foreground">{n.message}</div>
                  </TableCell>
                  <TableCell className="text-xs">{n.type.replaceAll("_", " ")}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant(n.priority)}>{n.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <ActionTooltip label={new Date(n.createdAt).toLocaleString()} side="top">
                      <span className="whitespace-nowrap">{relativeTime(n.createdAt)}</span>
                    </ActionTooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListFrame>
      </motion.div>
      <Dialog
        open={sendOpen}
        title="Send notification"
        onClose={() => setSendOpen(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
            <Button type="submit" form="notif-form" disabled={send.isPending}>Send</Button>
          </>
        }
      >
        <form id="notif-form" className="grid gap-3" onSubmit={onSubmit}>
          <select className={inputClass} value={form.channel} onChange={(e) => setForm((s) => ({ ...s, channel: e.target.value }))}>
            <option value="IN_APP">In-app</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </select>
          <input className={inputClass} placeholder="User email, phone, or id" value={form.to} onChange={(e) => setForm((s) => ({ ...s, to: e.target.value }))} required />
          <input className={inputClass} placeholder="Title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} required />
          <input className={inputClass} placeholder="Message" value={form.message} onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))} />
        </form>
      </Dialog>
      <ConfirmDialog
        open={lowOpen}
        title="Scan low-stock crossings?"
        description="Only SKUs that newly cross the threshold are queued. Already-low items are not spammed."
        confirmLabel="Scan now"
        variant="warning"
        loading={low.isPending}
        onClose={() => setLowOpen(false)}
        onConfirm={() => low.mutate()}
      />
    </AppShell>
  );
}
