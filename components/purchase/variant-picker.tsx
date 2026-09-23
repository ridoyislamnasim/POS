"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, fileUrl } from "@/lib/api";
import { inputClass } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { moneyLabel } from "@/lib/money";
import { useDebounced } from "@/lib/use-debounce";

type Product = {
  id: string;
  name: string;
  code: string;
  taxCategory?: { rate: string } | null;
  images?: { url: string; isPrimary: boolean }[];
  variants: {
    id: string;
    sku: string;
    price: string;
    cost?: string | null;
    retailPrice?: string | null;
    wholesalePrice?: string | null;
    imageUrl?: string | null;
    attributes: { option: { value: string; label: string; definition: { key: string; name: string } } }[];
    barcodes: { code: string; primary: boolean }[];
    stock: { locationId: string; quantity: string }[];
  }[];
};

function variantLabel(v: Product["variants"][number]) {
  return v.attributes.map((a) => a.option.label).join(" / ") || v.sku;
}

export function VariantPicker({
  locationId,
  onPick,
  compact,
}: {
  locationId?: string;
  onPick: (variant: Product["variants"][number], product: Product) => void;
  compact?: boolean;
}) {
  const [q, setQ] = useState("");
  const [matrixProduct, setMatrixProduct] = useState<Product | null>(null);
  const debounced = useDebounced(q, 350);

  const productsQ = useQuery({
    queryKey: ["purchase-variant-picker", debounced],
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      api<Product[]>(`/api/v1/catalog/products?status=ACTIVE&search=${encodeURIComponent(debounced)}&limit=30`, { signal }),
  });

  const products = productsQ.data ?? [];

  async function handlePick(product: Product) {
    if (product.variants.length === 1) {
      onPick(product.variants[0], product);
      return;
    }
    setMatrixProduct(product);
  }

  async function handleScanEnter() {
    if (!q.trim()) return;
    const code = q.trim();
    try {
      const row = await api<{ variant: Product["variants"][number] & { product: Product } }>(`/api/v1/catalog/barcode/${encodeURIComponent(code)}`);
      if (row?.variant) {
        onPick(row.variant, row.variant.product);
        setQ("");
        return;
      }
    } catch {}
    // fallback to SKU exact match in loaded products
    for (const p of products) {
      const v = p.variants.find((x) => x.sku.toLowerCase() === code.toLowerCase() || x.barcodes.some((b) => b.code === code));
      if (v) {
        onPick(v, p);
        setQ("");
        return;
      }
    }
    // fallback to first product name/code match
    const hit = products.find((p) => p.name.toLowerCase().includes(code.toLowerCase()) || p.code.toLowerCase().includes(code.toLowerCase()));
    if (hit) handlePick(hit);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleScanEnter();
              }
            }}
            placeholder="Product, SKU, barcode… (scan or type)"
            className={inputClass + " h-9 pl-7 text-xs"}
          />
        </div>
      </div>

      <div className="min-h-[120px] rounded-lg border bg-muted/10 p-1.5">
        {!products.length ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Package className="h-6 w-6 text-muted-foreground/40" />
            <p className="mt-1 text-xs font-medium">Search products</p>
            <p className="text-[11px] text-muted-foreground">SKU / barcode / name — exact variant will be selected</p>
            {productsQ.isFetching ? <p className="mt-1 text-[11px] text-muted-foreground">Searching…</p> : null}
          </div>
        ) : (
          <div className={compact ? "grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]" : "grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(165px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]"}>
            {products.map((p, idx) => {
              const firstV = p.variants[0];
              const isMulti = p.variants.length > 1;
              const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url || firstV?.imageUrl;
              const price = firstV ? firstV.price : "0";
              const totalStock = p.variants.reduce((s, v) => s + Number(v.stock.find((x) => x.locationId === locationId)?.quantity ?? v.stock[0]?.quantity ?? 0), 0);
              const low = totalStock <= 5 && totalStock > 0;
              const oos = totalStock <= 0;
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, delay: idx * 0.01 }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handlePick(p)}
                  className="group flex gap-2 overflow-hidden rounded-lg border bg-card p-1.5 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow"
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                    {img ? <img src={fileUrl(img)} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/40" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium leading-tight">{p.name}</div>
                    <div className="truncate text-[11px] leading-tight text-muted-foreground">{p.code} {isMulti ? `· ${p.variants.length} var` : `· ${firstV?.sku ?? ""}`}</div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="text-xs font-semibold tabular-nums">{moneyLabel(Number(price))}</span>
                      <span className={`rounded-full border px-1 py-0 text-[10px] font-medium ${oos ? "bg-destructive/10 text-destructive border-destructive/20" : low ? "bg-amber-500/10 text-amber-700 border-amber-500/20" : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"}`}>{oos ? "OOS" : low ? "Low" : `${totalStock}`}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {matrixProduct ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 backdrop-blur-sm" onClick={() => setMatrixProduct(null)}>
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} transition={{ duration: 0.18 }} className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-2 dark:from-violet-950/20 dark:to-indigo-950/20">
                <div>
                  <div className="text-sm font-semibold">{matrixProduct.name}</div>
                  <div className="text-[11px] text-muted-foreground">Exact variant choose korun — never treat parent as stockable</div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMatrixProduct(null)}>
                  Close
                </Button>
              </div>
              <div className="max-h-[60vh] overflow-auto p-2">
                <div className="grid gap-1.5">
                  {matrixProduct.variants.map((v) => {
                    const label = variantLabel(v);
                    const barcode = v.barcodes.find((b) => b.primary)?.code ?? v.barcodes[0]?.code ?? "";
                    const stockQty = v.stock.find((s) => s.locationId === locationId)?.quantity ?? v.stock[0]?.quantity ?? "0";
                    const vImg = v.imageUrl ?? matrixProduct.images?.find((i) => i.isPrimary)?.url ?? matrixProduct.images?.[0]?.url ?? null;
                    return (
                      <button key={v.id} type="button" onClick={() => { onPick(v, matrixProduct); setMatrixProduct(null); }} className="flex items-center gap-2 rounded-lg border bg-card p-1.5 text-left transition hover:border-primary/30 hover:bg-accent/40">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted/20">
                          {vImg ? <img src={fileUrl(vImg)} alt={label} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/40" /></div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium">{label}</div>
                          <div className="truncate font-mono text-[11px] text-muted-foreground">{v.sku} {barcode ? `· ${barcode}` : ""}</div>
                          <div className="text-[11px] tabular-nums text-muted-foreground">Stock: {stockQty}</div>
                        </div>
                        <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">{moneyLabel(Number(v.price))}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
