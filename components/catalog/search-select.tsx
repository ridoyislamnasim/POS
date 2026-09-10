"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inputClass } from "@/components/ui";
import { cn } from "@/lib/cn";

export type SearchOption = { value: string; label: string; hint?: string };

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  allowEmpty = true,
  emptyLabel = "None",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(s));
  }, [options, q]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        className={cn(inputClass, "flex items-center justify-between text-left")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? "" : "text-muted-foreground"}>{selected?.label ?? placeholder}</span>
        <span className="text-xs text-muted-foreground">▾</span>
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          <input
            ref={searchRef}
            className={inputClass + " h-8"}
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="mt-1 max-h-48 overflow-auto">
            {allowEmpty ? (
              <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQ("");
                }}
              >
                {emptyLabel}
              </button>
            ) : null}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className={cn("block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted", o.value === value && "bg-muted")}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQ("");
                }}
              >
                <div>{o.label}</div>
                {o.hint ? <div className="text-xs text-muted-foreground">{o.hint}</div> : null}
              </button>
            ))}
            {!filtered.length ? <div className="px-2 py-2 text-xs text-muted-foreground">No matches</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
