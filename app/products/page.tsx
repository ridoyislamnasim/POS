"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import {
  Button,
  PageHeader,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Truncate,
  tableCellActions,
  tableCellNumeric,
  tableSubText,
  btnPrimary,
  IconActionButton,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { printBarcodeLabels } from "@/lib/print-barcodes";
import { toastError, toastSuccess, toastWarn } from "@/lib/toast";
import { Archive, Edit2, Printer } from "lucide-react";

type Product = {
  id: string;
  name: string;
  code: string;
  category: string | null;
  status: string;
  variants: {
    id: string;
    sku: string;
    price: string;
    status: string;
    barcodes: { code: string }[];
    stock: { quantity: string }[];
  }[];
};

export default function ProductsPage() {
  const qc = useQueryClient();
  const [pendingArchive, setPendingArchive] = useState<Product | null>(null);
  const list = useServerList<Product>("admin-products", "/api/v1/catalog/products");
  const archive = useMutation({
    mutationFn: (id: string) => api(`/api/v1/catalog/products/${id}/archive`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Product archived", pendingArchive?.name);
      setPendingArchive(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e) => toastError(e, "Could not archive product"),
  });

  return (
    <AppShell>
      <PageHeader title="Products" description="Catalogue, variants, and archive.">
        <Link href="/products/new" className={btnPrimary}>
          Add product
        </Link>
      </PageHeader>
      <ListFrame
        list={list}
        searchPlaceholder="Search name, SKU, barcode"
        statusOptions={[
          { value: "ACTIVE", label: "Active" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
        columnCount={7}
        emptyTitle="No records found"
        emptyHint="Create a product with a category. Variants are optional and fully dynamic."
        emptyAction={
          <Link href="/products/new" className={btnPrimary}>
            Add product
          </Link>
        }
      >
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU / code</TableHead>
              <TableHead className={tableCellNumeric}>Variants</TableHead>
              <TableHead className={tableCellNumeric}>Price</TableHead>
              <TableHead className={tableCellNumeric}>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((p) => {
              const stock = p.variants.reduce((n, v) => n + v.stock.reduce((s, r) => s + Number(r.quantity), 0), 0);
              const price = p.variants[0]?.price ?? "0";
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                      <Truncate>{p.name}</Truncate>
                    </Link>
                    <div className={tableSubText}>{p.category ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    {p.code}
                    <div className={tableSubText}>{p.variants[0]?.sku ?? "—"}</div>
                  </TableCell>
                  <TableCell className={tableCellNumeric}>{p.variants.length}</TableCell>
                  <TableCell className={tableCellNumeric}>৳ {Number(price).toFixed(2)}</TableCell>
                  <TableCell className={tableCellNumeric}>{stock}</TableCell>
                  <TableCell>
                    <StatusBadge value={p.status} />
                  </TableCell>
                  <TableCell className={tableCellActions}>
                    <IconActionButton icon={<Printer className="h-3.5 w-3.5" />} label="Print barcode labels" onClick={() => {
                      const labels = p.variants.flatMap((v) => {
                        const codes = v.barcodes.length ? v.barcodes.map((b) => b.code) : [v.sku];
                        return codes.map((code) => ({
                          code,
                          sku: v.sku,
                          name: p.name,
                          price: Number(v.price).toFixed(2),
                          kind: "CODE128",
                        }));
                      });
                      if (!printBarcodeLabels(labels)) toastWarn("Allow pop-ups to print barcode labels");
                    }} />
                    <Link href={`/products/${p.id}`} className="mr-1">
                      <IconActionButton icon={<Edit2 className="h-3.5 w-3.5" />} label="Edit product" />
                    </Link>
                    {p.status !== "ARCHIVED" ? (
                      <IconActionButton icon={<Archive className="h-3.5 w-3.5" />} label="Archive product" variant="warning" onClick={() => setPendingArchive(p)} />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ListFrame>
      <ConfirmDialog
        open={Boolean(pendingArchive)}
        title="Archive product?"
        description={
          pendingArchive
            ? `“${pendingArchive.name}” will be hidden from POS until you restore it.`
            : "This product will be hidden from POS."
        }
        confirmLabel="Archive"
        variant="warning"
        loading={archive.isPending}
        onClose={() => setPendingArchive(null)}
        onConfirm={() => pendingArchive && archive.mutate(pendingArchive.id)}
      />
    </AppShell>
  );
}
