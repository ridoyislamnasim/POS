"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { KPI_ACCENT_ORDER, PageHeader, SummaryCards, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Truncate, tableCellNumeric } from "@/components/ui";
import { useServerEnvelope } from "@/lib/use-list-state";

const TITLES: Record<string, string> = {
  sales: "Sales Report",
  purchases: "Purchase Report",
  inventory: "Inventory Report",
  profit: "Profit Report",
  expenses: "Expense Report",
  dues: "Due Report",
  tax: "Tax / VAT Report",
  cashier: "Cashier Report",
  products: "Product Performance",
  returns: "Returns Report",
  receiving: "Receiving Report",
  damage: "Damage Report",
};

export default function ReportKindPage() {
  const { kind } = useParams<{ kind: string }>();
  const q = useServerEnvelope<Record<string, unknown> | unknown[]>(["report", kind], `/api/v1/reports/${kind}`);
  const data = (q.payload ?? {}) as Record<string, unknown>;
  const fullRows = Array.isArray(q.payload)
    ? (q.payload as Record<string, unknown>[])
    : Array.isArray(data.rows)
      ? (data.rows as Record<string, unknown>[])
      : Array.isArray(data.customers)
        ? (data.customers as Record<string, unknown>[])
        : [];
  const keys = fullRows[0] ? Object.keys(fullRows[0]).slice(0, 8) : [];
  const list = { ...q, rows: fullRows };
  const numericKey = /^(total|paid|due|tax|amount|qty|available|cost|value|count|revenue|returnedQty|returnValue)$/i;

  return (
    <AppShell>
      <PageHeader title={TITLES[kind] ?? kind} description="Live figures from this tenant — not sample data." />
      {!q.isLoading && !q.isError ? (
        <SummaryCards
          items={Object.entries(data)
            .filter(([, v]) => typeof v === "string" || typeof v === "number")
            .slice(0, 6)
            .map(([k, v], i) => ({
              label: k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
              value: String(v),
              accent: KPI_ACCENT_ORDER[i % KPI_ACCENT_ORDER.length],
            }))}
        />
      ) : null}
      <ListFrame
        list={list}
        searchPlaceholder="Search report rows"
        dateFilter
        columnCount={Math.max(keys.length, 4)}
        emptyTitle="No records found"
        emptyHint="There is no data in the selected range yet."
      >
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              {keys.map((k) => (
                <TableHead key={k} className={numericKey.test(k) ? tableCellNumeric : undefined}>{k}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {fullRows.map((row, i) => (
              <TableRow key={String(row.id ?? row.invoiceNumber ?? row.sku ?? row.code ?? i)}>
                {keys.map((k) => (
                  <TableCell key={k} className={`max-w-[220px] text-sm${numericKey.test(k) ? ` ${tableCellNumeric}` : ""}`}>
                    <Truncate title={typeof row[k] === "object" ? JSON.stringify(row[k]) : String(row[k] ?? "—")}>
                      {typeof row[k] === "object" ? JSON.stringify(row[k]) : String(row[k] ?? "—")}
                    </Truncate>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
    </AppShell>
  );
}
