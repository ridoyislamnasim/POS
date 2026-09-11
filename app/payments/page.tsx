"use client";

import { useQuery } from "@tanstack/react-query";
import { ResourcePage, moneyCell, moneyText, statusBadge, sumField } from "@/components/erp-page";
import { api } from "@/lib/api";
import { DocumentActions } from "@/components/documents/document-actions";
import { SendSmsButton } from "@/components/sms/send-sms-dialog";

export default function PaymentsPage() {
  const customers = useQuery({ queryKey: ["customers-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/customers?limit=100") });
  const suppliers = useQuery({ queryKey: ["suppliers-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/suppliers?limit=100") });
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
      searchPlaceholder="Search reference or notes"
      dateFilter
      summary={({ rows, total }) => {
        const incoming = rows.filter((r) => (r as { direction?: string }).direction === "IN");
        const outgoing = rows.filter((r) => (r as { direction?: string }).direction === "OUT");
        return [
          { label: "Records", value: total, accent: "sky" },
          { label: "Received", value: moneyText(sumField(incoming, "amount")), accent: "emerald", description: "This page" },
          { label: "Paid out", value: moneyText(sumField(outgoing, "amount")), accent: "rose", description: "This page" },
        ];
      }}
      canDelete={false}
      canEdit={false}
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
        {
          key: "docs",
          label: "",
          render: (r) => {
            const row = r as { id: string; reference?: string; partyType: string; partyId: string; amount: string; direction: string };
            return (
              <div className="flex flex-wrap justify-end gap-1">
                <DocumentActions type="payment" id={row.id} number={row.reference} />
                {(row.partyType === "CUSTOMER" || row.partyType === "SUPPLIER") ? (
                  <SendSmsButton
                    target={{
                      recipientType: row.partyType,
                      recipientId: row.partyId,
                      referenceType: "LedgerPayment",
                      referenceId: row.id,
                      templateKey: row.partyType === "SUPPLIER" ? "SUPPLIER_PAYMENT" : "PAYMENT_CONFIRMATION",
                      vars: { amount: row.amount },
                    }}
                  />
                ) : null}
              </div>
            );
          },
        },
      ]}
    />
  );
}
