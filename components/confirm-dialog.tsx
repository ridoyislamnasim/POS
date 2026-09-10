"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  variant = "danger",
  children,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: "danger" | "warning";
  children?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "destructive" : "warning"}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className={
            variant === "danger"
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning"
          }
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </Dialog>
  );
}
