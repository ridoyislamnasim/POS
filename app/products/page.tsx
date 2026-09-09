"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { ProductAddDialog } from "@/components/catalog/product-add-dialog";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  btnGhost,
  btnPrimary,
  inputClass,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError, toastSuccess } from "@/lib/toast";

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
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<Product | null>(null);
  function closeAdd() {
    setAddOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("new")) {
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("q");
    if (v) setQ(v);
    if (params.get("new") === "1") setAddOpen(true);
  }, []);
  const products = useQuery({
    queryKey: ["admin-products", q, status],
    queryFn: () =>
      api<Product[]>(
        `/api/v1/catalog/products?status=${encodeURIComponent(status)}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
      ),
  });
  const archive = useMutation({
    mutationFn: (id: string) => api(`/api/v1/catalog/products/${id}/archive`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Product archived", pendingArchive?.name);
      setPendingArchive(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e) => toastError(e, "Could not archive product"),
  });

  const { rows, pager } = usePagedRows(products.data ?? []);

  return (
    <AppShell>
      <PageHeader title="Products" description="Catalogue, variants, and archive.">
        <input
          className={inputClass + " w-48"}
          placeholder="Search name, SKU, barcode"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={inputClass + " w-32"} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="button" className={btnPrimary} onClick={() => setAddOpen(true)}>
          Add product
        </button>
      </PageHeader>
      {products.isLoading ? <Skeleton rows={8} /> : null}
      {products.isError ? (
        <ErrorState message="Could not load products." onRetry={() => products.refetch()} />
      ) : null}
      {!products.isLoading && !products.data?.length ? (
        <EmptyState
          title="No products"
          hint="Create a product and generate Colour × Size variants."
          action={
            <button type="button" className={btnPrimary} onClick={() => setAddOpen(true)}>
              Add product
            </button>
          }
        />
      ) : null}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU / code</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const stock = p.variants.reduce((n, v) => n + v.stock.reduce((s, r) => s + Number(r.quantity), 0), 0);
              const price = p.variants[0]?.price ?? "0";
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{p.category ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    {p.code}
                    <div className="text-xs text-muted-foreground">{p.variants[0]?.sku ?? "—"}</div>
                  </TableCell>
                  <TableCell>{p.variants.length}</TableCell>
                  <TableCell className="text-right tabular-nums">৳ {Number(price).toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{stock}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "ACTIVE" ? "success" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Link href={`/products/${p.id}`} className={btnGhost + " h-7 px-2 text-xs"}>
                      Edit
                    </Link>
                    {p.status !== "ARCHIVED" ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setPendingArchive(p)}>
                        Archive
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
      <ProductAddDialog open={addOpen} onClose={closeAdd} />
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
