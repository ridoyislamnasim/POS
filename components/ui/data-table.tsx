"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

const shellVariants = {
  default: "rounded-md border border-border bg-card shadow-sm overflow-hidden",
  /** Flush table inside padded cards (ShellCard / CardContent). */
  inset: "overflow-hidden -mx-4 w-[calc(100%+2rem)] md:-mx-6 md:w-[calc(100%+3rem)]",
  plain: "overflow-hidden",
} as const;

export type DataTableVariant = keyof typeof shellVariants;

const enterClass = "animate-in fade-in slide-in-from-bottom-1 duration-200";

export function DataTable({
  children,
  className,
  variant = "default",
  footer,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: DataTableVariant;
  footer?: React.ReactNode;
}) {
  return (
    <div className={cn(shellVariants[variant], enterClass, className)}>
      {children}
      {footer}
    </div>
  );
}

export function TableToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-2 py-1.5 sm:gap-2 sm:px-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TableTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-0.5 border-b border-border px-2 pt-1 sm:px-3", className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "relative -mb-px rounded-t-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
              active ? "border-b-2 border-highlight text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.count != null ? (
              <span className={cn("ml-1 tabular-nums", active ? "text-muted-foreground" : "text-muted-foreground/80")}>
                ({tab.count})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TableBulkBar({
  selectedCount,
  children,
  className,
  onClear,
}: {
  selectedCount: number;
  children: React.ReactNode;
  className?: string;
  onClear?: () => void;
}) {
  if (selectedCount <= 0) return null;
  return (
    <div
      className={cn(
        "border-b border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-1 duration-150",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-xs sm:px-3">
        <span className="font-medium tabular-nums text-foreground">{selectedCount} selected</span>
        <div className="flex flex-wrap items-center gap-1">{children}</div>
        {onClear ? (
          <button type="button" className="ml-auto text-muted-foreground underline-offset-2 hover:underline" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TableLoadingSkeleton({
  columns = 5,
  rows = 8,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <DataTable variant="default" className={className}>
      <div className="border-b border-border px-2 py-1.5 sm:px-3">
        <div className="flex gap-2">
          {Array.from({ length: Math.min(columns, 4) }).map((_, i) => (
            <div key={i} className="h-3 w-16 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, ri) => (
          <div key={ri} className="flex items-center gap-2 px-2 py-2 sm:px-3">
            {Array.from({ length: columns }).map((_, ci) => (
              <div
                key={ci}
                className={cn("h-3 animate-pulse rounded bg-muted", ci === 0 ? "w-[28%]" : ci === columns - 1 ? "ml-auto w-[12%]" : "w-[14%]")}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border px-2 py-1.5 sm:px-3">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-7 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    </DataTable>
  );
}

/** Compact controls for table toolbars (search, filters). */
export const tableToolbarInputClass =
  "flex h-8 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

export const tableCellNumeric = "text-right tabular-nums";
export const tableCellActions = "whitespace-nowrap text-right [&_.btn-group]:inline-flex [&_.btn-group]:gap-0.5";
export const tableSubText = "text-[11px] leading-tight text-muted-foreground";
