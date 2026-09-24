"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { Button, Field, inputClass } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";

export type SmsRecipientType = "CUSTOMER" | "SUPPLIER" | "STAFF";

type Template = {
  id: string;
  key: string;
  name: string;
  recipientType: SmsRecipientType;
  bodyEn: string;
  bodyBn: string;
  enabled: boolean;
};

type Preview = { message: string; bodyEn: string; bodyBn: string; enabled: boolean };

export type SendSmsTarget = {
  recipientType: SmsRecipientType;
  recipientId?: string;
  phone?: string;
  name?: string;
  referenceType?: string;
  referenceId?: string;
  templateKey?: string;
  vars?: Record<string, string | number | undefined>;
};

export function SendSmsDialog({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: SendSmsTarget | null;
  onClose: () => void;
}) {
  const { can } = useMe();
  const [language, setLanguage] = useState("en");
  const [templateKey, setTemplateKey] = useState("");
  const [message, setMessage] = useState("");
  const templates = useQuery({
    queryKey: ["sms-templates"],
    queryFn: () => api<Template[]>("/api/v1/sms/templates"),
    enabled: open && (can("sms.view") || can("sms.send") || can("sms.settings")),
  });
  const options = useMemo(
    () => (templates.data ?? []).filter((t) => !target || t.recipientType === target.recipientType),
    [templates.data, target],
  );

  useEffect(() => {
    if (!open || !target) return;
    const preferred = target.templateKey && options.some((t) => t.key === target.templateKey)
      ? target.templateKey
      : options.find((t) => t.enabled)?.key ?? options[0]?.key ?? "";
    setTemplateKey(preferred);
    setMessage("");
  }, [open, target, options]);

  const preview = useQuery({
    queryKey: ["sms-preview", templateKey, language, target?.recipientId, message],
    queryFn: () =>
      api<Preview>("/api/v1/sms/preview", {
        method: "POST",
        body: JSON.stringify({
          templateKey: templateKey || undefined,
          language,
          message: message || undefined,
          vars: {
            customerName: target?.recipientType === "CUSTOMER" ? target.name : undefined,
            supplierName: target?.recipientType === "SUPPLIER" ? target.name : undefined,
            staffName: target?.recipientType === "STAFF" ? target.name : undefined,
            ...target?.vars,
          },
        }),
      }),
    enabled: open && Boolean(templateKey || message),
  });

  const send = useMutation({
    mutationFn: () =>
      api("/api/v1/sms/send", {
        method: "POST",
        body: JSON.stringify({
          recipientType: target?.recipientType,
          recipientId: target?.recipientId,
          to: target?.phone,
          templateKey: templateKey || undefined,
          language,
          message: message || preview.data?.message,
          referenceType: target?.referenceType,
          referenceId: target?.referenceId,
          vars: {
            customerName: target?.name,
            supplierName: target?.name,
            staffName: target?.name,
            ...target?.vars,
          },
        }),
      }),
    onSuccess: () => {
      toastSuccess("SMS queued");
      onClose();
    },
    onError: (e) => toastError(e, "Could not send SMS"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send.mutate();
  }

  if (!can("sms.send")) return null;

  return (
    <Dialog
      open={open && Boolean(target)}
      title="Send SMS"
      description={target ? `${target.name ?? target.phone ?? target.recipientType}` : "Send a tenant SMS"}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="send-sms-form" disabled={send.isPending || !target}>
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </>
      }
    >
      <form id="send-sms-form" className="grid gap-3" onSubmit={onSubmit}>
        <Field label="Template">
          <select className={inputClass} value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
            {options.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
                {t.enabled ? "" : " (off)"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <select className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
        </Field>
        <Field label="Message (optional override)">
          <textarea
            className={inputClass}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={preview.data?.message ?? "Preview uses the template"}
          />
        </Field>
        <div className="rounded-md border bg-muted/40 p-2 text-xs">
          <div className="mb-1 font-medium text-muted-foreground">Preview</div>
          <p className="whitespace-pre-wrap">{message || preview.data?.message || "Select a template"}</p>
        </div>
      </form>
    </Dialog>
  );
}

export function SendSmsButton({
  target,
  size = "xs",
  label = "SMS",
  iconOnly = false,
}: {
  target: SendSmsTarget;
  size?: "xs" | "sm";
  label?: string;
  iconOnly?: boolean;
}) {
  const { can } = useMe();
  const [open, setOpen] = useState(false);
  if (!can("sms.send")) return null;
  if (iconOnly) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Send SMS"
          title="Send SMS"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </button>
        <SendSmsDialog open={open} target={open ? target : null} onClose={() => setOpen(false)} />
      </>
    );
  }
  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <SendSmsDialog open={open} target={open ? target : null} onClose={() => setOpen(false)} />
    </>
  );
}
