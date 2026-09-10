"use client";

import { type ReactNode, useState } from "react";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { tableToolbarInputClass } from "@/components/ui/data-table";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  loading,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("relative min-w-[12rem] flex-1 sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        className={cn(tableToolbarInputClass, "pl-7 pr-7")}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {loading ? <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
    </label>
  );
}

export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (key: "from" | "to", value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        className={cn(tableToolbarInputClass, "w-[8.5rem]")}
        value={from}
        onChange={(e) => onChange("from", e.target.value)}
        aria-label="From date"
      />
      <span className="text-[10px] text-muted-foreground">–</span>
      <input
        type="date"
        className={cn(tableToolbarInputClass, "w-[8.5rem]")}
        value={to}
        onChange={(e) => onChange("to", e.target.value)}
        aria-label="To date"
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      className={cn(tableToolbarInputClass, "w-auto min-w-[7rem]", className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder ?? "All"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FilterPopover({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setOpen((v) => !v)}>
        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
        More
        {count > 0 ? (
          <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{count}</span>
        ) : null}
      </Button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-30 mt-1 w-72 rounded-md border bg-popover p-3 shadow-md"
          >
            <div className="mb-2 flex items-center justify-between text-xs font-medium">
              Filters
              <button type="button" className="text-muted-foreground" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-2">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function FilterChips({
  chips,
  onRemove,
  onClear,
}: {
  chips: { key: string; label: string; value: string }[];
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 pb-1.5 sm:px-3">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          className="inline-flex items-center gap-1 rounded-full border bg-amber-50/70 px-2 py-0.5 text-[11px] hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70"
          onClick={() => onRemove(c.key)}
        >
          <span className="text-muted-foreground">{c.label}:</span> {c.value}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button type="button" className="text-[11px] text-muted-foreground underline-offset-2 hover:underline" onClick={onClear}>
        Clear all
      </button>
    </div>
  );
}

export function Truncate({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  const text = title ?? (typeof children === "string" ? children : undefined);
  return (
    <span className={cn("block max-w-[220px] truncate", className)} title={text}>
      {children}
    </span>
  );
}
