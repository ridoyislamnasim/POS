"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Button,
  PageHeader,
  StatusBadge,
  SummaryCards,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  tableCellActions,
  tableCellNumeric,
  tableSubText,
  IconActionButton,
} from "@/components/ui";
import { DocumentActions } from "@/components/documents/document-actions";
import { SendSmsButton } from "@/components/sms/send-sms-dialog";
import { moneyText, sumField } from "@/components/erp-page";
import { ArrowRight } from "lucide-react";

type Sale = {
  id: string;
  invoiceNumber: string;
  total: string;
  currency: string;
  createdAt: string;
  status: string;
  branch: { name: string };
  customer?: { id: string; name: string; phone: string } | null;
  due?: string;
  paid?: string;
};

type Me = { permissions: string[] };

export default function SalesPage() {
  const router = useRouter();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/api/v1/auth/me"), retry: false });
  useEffect(() => {
    if (me.isError) router.replace("/login");
  }, [me.isError, router]);
  const list = useServerList<Sale>("sales", "/api/v1/sales", { enabled: me.isSuccess });

  return (
    <AppShell>
      <PageHeader title="Sales" description="Tickets from this tenant. Open an invoice to return, refund, exchange, or void." />
      <SummaryCards
        items={[
          { label: "Invoices", value: list.pager.total, accent: "orange" },
          { label: "Total", value: moneyText(sumField(list.rows, "total")), accent: "emerald", description: "This page" },
          { label: "Completed", value: list.rows.filter((s) => s.status === "COMPLETED").length, accent: "lime" },
        ]}
      />
      <ListFrame
        list={list}
        searchPlaceholder="Search invoice or customer"
        dateFilter
        statusOptions={[
          { value: "COMPLETED", label: "Completed" },
          { value: "DRAFT", label: "Draft" },
          { value: "VOIDED", label: "Voided" },
          { value: "PARTIALLY_RETURNED", label: "Partial return" },
          { value: "FULLY_RETURNED", label: "Fully returned" },
        ]}
        columnCount={6}
        emptyTitle="No records found"
        emptyHint="Completed tickets from POS appear here."
      >
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className={tableCellNumeric}>Total</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  <Link className="underline-offset-2 hover:underline" href={`/sales/${s.id}`}>
                    {s.invoiceNumber}
                  </Link>
                  <div className={tableSubText}>{new Date(s.createdAt).toLocaleString()}</div>
                </TableCell>
                <TableCell>
                  {s.customer ? (
                    <div>
                      <div className="leading-tight">{s.customer.name}</div>
                      <div className={tableSubText}>{s.customer.phone}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Walk-in</span>
                  )}
                </TableCell>
                <TableCell>{s.branch.name}</TableCell>
                <TableCell>
                  <StatusBadge value={s.status} />
                </TableCell>
                <TableCell className={tableCellNumeric}>
                  {s.currency} {Number(s.total).toFixed(2)}
                </TableCell>
                  <TableCell className={tableCellActions}>
                    <div className="btn-group inline-flex flex-wrap justify-end gap-0.5">
                      <IconActionButton icon={<ArrowRight className="h-3.5 w-3.5" />} label="Open invoice" onClick={() => router.push(`/sales/${s.id}`)} />
                      <DocumentActions type="sale" id={s.id} number={s.invoiceNumber} />
                      {s.customer ? (
                        <SendSmsButton
                          target={{
                            recipientType: "CUSTOMER",
                            recipientId: s.customer.id,
                            phone: s.customer.phone,
                            name: s.customer.name,
                            referenceType: "Sale",
                            referenceId: s.id,
                            templateKey: "SALE_CONFIRMATION",
                            vars: { invoiceNo: s.invoiceNumber, amount: s.total, dueAmount: s.due, paidAmount: s.paid },
                          }}
                        />
                      ) : null}
                    </div>
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
    </AppShell>
  );
}
