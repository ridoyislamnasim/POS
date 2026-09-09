"use client";

import { useQuery } from "@tanstack/react-query";
import { ResourcePage, moneyCell, statusBadge } from "@/components/erp-page";
import { api } from "@/lib/api";

export default function PaymentsPage() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/customers") });
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers") });
  const parties = [
    ...(customers.data ?? []).map((c) => ({ value: `CUSTOMER:${c.id}`, label: `Customer · ${c.name}` })),
    ...(suppliers.data ?? []).map((s) => ({ value: `SUPPLIER:${s.id}`, label: `Supplier · ${s.name}` })),
  ];
  return (
    <ResourcePage
      title="Payments"
      description="Collect customer dues or pay suppliers."
      path="/api/v1/finance/payments"
      queryKey="payments"
      canDelete={false}
      fields={[
        { key: "party", label: "Party", type: "select", required: true, options: parties },
        { key: "direction", label: "Direction", type: "select", required: true, options: [{ value: "IN", label: "Receive (IN)" }, { value: "OUT", label: "Pay (OUT)" }] },
        { key: "amount", label: "Amount", type: "number", required: true },
        { key: "method", label: "Method", type: "select", options: ["CASH", "CARD", "BANK", "MFS"].map((v) => ({ value: v, label: v })) },
        { key: "reference", label: "Reference" },
        { key: "notes", label: "Notes" },
      ]}
      transform={(form) => {
        const [partyType, partyId] = (form.party ?? "").split(":");
        return { ...form, partyType, partyId };
      }}
      columns={[
        { key: "partyType", label: "Party" },
        { key: "direction", label: "Dir", render: (r) => statusBadge((r as { direction: string }).direction) },
        { key: "amount", label: "Amount", render: (r) => moneyCell((r as { amount: string }).amount) },
        { key: "method", label: "Method" },
        { key: "reference", label: "Ref" },
      ]}
    />
  );
}
