"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Badge,
  Button,
  Field,
  Kpi,
  PageHeader,
  PasswordInput,
  ShellCard,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableTabs,
  inputClass,
  tableSubText,
} from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { toastError, toastSuccess, toastUpdated } from "@/lib/toast";
import { SendSmsDialog, type SendSmsTarget } from "@/components/sms/send-sms-dialog";

type Dashboard = {
  access: { shopEnabled: boolean; platformEnabled: boolean; autoSendEnabled: boolean; reason: string | null };
  usage: {
    period: string;
    sent: number;
    failed: number;
    pending: number;
    lifetimeSent: number;
    quota: number | null;
    creditsRemaining: number | null;
    lastBalance: string | null;
  };
  recent: { id: string; recipient: string; recipientType: string; purpose: string; status: string; createdAt: string }[];
};

type Settings = {
  provider: string;
  senderId: string | null;
  apiBaseUrl: string | null;
  defaultLanguage: string;
  autoSendEnabled: boolean;
  platformEnabled: boolean;
  monthlyQuota: number | null;
  creditsRemaining: number | null;
  lastBalance: string | null;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  smsEnabled: boolean;
  smsAccessEnabled: boolean;
  smsAccessDisabledReason: string | null;
};

type Template = {
  id: string;
  key: string;
  name: string;
  purpose: string;
  recipientType: string;
  bodyEn: string;
  bodyBn: string;
  enabled: boolean;
  customized: boolean;
};

type Log = {
  id: string;
  recipient: string;
  recipientName?: string | null;
  recipientType: string;
  message: string;
  templateKey?: string | null;
  purpose: string;
  status: string;
  error?: string | null;
  sentAt?: string | null;
  createdAt: string;
  referenceType?: string | null;
};

type Usage = { period: string; months: { period: string; sentCount: number; failedCount: number }[]; settings: Settings };

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "send", label: "Send" },
  { id: "templates", label: "Templates" },
  { id: "logs", label: "Logs" },
  { id: "settings", label: "Settings" },
  { id: "usage", label: "Usage" },
];

export default function SmsPage() {
  const { can, me } = useMe();
  const [tab, setTab] = useState("dashboard");
  const dash = useQuery({ queryKey: ["sms-dashboard"], queryFn: () => api<Dashboard>("/api/v1/sms/dashboard"), enabled: can("sms.view") });
  const settingsQ = useQuery({ queryKey: ["sms-settings"], queryFn: () => api<Settings>("/api/v1/sms/settings"), enabled: can("sms.settings") });
  const templates = useQuery({ queryKey: ["sms-templates"], queryFn: () => api<Template[]>("/api/v1/sms/templates"), enabled: can("sms.view") });
  const usage = useQuery({ queryKey: ["sms-usage"], queryFn: () => api<Usage>("/api/v1/sms/usage"), enabled: can("sms.view") && tab === "usage" });
  const logs = useServerList<Log>("sms-logs", "/api/v1/sms/logs", {
    enabled: can("sms.view") && tab === "logs",
    extraKeys: ["recipientType"],
    extraLabels: { recipientType: "Recipient" },
  });

  if (!can("sms.view") && !can("sms.send")) {
    return (
      <AppShell>
        <PageHeader title="SMS" description="This login cannot open SMS." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="SMS" description="Tenant-scoped messages for customers, suppliers, and important staff alerts." />
      <TableTabs tabs={TABS.filter((t) => (t.id === "settings" ? can("sms.settings") : t.id === "send" ? can("sms.send") : can("sms.view")))} value={tab} onChange={setTab} />
      <div className="mt-3">
        {tab === "dashboard" ? <DashboardPanel data={dash.data} loading={dash.isLoading} /> : null}
        {tab === "send" ? <SendPanel templates={templates.data ?? []} /> : null}
        {tab === "templates" ? <TemplatesPanel rows={templates.data ?? []} onSaved={() => templates.refetch()} canEdit={can("sms.settings")} /> : null}
        {tab === "logs" ? <LogsPanel list={logs} canRetry={can("sms.send")} /> : null}
        {tab === "settings" && can("sms.settings") ? (
          <SettingsPanel
            data={settingsQ.data}
            isPlatform={Boolean(me?.isPlatform)}
            onSaved={() => {
              settingsQ.refetch();
              dash.refetch();
            }}
          />
        ) : null}
        {tab === "usage" ? <UsagePanel data={usage.data} /> : null}
      </div>
    </AppShell>
  );
}

function DashboardPanel({ data, loading }: { data?: Dashboard; loading: boolean }) {
  if (loading && !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const u = data?.usage;
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`${u?.period ?? "Month"} sent`} value={u?.sent ?? 0} accent="emerald" />
        <Kpi label="Failed" value={u?.failed ?? 0} accent="rose" />
        <Kpi label="Pending" value={u?.pending ?? 0} accent="amber" />
        <Kpi label="Credits / quota" value={u?.creditsRemaining ?? u?.quota ?? "∞"} accent="sky" />
      </div>
      <ShellCard>
        <CardHeader><CardTitle>Access</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant={data?.access.shopEnabled ? "success" : "secondary"}>{data?.access.shopEnabled ? "Shop on" : "Shop off"}</Badge>
          <Badge variant={data?.access.platformEnabled ? "success" : "secondary"}>{data?.access.platformEnabled ? "Platform on" : "Platform off"}</Badge>
          <Badge variant={data?.access.autoSendEnabled ? "success" : "secondary"}>{data?.access.autoSendEnabled ? "Auto on" : "Auto off"}</Badge>
          {data?.access.reason ? <span className="text-muted-foreground">{data.access.reason}</span> : null}
        </CardContent>
      </ShellCard>
      <ShellCard>
        <CardHeader><CardTitle>Recent</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recent ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.recipient}
                    <div className={tableSubText}>{r.purpose}</div>
                  </TableCell>
                  <TableCell>{r.recipientType}</TableCell>
                  <TableCell><StatusBadge value={r.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </ShellCard>
    </div>
  );
}

function SendPanel({ templates }: { templates: Template[] }) {
  const [target, setTarget] = useState<SendSmsTarget | null>(null);
  const [form, setForm] = useState({ recipientType: "CUSTOMER", recipientId: "", phone: "", name: "", templateKey: "" });
  const customers = useQuery({ queryKey: ["customers-lookup"], queryFn: () => api<{ id: string; name: string; phone: string }[]>("/api/v1/customers?limit=100") });
  const suppliers = useQuery({ queryKey: ["suppliers-lookup"], queryFn: () => api<{ id: string; name: string; phone?: string }[]>("/api/v1/suppliers?limit=100") });
  const people = form.recipientType === "SUPPLIER" ? suppliers.data ?? [] : customers.data ?? [];

  return (
    <ShellCard>
      <CardHeader><CardTitle>Send SMS</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Field label="Recipient type">
          <select className={inputClass} value={form.recipientType} onChange={(e) => setForm((s) => ({ ...s, recipientType: e.target.value, recipientId: "" }))}>
            <option value="CUSTOMER">Customer</option>
            <option value="SUPPLIER">Supplier</option>
          </select>
        </Field>
        <Field label="Party">
          <select
            className={inputClass}
            value={form.recipientId}
            onChange={(e) => {
              const id = e.target.value;
              const p = people.find((x) => x.id === id);
              setForm((s) => ({ ...s, recipientId: id, name: p?.name ?? "", phone: p && "phone" in p ? p.phone ?? "" : "" }));
            }}
          >
            <option value="">Select</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Phone override">
          <input className={inputClass} value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
        </Field>
        <Field label="Template">
          <select className={inputClass} value={form.templateKey} onChange={(e) => setForm((s) => ({ ...s, templateKey: e.target.value }))}>
            <option value="">Default manual</option>
            {templates.filter((t) => t.recipientType === form.recipientType).map((t) => (
              <option key={t.key} value={t.key}>{t.name}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Button
            type="button"
            onClick={() =>
              setTarget({
                recipientType: form.recipientType as SendSmsTarget["recipientType"],
                recipientId: form.recipientId || undefined,
                phone: form.phone || undefined,
                name: form.name || undefined,
                templateKey: form.templateKey || undefined,
              })
            }
          >
            Preview & send
          </Button>
        </div>
      </CardContent>
      <SendSmsDialog open={Boolean(target)} target={target} onClose={() => setTarget(null)} />
    </ShellCard>
  );
}

function TemplatesPanel({ rows, onSaved, canEdit }: { rows: Template[]; onSaved: () => void; canEdit: boolean }) {
  const [edit, setEdit] = useState<Template | null>(null);
  const save = useMutation({
    mutationFn: () =>
      api(`/api/v1/sms/templates/${edit?.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: edit?.name, bodyEn: edit?.bodyEn, bodyBn: edit?.bodyBn, enabled: edit?.enabled }),
      }),
    onSuccess: () => {
      toastUpdated("template");
      setEdit(null);
      onSaved();
    },
    onError: (e) => toastError(e, "Could not save template"),
  });
  const reset = useMutation({
    mutationFn: (id: string) => api(`/api/v1/sms/templates/${id}/reset`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Template reset");
      onSaved();
    },
    onError: (e) => toastError(e, "Reset failed"),
  });
  const toggle = useMutation({
    mutationFn: (row: Template) => api(`/api/v1/sms/templates/${row.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !row.enabled }) }),
    onSuccess: () => onSaved(),
    onError: (e) => toastError(e, "Could not toggle template"),
  });

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  {t.name}
                  <div className={tableSubText}>{t.key}{t.customized ? " · customized" : ""}</div>
                </TableCell>
                <TableCell>{t.recipientType}</TableCell>
                <TableCell>
                  <button type="button" disabled={!canEdit || toggle.isPending} onClick={() => canEdit && toggle.mutate(t)}>
                    <Badge variant={t.enabled ? "success" : "secondary"}>{t.enabled ? "On" : "Off"}</Badge>
                  </button>
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  {canEdit ? (
                    <>
                      <Button size="xs" variant="outline" onClick={() => setEdit(t)}>Edit</Button>
                      <Button size="xs" variant="ghost" onClick={() => reset.mutate(t.id)}>Reset</Button>
                    </>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={Boolean(edit)}
        title={edit?.name ?? "Template"}
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</Button>
          </>
        }
      >
        {edit ? (
          <div className="grid gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} />
              Enabled
            </label>
            <Field label="English">
              <textarea className={inputClass} rows={3} value={edit.bodyEn} onChange={(e) => setEdit({ ...edit, bodyEn: e.target.value })} />
            </Field>
            <Field label="বাংলা">
              <textarea className={inputClass} rows={3} value={edit.bodyBn} onChange={(e) => setEdit({ ...edit, bodyBn: e.target.value })} />
            </Field>
            <p className={tableSubText}>Variables: {"{{shopName}} {{customerName}} {{supplierName}} {{invoiceNo}} {{amount}} {{dueAmount}} {{paymentDate}} {{orderNo}} {{date}}"}</p>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function LogsPanel({ list, canRetry }: { list: ReturnType<typeof useServerList<Log>>; canRetry: boolean }) {
  const retry = useMutation({
    mutationFn: (id: string) => api(`/api/v1/sms/logs/${id}/retry`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Retry queued");
      list.refetch();
    },
    onError: (e) => toastError(e, "Retry failed"),
  });
  return (
    <ListFrame
      list={list}
      searchPlaceholder="Search phone, message, purpose"
      dateFilter
      statusOptions={[
        { value: "PENDING", label: "Pending" },
        { value: "SENT", label: "Sent" },
        { value: "FAILED", label: "Failed" },
      ]}
      extraFilters={
        <select
          className={inputClass}
          value={String(list.extras.recipientType ?? "")}
          onChange={(e) => list.setFilter("recipientType", e.target.value)}
        >
          <option value="">All recipients</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="STAFF">Staff</option>
        </select>
      }
      columnCount={6}
      emptyTitle="No SMS yet"
      emptyHint="Transactional and manual SMS appear here."
    >
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>Recipient</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>When</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                {r.recipientName ?? r.recipient}
                <div className={tableSubText}>{r.recipientType} · {r.recipient}</div>
              </TableCell>
              <TableCell>{r.purpose}</TableCell>
              <TableCell className="max-w-[240px] truncate text-xs">{r.message}</TableCell>
              <TableCell>
                <StatusBadge value={r.status} />
                {r.error ? <div className={tableSubText}>{r.error}</div> : null}
              </TableCell>
              <TableCell className="text-xs">{new Date(r.sentAt ?? r.createdAt).toLocaleString()}</TableCell>
              <TableCell>
                {canRetry && r.status === "FAILED" ? (
                  <Button size="xs" variant="outline" onClick={() => retry.mutate(r.id)}>Retry</Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ListFrame>
  );
}

function SettingsPanel({ data, onSaved, isPlatform }: { data?: Settings; onSaved: () => void; isPlatform: boolean }) {
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const hydrated = useRef(false);
  useEffect(() => {
    if (!data || hydrated.current) return;
    hydrated.current = true;
    setForm({
      provider: data.provider,
      senderId: data.senderId ?? "",
      apiBaseUrl: data.apiBaseUrl ?? "",
      defaultLanguage: data.defaultLanguage,
      autoSendEnabled: data.autoSendEnabled,
      smsEnabled: data.smsEnabled,
      monthlyQuota: data.monthlyQuota == null ? "" : String(data.monthlyQuota),
      creditsRemaining: data.creditsRemaining == null ? "" : String(data.creditsRemaining),
      apiKey: "",
      apiSecret: "",
    });
  }, [data]);
  const save = useMutation({
    mutationFn: () =>
      api("/api/v1/sms/settings", {
        method: "PATCH",
        body: JSON.stringify({
          provider: form.provider,
          senderId: form.senderId,
          apiBaseUrl: form.apiBaseUrl,
          defaultLanguage: form.defaultLanguage,
          autoSendEnabled: form.autoSendEnabled,
          smsEnabled: form.smsEnabled,
          monthlyQuota: form.monthlyQuota === "" ? null : form.monthlyQuota,
          creditsRemaining: form.creditsRemaining === "" ? null : form.creditsRemaining,
          apiKey: form.apiKey || undefined,
          apiSecret: form.apiSecret || undefined,
        }),
      }),
    onSuccess: () => {
      toastSuccess("SMS settings saved");
      setForm((s) => ({ ...s, apiKey: "", apiSecret: "" }));
      onSaved();
    },
    onError: (e) => toastError(e, "Save failed"),
  });
  const balance = useMutation({
    mutationFn: () => api("/api/v1/sms/usage/refresh-balance", { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Balance refreshed");
      onSaved();
    },
    onError: (e) => toastError(e, "Balance check failed"),
  });
  const lock = useMutation({
    mutationFn: (enabled: boolean) => api("/api/v1/sms/platform-access", { method: "PATCH", body: JSON.stringify({ enabled, reason: enabled ? null : "Disabled by platform" }) }),
    onSuccess: () => {
      toastSuccess("Platform SMS access updated");
      onSaved();
    },
    onError: (e) => toastError(e, "Could not update access"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <form className="grid gap-3 lg:grid-cols-2" onSubmit={onSubmit}>
      <ShellCard>
        <CardHeader><CardTitle>Provider</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          <select className={inputClass} value={String(form.provider ?? "GENERIC_HTTP")} onChange={(e) => setForm((s) => ({ ...s, provider: e.target.value }))}>
            <option value="GENERIC_HTTP">Generic HTTP</option>
            <option value="BULKSMSBD">BulkSMSBD</option>
            <option value="SSL_WIRELESS">SSL Wireless</option>
            <option value="TWILIO">Twilio</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <input className={inputClass} placeholder="Sender ID" value={String(form.senderId ?? "")} onChange={(e) => setForm((s) => ({ ...s, senderId: e.target.value }))} />
          <input className={inputClass} placeholder="API base URL (optional)" value={String(form.apiBaseUrl ?? "")} onChange={(e) => setForm((s) => ({ ...s, apiBaseUrl: e.target.value }))} />
          <PasswordInput placeholder={data.hasApiKey ? "API key (leave blank to keep)" : "API key"} value={String(form.apiKey ?? "")} onChange={(v) => setForm((s) => ({ ...s, apiKey: v }))} />
          <PasswordInput placeholder={data.hasApiSecret ? "API secret (leave blank to keep)" : "API secret"} value={String(form.apiSecret ?? "")} onChange={(v) => setForm((s) => ({ ...s, apiSecret: v }))} />
          <p className="text-xs text-muted-foreground">Secrets are stored encrypted and never returned to the browser.</p>
        </CardContent>
      </ShellCard>
      <ShellCard>
        <CardHeader><CardTitle>Sending</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          <select className={inputClass} value={String(form.defaultLanguage ?? "en")} onChange={(e) => setForm((s) => ({ ...s, defaultLanguage: e.target.value }))}>
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(form.smsEnabled)} onChange={(e) => setForm((s) => ({ ...s, smsEnabled: e.target.checked }))} />
            Enable SMS for this shop
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(form.autoSendEnabled)} onChange={(e) => setForm((s) => ({ ...s, autoSendEnabled: e.target.checked }))} />
            Automatic transactional SMS
          </label>
          <input className={inputClass} placeholder="Monthly quota (blank = none)" value={String(form.monthlyQuota ?? "")} onChange={(e) => setForm((s) => ({ ...s, monthlyQuota: e.target.value }))} />
          <input className={inputClass} placeholder="Prepaid credits (blank = none)" value={String(form.creditsRemaining ?? "")} onChange={(e) => setForm((s) => ({ ...s, creditsRemaining: e.target.value }))} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button>
            <Button type="button" variant="outline" onClick={() => balance.mutate()}>Refresh balance</Button>
            {isPlatform ? (
              <Button type="button" variant="outline" onClick={() => lock.mutate(!data.smsAccessEnabled)}>
                {data.smsAccessEnabled ? "Disable for tenant" : "Enable for tenant"}
              </Button>
            ) : null}
          </div>
          {!data.smsAccessEnabled ? <p className="text-xs text-destructive">{data.smsAccessDisabledReason || "Platform disabled SMS for this tenant."}</p> : null}
        </CardContent>
      </ShellCard>
    </form>
  );
}

function UsagePanel({ data }: { data?: Usage }) {
  return (
    <ShellCard>
      <CardHeader><CardTitle>Monthly usage</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-2 text-sm text-muted-foreground">Period {data?.period ?? "—"}. Balance {data?.settings.lastBalance ?? "n/a"}.</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Failed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.months ?? []).map((m) => (
              <TableRow key={m.period}>
                <TableCell>{m.period}</TableCell>
                <TableCell>{m.sentCount}</TableCell>
                <TableCell>{m.failedCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </ShellCard>
  );
}
