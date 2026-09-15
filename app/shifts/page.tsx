"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListFrame } from "@/components/ui/list-frame";
import { Button, Field, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, inputClass, tableCellActions, IconActionButton } from "@/components/ui";
import { statusBadge } from "@/components/erp-page";
import { toastError, toastSuccess } from "@/lib/toast";
import { useState } from "react";
import { X } from "lucide-react";

type Shift = {
  id: string;
  status: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: string;
  closingCash?: string;
  branch: { name: string };
  register: { name: string };
  cashier: { name: string };
};

export default function ShiftsPage() {
  const list = useServerList<Shift>("shifts", "/api/v1/shifts");
  const [pending, setPending] = useState<Shift | null>(null);
  const [closingCash, setClosingCash] = useState("");
  const closeShift = useMutation({
    mutationFn: () =>
      api(`/api/v1/shifts/${pending!.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closingCash: closingCash || undefined }),
      }),
    onSuccess: () => {
      toastSuccess("Shift closed");
      setPending(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not close shift"),
  });
  return (
    <AppShell>
      <PageHeader title="Shift Management" description="Open and closed register sessions. Close a till from here or from POS." />
      <ListFrame
        list={list}
        searchPlaceholder="Search cashier or branch"
        dateFilter
        statusOptions={[
          { value: "OPEN", label: "Open" },
          { value: "CLOSED", label: "Closed" },
        ]}
        columnCount={6}
        emptyTitle="No records found"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cashier</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Register</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.cashier?.name}</TableCell>
                <TableCell>{s.branch?.name}</TableCell>
                <TableCell>{s.register?.name}</TableCell>
                <TableCell>{new Date(s.openedAt).toLocaleString()}</TableCell>
                <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell className={tableCellActions}>
                    {s.status === "OPEN" ? (
                      <IconActionButton icon={<X className="h-3.5 w-3.5" />} label="Close shift" variant="warning" onClick={() => {
                        setClosingCash("");
                        setPending(s);
                      }} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
      <ConfirmDialog
        open={Boolean(pending)}
        title="Close this shift?"
        description={pending ? `${pending.cashier?.name} · ${pending.branch?.name}. Counted cash is optional; expected float is used if empty.` : "Close the register."}
        confirmLabel="Close shift"
        variant="warning"
        loading={closeShift.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => closeShift.mutate()}
      >
        <Field label="Counted cash">
          <input className={inputClass} type="number" placeholder="Optional" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </AppShell>
  );
}
