"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useDebounced } from "@/lib/use-debounce";
import { type PosCustomer, usePOSStore } from "@/lib/pos-store";
import { Modal, btnGhost, btnPrimary, inputClass } from "@/components/ui";
import { getApiErrorMessage, toastPos, toastWarn } from "@/lib/toast";

export type CustomerHit = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  creditDue?: string | number | null;
  alreadyExists?: boolean;
};

function dueAmount(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function attachCustomer(row: CustomerHit) {
  const customer: NonNullable<PosCustomer> = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? null,
    creditDue: row.creditDue ?? 0,
  };
  usePOSStore.getState().setCustomer(customer);
}

export function PosCustomerPicker({
  openSignal,
  onConsumeOpen,
}: {
  openSignal: number;
  onConsumeOpen?: () => void;
}) {
  const customer = usePOSStore((s) => s.customer);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const debounced = useDebounced(q, 220);

  const search = useQuery({
    queryKey: ["pos-customer-search", debounced],
    queryFn: () =>
      api<CustomerHit[]>(`/api/v1/customers/search?q=${encodeURIComponent(debounced.trim())}&limit=20`),
    enabled: open,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  const rows = search.data ?? [];

  useEffect(() => {
    setActive(0);
  }, [debounced, rows.length]);

  useEffect(() => {
    if (openSignal <= 0) return;
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    onConsumeOpen?.();
  }, [openSignal, onConsumeOpen]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || createOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, createOpen]);

  function selectHit(row: CustomerHit) {
    attachCustomer(row);
    setOpen(false);
    setQ("");
    toastPos("success", `${row.name} · ${row.phone}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const hit = rows[active];
      if (open && hit) selectHit(hit);
      else setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }

  const due = dueAmount(customer?.creditDue);

  return (
    <div ref={rootRef} className="relative mb-2">
      {customer ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5 text-xs shadow-sm">
          <div className="min-w-0">
            <div className="truncate font-medium">{customer.name}</div>
            <div className="text-muted-foreground">
              {customer.phone}
              <span className="ml-1 font-mono text-[10px] opacity-80">· {customer.id.slice(-8)}</span>
            </div>
            {due > 0 ? <div className="text-amber-700 dark:text-amber-400">Due ৳ {due.toFixed(2)}</div> : null}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className={btnGhost + " h-9 min-h-9 px-2 text-xs"}
              onClick={() => {
                setOpen(true);
                window.setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              Change
            </button>
            <button
              type="button"
              className={btnGhost + " h-9 min-h-9 px-2 text-xs"}
              onClick={() => usePOSStore.getState().setCustomer(null)}
            >
              Walk-in
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border bg-card px-2 py-1.5 text-xs shadow-sm">
          <div className="mb-1 text-muted-foreground">Walk-in · search customer (F4)</div>
        </div>
      )}

      <div className={customer && !open ? "hidden" : customer && open ? "mt-1" : "mt-1"}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Name, phone, email, or ID"
          className={inputClass + " h-11"}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg"
        >
          {search.isFetching ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          ) : null}
          {!search.isFetching && rows.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">No customer matches</div>
          ) : null}
          {rows.length > 0 ? (
            rows.map((row, i) => {
              const rowDue = dueAmount(row.creditDue);
              return (
                <button
                  key={row.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`flex min-h-12 w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm ${
                    i === active ? "bg-muted" : "hover:bg-muted/70"
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectHit(row)}
                >
                  <span className="font-medium">{row.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.phone}
                    <span className="ml-1 font-mono">· {row.id.slice(-8)}</span>
                    {row.email ? ` · ${row.email}` : ""}
                    {rowDue > 0 ? ` · Due ৳ ${rowDue.toFixed(2)}` : ""}
                  </span>
                </button>
              );
            })
          ) : null}
          <button
            type="button"
            className="min-h-12 w-full border-t px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted/70"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setCreateOpen(true);
              setOpen(false);
            }}
          >
            + Add New Customer
          </button>
        </div>
      ) : null}

      {createOpen ? (
        <CreateCustomerModal
          seedPhone={q}
          onClose={() => {
            setCreateOpen(false);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
          onCreated={(row) => {
            attachCustomer(row);
            setCreateOpen(false);
            setOpen(false);
            setQ("");
            toastPos("success", row.alreadyExists ? `Already on file · ${row.name}` : `${row.name} added`);
          }}
        />
      ) : null}
    </div>
  );
}

function CreateCustomerModal({
  seedPhone,
  onClose,
  onCreated,
}: {
  seedPhone: string;
  onClose: () => void;
  onCreated: (row: CustomerHit) => void;
}) {
  const looksPhone = seedPhone.replace(/\D/g, "").length >= 10;
  const [name, setName] = useState(looksPhone ? "" : seedPhone.trim());
  const [phone, setPhone] = useState(looksPhone ? seedPhone.trim() : "");
  const [email, setEmail] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) throw new Error("Enter a valid phone number");
      if (!name.trim()) throw new Error("Name is required");
      return api<CustomerHit>("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          createOnly: true,
        }),
      });
    },
    onSuccess: (row) => {
      if (!row?.id) return toastWarn("Customer not saved");
      onCreated(row);
    },
    onError: (e) => toastPos("error", getApiErrorMessage(e, "Could not create customer")),
  });

  return (
    <Modal title="Add customer" size="sm" onClose={onClose}>
      <p className="mb-2 text-xs text-muted-foreground">Creates once and attaches to this sale. Existing phone numbers are selected, not duplicated.</p>
      <label className="block text-sm">Name</label>
      <input className={inputClass + " mt-1"} value={name} onChange={(e) => setName(e.target.value)} />
      <label className="mt-2 block text-sm">Phone</label>
      <input className={inputClass + " mt-1"} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      <label className="mt-2 block text-sm">Email (optional)</label>
      <input className={inputClass + " mt-1"} value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
      <div className="mt-3 flex gap-2">
        <button type="button" className={btnGhost + " flex-1"} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={btnPrimary + " flex-1"} disabled={create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "Saving…" : "Save & select"}
        </button>
      </div>
    </Modal>
  );
}
