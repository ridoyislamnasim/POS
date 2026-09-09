"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader, ShellCard, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";

const REPORTS = [
  { href: "/reports/sales", title: "Sales Report", desc: "Tickets, tax, payment mix" },
  { href: "/reports/purchases", title: "Purchase Report", desc: "GRN totals and dues" },
  { href: "/reports/inventory", title: "Inventory Report", desc: "On-hand qty and stock value" },
  { href: "/reports/profit", title: "Profit Report", desc: "Gross and net after expenses" },
  { href: "/reports/expenses", title: "Expense Report", desc: "Posted expenses by category" },
  { href: "/reports/dues", title: "Due Report", desc: "Customer and supplier balances" },
  { href: "/reports/tax", title: "Tax / VAT Report", desc: "Output vs input VAT" },
  { href: "/reports/cashier", title: "Cashier Report", desc: "Sales by cashier" },
  { href: "/reports/products", title: "Product Performance", desc: "Best-selling SKUs" },
];

export default function ReportsHubPage() {
  return (
    <AppShell>
      <PageHeader title="Reports" description="Finance, inventory, tax, and cashier performance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href}>
            <ShellCard className="h-full transition hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{r.title}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-primary">Open report →</CardContent>
            </ShellCard>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
