"use client";

import Link from "next/link";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, tableCellNumeric } from "@/components/ui";

type Customer = { id: string; name: string; phone: string; loyaltyPoints: number };

export default function LoyaltyPage() {
  const list = useServerList<Customer>("loyalty-customers", "/api/v1/customers", { fixedParams: { minPoints: 1 } });
  return (
    <AppShell>
      <PageHeader title="Loyalty / Points" description="Open a customer to earn, redeem, or adjust points." />
      <ListFrame list={list} searchPlaceholder="Search customer or phone" columnCount={3} emptyTitle="No records found" emptyHint="Loyalty balances appear after points are earned.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className={tableCellNumeric}>Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="text-primary hover:underline">{c.name}</Link>
                </TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell className={tableCellNumeric}>{c.loyaltyPoints}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
    </AppShell>
  );
}
