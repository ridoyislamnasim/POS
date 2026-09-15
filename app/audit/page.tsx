"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Mail, MailOpen } from "lucide-react";
import { api, apiList } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { ActionTooltip, Badge, FilterSelect, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { usePagedRows } from "@/lib/use-pagination";
import { cn } from "@/lib/cn";

type Note = {
  id: string;
  tenantId?: string;
  branchId?: string | null;
  recipientUserId: string;
  recipientRole?: string | null;
  type: string;
  title: string;
  message: string;
  priority: string;
  channel: string;
  status: string;
  isRead: boolean;
  readAt?: string | null;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  template?: string | null;
  to?: string;
  createdAt: string;
};

type User = { id: string; name: string };

const AVATAR_COLORS = ["bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-rose-500", "bg-cyan-600"];

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function relativeTime(iso: string) {
  const delta = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

function priorityVariant(p: string) {
  if (p === "CRITICAL") return "destructive" as const;
  if (p === "HIGH") return "warning" as const;
  if (p === "LOW") return "secondary" as const;
  if (p === "NORMAL" || p === "MEDIUM") return "info" as const;
  return "outline" as const;
}

function statusVariant(s: string) {
  if (s === "SENT" || s === "DELIVERED" || s === "READ") return "success" as const;
  if (s === "QUEUED" || s === "PENDING") return "warning" as const;
  if (s === "FAILED" || s === "CANCELLED") return "destructive" as const;
  return "outline" as const;
}

const chipStyles = {
  type: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  template: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
  entity: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
} as const;

function MetaChip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-px text-[10px] font-medium", className)}>
      <span className="uppercase opacity-70">{label}:</span>
      {children}
    </span>
  );
}

function RecipientCell({ id, name, role }: { id: string; name: string; role?: string | null }) {
  const color = useMemo(() => {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }, [id]);
  return (
    <div className="flex items-center gap-2">
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white", color)}>
        {initials(name === "—" ? "?" : name)}
      </span>
      <div className="leading-tight">
        <div className="text-sm font-medium">{name}</div>
        {role ? <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{role.replaceAll("_", " ")}</div> : null}
      </div>
    </div>
  );
}

export default function AuditPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const notesQ = useQuery({
    queryKey: ["notif-recent"],
    queryFn: () => api<Note[]>("/api/v1/extras/notifications/recent"),
  });
  const usersQ = useQuery({
    queryKey: ["user-names"],
    queryFn: () => apiList<User>("/api/v1/users?limit=500").then((r) => r.data),
  });

  const notes = notesQ.data ?? [];

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usersQ.data ?? []) m.set(u.id, u.name);
    return m;
  }, [usersQ.data]);

  const [draft, setDraft] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const q = draft.trim().toLowerCase();

  const filtered = useMemo(() => {
    const fromStart = from ? new Date(`${from}T00:00:00`).getTime() : 0;
    const toEnd = to ? new Date(`${to}T23:59:59.999`).getTime() : 0;
    return notes.filter((n) => {
      if (q) {
        const hay = `${n.title} ${n.message} ${n.type} ${n.channel} ${nameById.get(n.recipientUserId) ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (priority && n.priority !== priority) return false;
      if (channel && n.channel !== channel) return false;
      if (status && n.status !== status) return false;
      const t = new Date(n.createdAt).getTime();
      if (fromStart && t < fromStart) return false;
      if (toEnd && t > toEnd) return false;
      return true;
    });
  }, [notes, nameById, q, priority, status, channel, from, to]);

  const { rows, pager } = usePagedRows(filtered);

  const setFilter = (k: string, v: string) => {
    if (k === "search") setDraft(v);
    else if (k === "priority") setPriority(v);
    else if (k === "status") setStatus(v);
    else if (k === "channel") setChannel(v);
    else if (k === "from") setFrom(v);
    else if (k === "to") setTo(v);
  };

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; value: string }[] = [];
    if (q) chips.push({ key: "search", label: "Search", value: draft });
    if (priority) chips.push({ key: "priority", label: "Priority", value: priority });
    if (status) chips.push({ key: "status", label: "Status", value: status });
    if (channel) chips.push({ key: "channel", label: "Channel", value: channel });
    if (from) chips.push({ key: "from", label: "From", value: from });
    if (to) chips.push({ key: "to", label: "To", value: to });
    return chips;
  }, [q, draft, priority, status, channel, from, to]);

  const reset = () => {
    setDraft("");
    setPriority("");
    setStatus("");
    setChannel("");
    setFrom("");
    setTo("");
  };

  const refetch = () => {
    void notesQ.refetch();
    void usersQ.refetch();
  };

  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/v1/extras/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-recent"] }),
  });

  async function openRow(n: Note) {
    if (!n.isRead) await markRead.mutateAsync(n.id).catch(() => undefined);
    if (n.actionUrl?.startsWith("/")) router.push(n.actionUrl);
  }

  const list = {
    draft,
    setDraft,
    searching: false,
    isFetching: notesQ.isFetching || usersQ.isFetching,
    isLoading: notesQ.isLoading || usersQ.isLoading,
    isError: notesQ.isError || usersQ.isError,
    error: notesQ.error ?? usersQ.error,
    refetch,
    rows,
    hasFilters: activeFilters.length > 0,
    reset,
    status,
    from,
    to,
    setFilter,
    activeFilters,
    pager,
  };

  return (
    <AppShell>
      <PageHeader title="Notifications / Recent Alerts" description="Latest alerts across inventory, stock, and operations for your team." />
      <ListFrame
        list={list}
        searchPlaceholder="Search title, message, or recipient"
        statusOptions={[
          { value: "SENT", label: "Sent" },
          { value: "QUEUED", label: "Queued" },
          { value: "FAILED", label: "Failed" },
        ]}
        dateFilter
        columnCount={7}
        emptyTitle="No notifications"
        emptyHint="Alerts appear here when stock, sales, or operations cross a threshold."
        extraFilters={
          <>
            <FilterSelect
              value={priority}
              onChange={(v) => setFilter("priority", v)}
              placeholder="Priority"
              options={[
                { value: "CRITICAL", label: "Critical" },
                { value: "HIGH", label: "High" },
                { value: "NORMAL", label: "Normal" },
                { value: "LOW", label: "Low" },
              ]}
            />
            <FilterSelect
              value={channel}
              onChange={(v) => setFilter("channel", v)}
              placeholder="Channel"
              options={[
                { value: "IN_APP", label: "In-app" },
                { value: "EMAIL", label: "Email" },
                { value: "SMS", label: "SMS" },
                { value: "WHATSAPP", label: "WhatsApp" },
              ]}
            />
          </>
        }
      >
        <Table className="min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead>Recipient</TableHead>
              <TableHead>Notification</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((n) => (
              <TableRow
                key={n.id}
                className={cn("cursor-pointer", !n.isRead && "bg-highlight/10")}
                onClick={() => void openRow(n)}
              >
                <TableCell>
                  <span className={cn("inline-block h-2 w-2 rounded-full", n.isRead ? "bg-transparent" : "bg-highlight")} />
                </TableCell>
                <TableCell>
                  <RecipientCell id={n.recipientUserId} name={nameById.get(n.recipientUserId) ?? "—"} role={n.recipientRole} />
                </TableCell>
                <TableCell>
                  <div className="font-medium leading-tight">{n.title}</div>
                  <div className="max-w-[280px] truncate text-[11px] leading-tight text-muted-foreground">{n.message}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <MetaChip label="Type" className={chipStyles.type}>
                      {n.type.replaceAll("_", " ")}
                    </MetaChip>
                    {n.template ? (
                      <MetaChip label="Template" className={chipStyles.template}>
                        {n.template.replaceAll("_", " ")}
                      </MetaChip>
                    ) : null}
                    {n.entityType ? (
                      <MetaChip label="Entity" className={chipStyles.entity}>
                        {n.entityType}
                      </MetaChip>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={priorityVariant(n.priority)}>{n.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{n.channel.replaceAll("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={statusVariant(n.status)}>{n.status}</Badge>
                    <ActionTooltip label={n.isRead ? "Read" : "Unread"} description={n.isRead ? "This alert has been seen" : "Needs attention"} variant={n.isRead ? "success" : "warning"} side="top">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center rounded p-1",
                          n.isRead
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {n.isRead ? <MailOpen className="h-3.5 w-3.5" aria-hidden /> : <Mail className="h-3.5 w-3.5" aria-hidden />}
                      </span>
                    </ActionTooltip>
                  </div>
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
    </AppShell>
  );
}