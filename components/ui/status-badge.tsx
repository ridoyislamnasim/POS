"use client";

import { Badge } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

type Tone = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const SUCCESS = /^(ACTIVE|APPROVED|COMPLETED|POSTED|RECEIVED|PAID|DELIVERED|IN_STOCK|PRESENT|CAPTURED|SUCCESS|CLOSED)$/i;
const PENDING = /^(PENDING|DRAFT|HOLD|QUEUED|ASSIGNED|PARTIAL|PARTIALLY_RETURNED|CONFIRMED|PACKED|SHIPPED|OPEN|TRIAL)$/i;
const WARNING = /^(WARNING|LOW|LATE|HALF_DAY|IN_TRANSIT|PARTIAL|OVERDUE|PAST_DUE|GRACE_PERIOD)$/i;
const DANGER = /^(REJECTED|CANCELLED|CANCELED|VOIDED|VOID|FAILED|DEACTIVATED|INACTIVE|OUT_OF_STOCK|ABSENT|DAMAGE|DAMAGED|LOSS|SHRINKAGE|FULLY_RETURNED|SUSPENDED|EXPIRED)$/i;
const INFO = /^(INFO|OPEN|NEW|OTHER)$/i;

export function statusTone(value: unknown): Tone {
  const s = String(value ?? "");
  if (SUCCESS.test(s)) return "success";
  if (DANGER.test(s)) return "destructive";
  if (WARNING.test(s) || PENDING.test(s)) return "warning";
  if (INFO.test(s)) return "info";
  return "secondary";
}

export function StatusBadge({ value, className }: { value: unknown; className?: string }) {
  const label = String(value ?? "—");
  return (
    <Badge variant={statusTone(value)} className={className}>
      {label.replace(/_/g, " ")}
    </Badge>
  );
}
