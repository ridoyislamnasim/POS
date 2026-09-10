"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-3xl",
  full: "max-w-6xl",
} as const;

export type DialogSize = keyof typeof sizes;

function firstField(root: HTMLElement | null) {
  if (!root) return null;
  return root.querySelector<HTMLElement>(
    "input:not([disabled]):not([type=hidden]),textarea:not([disabled]),select:not([disabled])",
  );
}

export function Dialog({
  open = true,
  title,
  description,
  children,
  footer,
  onClose,
  className,
  size = "md",
  dismissible = true,
  zIndex = 50,
}: {
  open?: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
  size?: DialogSize;
  dismissible?: boolean;
  zIndex?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && root.contains(active) && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) {
        return;
      }
      const field = firstField(root);
      (field ?? root).focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, dismissible]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open ? (
    <motion.div
      className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4"
      style={{ zIndex }}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px] transition-opacity"
        onClick={() => dismissible && onCloseRef.current()}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "pos-dialog-panel relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-orange-100/80 bg-card text-card-foreground shadow-2xl outline-none sm:rounded-xl dark:border-orange-950/40",
          sizes[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const el = e.target as HTMLElement;
          if (el.tagName === "TEXTAREA") return;
          if (el.tagName === "BUTTON") return;
          const form = el.closest("form");
          if (form) return;
          e.preventDefault();
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-orange-100/70 bg-gradient-to-r from-orange-50/80 via-card to-amber-50/40 px-5 py-4 dark:border-orange-950/40 dark:from-orange-950/20 dark:via-card dark:to-amber-950/10">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold tracking-tight">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onCloseRef.current()} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children ? <div className="overflow-y-auto px-5 py-4">{children}</div> : null}
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/40 px-5 py-3">{footer}</div> : null}
      </motion.div>
    </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
