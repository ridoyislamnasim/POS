"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Badge,
  Button,
  PageHeader,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  tableCellActions,
  tableCellNumeric,
} from "@/components/ui";
import { toastError, toastSuccess } from "@/lib/toast";

type TenantRow = {
  id: string;
  name: string;
  country: string;
  subscriptionStatus: string;
  apiAccessEnabled: boolean;
  plan?: { name: string; price: string; currency: string } | null;
  unpaidCount: number;
  overdueCount: number;
  unpaidAmount: string;
  invoiceCount: number;
};

export default function PlatformTenantsPage() {
  const router = useRouter();
  const { me, isSuccess } = useMe();
  const list = useServerList<TenantRow>("platform-tenants", "/api/v1/platform-billing/tenants", {
    enabled: Boolean(me?.isPlatform),
  });
  const [pending, setPending] = useState<TenantRow | null>(null);

  useEffect(() => {
    if (isSuccess && me && !me.isPlatform) router.replace("/dashboard");
  }, [isSuccess, me, router]);

  const toggle = useMutation({
    mutationFn: (row: TenantRow) =>
      api(`/api/v1/platform-billing/tenants/${row.id}/api-access`, {
        method: "POST",
        body: JSON.stringify({
          enabled: !row.apiAccessEnabled,
          reason: row.apiAccessEnabled
            ? "Please pay your previous month's bill to continue using the platform."
            : undefined,
        }),
      }),
    onSuccess: (_data, row) => {
      toastSuccess(row.apiAccessEnabled ? "API access disabled" : "API access restored", row.name);
      setPending(null);
      list.refetch();
    },
    onError: (e) => toastError(e, "Could not update API access"),
  });

  return (
    <AppShell>
      <PageHeader title="Tenants" description="Every shop on the platform. Disable API access when last month’s bill is unpaid." />
      <ListFrame list={list} searchPlaceholder="Search tenants" columnCount={7} emptyTitle="No tenants">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>API</TableHead>
              <TableHead className={tableCellNumeric}>Unpaid</TableHead>
              <TableHead className={tableCellNumeric}>Overdue</TableHead>
              <TableHead className={tableCellActions}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.country}</div>
                </TableCell>
                <TableCell>{row.plan?.name ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge value={row.subscriptionStatus} />
                </TableCell>
                <TableCell>
                  <Badge>{row.apiAccessEnabled ? "Enabled" : "Disabled"}</Badge>
                </TableCell>
                <TableCell className={tableCellNumeric}>
                  {row.unpaidCount} · ৳ {Number(row.unpaidAmount).toFixed(0)}
                </TableCell>
                <TableCell className={tableCellNumeric}>{row.overdueCount}</TableCell>
                <TableCell className={tableCellActions}>
                  <Link
                    href={`/platform/invoices?search=${encodeURIComponent(row.name)}`}
                    className="inline-flex h-9 items-center rounded-md px-3 text-sm hover:bg-accent"
                  >
                    Invoices
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setPending(row)}>
                    {row.apiAccessEnabled ? "Disable API" : "Enable API"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListFrame>
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.apiAccessEnabled ? "Disable this tenant’s API access?" : "Restore API access?"}
        description={
          pending?.apiAccessEnabled
            ? `${pending.name} will see: Please pay your previous month's bill to continue using the platform.`
            : `${pending?.name ?? "This tenant"} can use POS, sales, and reports again.`
        }
        confirmLabel={pending?.apiAccessEnabled ? "Disable API" : "Enable API"}
        variant="warning"
        loading={toggle.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && toggle.mutate(pending)}
      />
    </AppShell>
  );
}
