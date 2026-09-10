"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Field, btnGhost, btnPrimary, inputClass } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastCreated, toastError, toastSuccess, toastWarn } from "@/lib/toast";
import { SearchSelect } from "@/components/catalog/search-select";
import { ImageDropzone, type GalleryImage } from "@/components/catalog/image-dropzone";
import { cartesian, slugSku } from "@/lib/cartesian";
import { useDebounced } from "@/lib/use-debounce";
import { motion, useReducedMotion } from "framer-motion";

type Attr = { id: string; key: string; name: string; variantDefining: boolean; options: { id: string; value: string; label: string }[] };
type Loc = { id: string; name: string };
type Tax = { id: string; name: string; rate?: string };
type Cat = { id: string; name: string; subcategories: { id: string; name: string; categoryId: string }[] };
type Named = { id: string; name: string };
type Unit = { id: string; name: string; abbreviation: string };

type VariantRow = {
  id: string;
  optionIds: string[];
  label: string;
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  discount: string;
  minStock: string;
  weight: string;
  imageUrl: string;
  status: "ACTIVE" | "INACTIVE";
  opening: Record<string, string>;
};

const TYPES = [
  { value: "SIMPLE", label: "Simple Product" },
  { value: "VARIABLE", label: "Variable Product" },
  { value: "SERVICE", label: "Service" },
  { value: "DIGITAL", label: "Digital Product" },
  { value: "BUNDLE", label: "Bundle / Combo" },
];

export type ProductLoaded = {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  brandId?: string | null;
  unitId?: string | null;
  supplierId?: string | null;
  taxCategoryId?: string | null;
  description?: string | null;
  tags?: string | null;
  barcode?: string | null;
  featured?: boolean;
  posSaleEnabled?: boolean;
  onlineSaleEnabled?: boolean;
  trackInventory?: boolean;
  allowNegativeStock?: boolean;
  expiryTracking?: boolean;
  batchTracking?: boolean;
  serialTracking?: boolean;
  sellingPrice?: string | null;
  purchasePrice?: string | null;
  wholesalePrice?: string | null;
  retailPrice?: string | null;
  discount?: string | null;
  profitMargin?: string | null;
  minStock?: string | null;
  reorderLevel?: string | null;
  images?: { url: string; isPrimary: boolean }[];
  bundleItems?: {
    variantId: string;
    qty: string;
    variant: { sku: string; product: { name: string } };
  }[];
  variants?: {
    id: string;
    sku: string;
    variantKey: string;
    price: string;
    cost: string;
    discount?: string;
    minStock?: string;
    weight?: string | null;
    status: string;
    imageUrl?: string | null;
    barcodes: { code: string }[];
    stock: { locationId: string; quantity: string }[];
    attributes: { option: { id: string; label: string } }[];
  }[];
};

function emptyOpening(locs: Loc[]) {
  return Object.fromEntries(locs.map((l) => [l.id, "0"]));
}

export function ProductForm({ product }: { product?: ProductLoaded }) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => api<Cat[]>("/api/v1/catalog/categories?limit=100") });
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api<Named[]>("/api/v1/catalog/brands?limit=100") });
  const units = useQuery({ queryKey: ["units"], queryFn: () => api<Unit[]>("/api/v1/catalog/units?limit=100") });
  const taxes = useQuery({ queryKey: ["taxes"], queryFn: () => api<Tax[]>("/api/v1/catalog/tax-categories") });
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: () => api<Named[]>("/api/v1/suppliers?limit=100") });
  const attrs = useQuery({ queryKey: ["attrs"], queryFn: () => api<Attr[]>("/api/v1/catalog/attributes?limit=100") });
  const locs = useQuery({ queryKey: ["inv-locs"], queryFn: () => api<Loc[]>("/api/v1/inventory/locations") });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dropVariant, setDropVariant] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    name: product?.name ?? "",
    code: product?.code ?? "",
    autoSku: !product,
    categoryId: product?.categoryId ?? "",
    subcategoryId: product?.subcategoryId ?? "",
    brandId: product?.brandId ?? "",
    unitId: product?.unitId ?? "",
    supplierId: product?.supplierId ?? "",
    type: (product?.type === "PHYSICAL" ? "VARIABLE" : product?.type) || "SIMPLE",
    description: product?.description ?? "",
    tags: product?.tags ?? "",
    barcode: product?.barcode ?? "",
    taxCategoryId: product?.taxCategoryId ?? "",
    status: product?.status === "ARCHIVED" ? "ARCHIVED" : product?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    featured: Boolean(product?.featured),
    posSaleEnabled: product?.posSaleEnabled !== false,
    onlineSaleEnabled: Boolean(product?.onlineSaleEnabled),
    trackInventory: product?.trackInventory !== false,
    allowNegativeStock: Boolean(product?.allowNegativeStock),
    expiryTracking: Boolean(product?.expiryTracking),
    batchTracking: Boolean(product?.batchTracking),
    serialTracking: Boolean(product?.serialTracking),
    sellingPrice: product?.sellingPrice ?? product?.variants?.[0]?.price ?? "0",
    purchasePrice: product?.purchasePrice ?? product?.variants?.[0]?.cost ?? "0",
    wholesalePrice: product?.wholesalePrice ?? "",
    retailPrice: product?.retailPrice ?? "",
    discount: product?.discount ?? "0",
    profitMargin: product?.profitMargin ?? "",
    minStock: product?.minStock ?? "0",
    reorderLevel: product?.reorderLevel ?? "0",
    opening: {} as Record<string, string>,
    images: (product?.images ?? []).map((i) => ({ url: i.url, isPrimary: i.isPrimary })) as GalleryImage[],
    selectedAttrIds: [] as string[],
    selectedOptions: {} as Record<string, string[]>,
    variants: [] as VariantRow[],
    bundleItems: (product?.bundleItems ?? []).map((b) => ({
      variantId: b.variantId,
      qty: String(b.qty ?? 1),
      label: `${b.variant.product.name} · ${b.variant.sku}`,
    })) as { variantId: string; qty: string; label: string }[],
  }));

  const subcats = useMemo(
    () => cats.data?.find((c) => c.id === form.categoryId)?.subcategories ?? [],
    [cats.data, form.categoryId],
  );

  const sell = Number(form.sellingPrice || 0);
  const cost = Number(form.purchasePrice || 0);
  const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : "0";

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[String(key)];
      return next;
    });
  }

  function toggleOption(defId: string, optId: string) {
    setForm((s) => {
      const cur = s.selectedOptions[defId] ?? [];
      const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId];
      return { ...s, selectedOptions: { ...s.selectedOptions, [defId]: next } };
    });
  }

  function generateVariants() {
    const defs = (attrs.data ?? []).filter((a) => form.selectedAttrIds.includes(a.id));
    const lists = defs.map((d) => (form.selectedOptions[d.id] ?? []).map((id) => d.options.find((o) => o.id === id)).filter(Boolean));
    if (lists.some((l) => !l.length)) {
      toastWarn("Pick at least one value for each selected attribute");
      return;
    }
    const combos = cartesian(lists as { id: string; label: string; value: string }[][]);
    const rows: VariantRow[] = combos.map((combo) => ({
      id: combo.map((o) => o.id).join("|"),
      optionIds: combo.map((o) => o.id),
      label: combo.map((o) => o.label).join(" / "),
      sku: `${form.code || "SKU"}-${combo.map((o) => o.value).join("-")}`.toUpperCase(),
      barcode: "",
      price: form.sellingPrice,
      cost: form.purchasePrice,
      discount: form.discount,
      minStock: form.minStock,
      weight: "",
      imageUrl: "",
      status: "ACTIVE",
      opening: form.opening,
    }));
    setForm((s) => ({ ...s, variants: rows }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const nextErrors: Record<string, string> = {};
      if (!form.name.trim()) nextErrors.name = "Product name is required";
      if (!form.code.trim()) nextErrors.code = "Product code / SKU is required";
      if (!form.categoryId) nextErrors.categoryId = "Category is required";
      if (form.type === "VARIABLE" && !form.variants.length) {
        nextErrors.variants = "Generate at least one variant combination, or switch to Simple";
      }
      if (form.type === "BUNDLE" && !form.bundleItems.length) {
        nextErrors.bundle = "Add at least one component SKU";
      }
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        throw new Error("Please fix the highlighted fields");
      }
      const openingStock = Object.entries(form.opening).map(([locationId, quantity]) => ({
        locationId,
        quantity,
        unitCost: form.purchasePrice,
        reorderLevel: form.reorderLevel,
      }));
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || undefined,
        brandId: form.brandId || undefined,
        unitId: form.unitId || undefined,
        supplierId: form.supplierId || undefined,
        type: form.type,
        description: form.description,
        tags: form.tags,
        barcode: form.barcode || undefined,
        taxCategoryId: form.taxCategoryId || undefined,
        status: form.status,
        featured: form.featured,
        posSaleEnabled: form.posSaleEnabled,
        onlineSaleEnabled: form.onlineSaleEnabled,
        trackInventory: form.trackInventory,
        allowNegativeStock: form.allowNegativeStock,
        expiryTracking: form.expiryTracking,
        batchTracking: form.batchTracking,
        serialTracking: form.serialTracking,
        sellingPrice: form.sellingPrice,
        purchasePrice: form.purchasePrice,
        wholesalePrice: form.wholesalePrice || undefined,
        retailPrice: form.retailPrice || undefined,
        discount: form.discount,
        profitMargin: form.profitMargin || margin,
        minStock: form.minStock,
        reorderLevel: form.reorderLevel,
        images: form.images,
        openingStock,
        bundleItems: form.bundleItems.map((b) => ({ variantId: b.variantId, qty: b.qty })),
        simple:
          form.type !== "VARIABLE"
            ? {
                sku: form.code,
                barcode: form.barcode,
                price: form.sellingPrice,
                cost: form.purchasePrice,
                discount: form.discount,
                minStock: form.minStock,
                openingStock,
              }
            : undefined,
        axes:
          form.type === "VARIABLE"
            ? form.selectedAttrIds.map((id) => ({ definitionId: id, optionIds: form.selectedOptions[id] ?? [] }))
            : [],
        variants:
          form.type === "VARIABLE"
            ? form.variants.map((v) => ({
                optionIds: v.optionIds,
                sku: v.sku,
                barcode: v.barcode || undefined,
                price: v.price,
                cost: v.cost,
                discount: v.discount,
                minStock: v.minStock,
                weight: v.weight || undefined,
                imageUrl: v.imageUrl || undefined,
                status: v.status,
                openingStock: Object.entries(v.opening).map(([locationId, quantity]) => ({
                  locationId,
                  quantity,
                  unitCost: v.cost,
                  reorderLevel: form.reorderLevel,
                })),
              }))
            : [],
      };
      if (isEdit) {
        return api(`/api/v1/catalog/products/${product!.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      return api<{ id: string }>("/api/v1/catalog/products", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: (row) => {
      if (isEdit) toastSuccess("Product updated");
      else toastCreated("product", form.name);
      router.push(`/products/${(row as { id: string }).id ?? product?.id}`);
    },
    onError: (e) => toastError(e, "Could not save product"),
  });

  const locations = locs.data ?? [];
  const openingHydrated = useRef(false);
  useEffect(() => {
    if (!locations.length || openingHydrated.current) return;
    openingHydrated.current = true;
    setForm((s) => {
      if (Object.keys(s.opening).length) return s;
      const fromProduct =
        product?.variants?.[0]?.stock?.length &&
        Object.fromEntries(product.variants[0].stock.map((st) => [st.locationId, st.quantity]));
      return { ...s, opening: fromProduct || emptyOpening(locations) };
    });
  }, [locations, product]);

  return (
    <div className="relative space-y-3 pb-20">
      <Section title="1. Basic Information">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Product name *" error={errors.name}>
            <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Product code / SKU *" error={errors.code} hint={form.autoSku ? "Auto from name" : undefined}>
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={form.code}
                onChange={(e) => setForm((s) => ({ ...s, code: e.target.value, autoSku: false }))}
              />
              <button
                type="button"
                className={btnGhost}
                onClick={() => setForm((s) => ({ ...s, code: slugSku(s.name || "PRD"), autoSku: true }))}
              >
                Auto
              </button>
            </div>
          </Field>
          <Field label="Product type">
            <select className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Barcode / QR">
            <input className={inputClass} value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <Field label="Tags">
            <input className={inputClass} placeholder="comma separated" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea className={inputClass + " min-h-[72px]"} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="2. Category & Classification">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Category *" error={errors.categoryId}>
            <SearchSelect
              value={form.categoryId}
              allowEmpty={false}
              placeholder="Select category"
              options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              onChange={(v) => setForm((s) => ({ ...s, categoryId: v, subcategoryId: "" }))}
            />
          </Field>
          <Field label="Subcategory" hint={form.categoryId && !subcats.length ? "No subcategory for this category — optional" : undefined}>
            <SearchSelect
              value={form.subcategoryId}
              disabled={!form.categoryId}
              placeholder={subcats.length ? "Optional" : "None"}
              options={subcats.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(v) => set("subcategoryId", v)}
            />
          </Field>
          <Field label="Brand">
            <SearchSelect
              value={form.brandId}
              options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
              onChange={(v) => set("brandId", v)}
            />
          </Field>
          <Field label="Unit">
            <SearchSelect
              value={form.unitId}
              options={(units.data ?? []).map((u) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` }))}
              onChange={(v) => set("unitId", v)}
            />
          </Field>
          <Field label="Supplier">
            <SearchSelect
              value={form.supplierId}
              options={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
              onChange={(v) => set("supplierId", v)}
            />
          </Field>
        </div>
      </Section>

      <Section title="3. Images">
        <ImageDropzone images={form.images} onChange={(images) => set("images", images)} />
      </Section>

      {form.type === "BUNDLE" ? (
        <Section title="4. Bundle / combo">
          {errors.bundle ? <p className="mb-2 text-xs text-destructive">{errors.bundle}</p> : null}
          <BundlePicker
            items={form.bundleItems}
            excludeProductId={product?.id}
            onChange={(bundleItems) => set("bundleItems", bundleItems)}
          />
        </Section>
      ) : form.type === "VARIABLE" ? (
        <Section title="4. Variants">
          <p className="mb-2 text-xs text-muted-foreground">Pick any attributes. Combinations generate automatically. Variants are optional for other product types.</p>
          {errors.variants ? <p className="mb-2 text-xs text-destructive">{errors.variants}</p> : null}
          <div className="mb-2 flex flex-wrap gap-2">
            {(attrs.data ?? []).map((a) => (
              <button
                key={a.id}
                type="button"
                className={`${btnGhost} ${form.selectedAttrIds.includes(a.id) ? "bg-primary text-primary-foreground" : ""}`}
                onClick={() =>
                  setForm((s) => ({
                    ...s,
                    selectedAttrIds: s.selectedAttrIds.includes(a.id)
                      ? s.selectedAttrIds.filter((x) => x !== a.id)
                      : [...s.selectedAttrIds, a.id],
                  }))
                }
              >
                {a.name}
              </button>
            ))}
            {!attrs.data?.length ? <span className="text-xs text-muted-foreground">Create attributes under Catalog → Attributes.</span> : null}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {(attrs.data ?? [])
              .filter((a) => form.selectedAttrIds.includes(a.id))
              .map((a) => (
                <div key={a.id} className="rounded-md border p-2">
                  <div className="mb-1 text-sm font-medium">{a.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {a.options.map((o) => {
                      const on = (form.selectedOptions[a.id] ?? []).includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={`${btnGhost} h-7 px-2 text-xs ${on ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => toggleOption(a.id, o.id)}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
          <button type="button" className={btnPrimary + " mt-2"} onClick={generateVariants}>
            Generate combinations ({form.variants.length})
          </button>
          {form.variants.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[980px] text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1">Variant</th>
                    <th>SKU</th>
                    <th>Barcode</th>
                    <th>Price</th>
                    <th>Cost</th>
                    <th>Disc.</th>
                    <th>Min</th>
                    <th>Wt</th>
                    <th>Status</th>
                    {locations.map((l) => (
                      <th key={l.id}>{l.name}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((v) => (
                    <tr key={v.id} className="border-t">
                      <td className="py-1 pr-2">{v.label}</td>
                      <td>
                        <input className={inputClass + " h-8 w-28"} value={v.sku} onChange={(e) => patchVar(v.id, { sku: e.target.value })} />
                      </td>
                      <td>
                        <input className={inputClass + " h-8 w-28"} value={v.barcode} onChange={(e) => patchVar(v.id, { barcode: e.target.value })} />
                      </td>
                      <td>
                        <input className={inputClass + " h-8 w-20"} value={v.price} onChange={(e) => patchVar(v.id, { price: e.target.value })} />
                      </td>
                      <td>
                        <input className={inputClass + " h-8 w-20"} value={v.cost} onChange={(e) => patchVar(v.id, { cost: e.target.value })} />
                      </td>
                      <td>
                        <input className={inputClass + " h-8 w-16"} value={v.discount} onChange={(e) => patchVar(v.id, { discount: e.target.value })} />
                      </td>
                      <td>
                        <input className={inputClass + " h-8 w-14"} value={v.minStock} onChange={(e) => patchVar(v.id, { minStock: e.target.value })} />
                      </td>
                      <td>
                        <input className={inputClass + " h-8 w-14"} value={v.weight} onChange={(e) => patchVar(v.id, { weight: e.target.value })} />
                      </td>
                      <td>
                        <select className={inputClass + " h-8 w-24"} value={v.status} onChange={(e) => patchVar(v.id, { status: e.target.value as "ACTIVE" | "INACTIVE" })}>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </td>
                      {locations.map((l) => (
                        <td key={l.id}>
                          <input
                            className={inputClass + " h-8 w-16"}
                            value={v.opening[l.id] ?? "0"}
                            onChange={(e) =>
                              patchVar(v.id, { opening: { ...v.opening, [l.id]: e.target.value } })
                            }
                          />
                        </td>
                      ))}
                      <td>
                        <button type="button" className="text-destructive" onClick={() => setDropVariant(v.id)}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No combinations yet.</p>
          )}
        </Section>
      ) : (
        <Section title="4. Variants">
          <p className="text-xs text-muted-foreground">This product type uses a single SKU. Switch to Variable to combine attributes such as colour, size, weight, or custom axes.</p>
        </Section>
      )}

      <Section title="5. Pricing">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Selling price">
            <input className={inputClass} value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} />
          </Field>
          <Field label="Purchase / cost">
            <input className={inputClass} value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} />
          </Field>
          <Field label="Wholesale">
            <input className={inputClass} value={form.wholesalePrice} onChange={(e) => set("wholesalePrice", e.target.value)} />
          </Field>
          <Field label="Retail">
            <input className={inputClass} value={form.retailPrice} onChange={(e) => set("retailPrice", e.target.value)} />
          </Field>
          <Field label="Discount">
            <input className={inputClass} value={form.discount} onChange={(e) => set("discount", e.target.value)} />
          </Field>
          <Field label="Profit margin %">
            <input
              className={inputClass}
              value={form.profitMargin}
              placeholder={margin}
              onChange={(e) => set("profitMargin", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="6. Inventory">
        {form.trackInventory ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {locations.map((l) => (
              <Field key={l.id} label={`Opening qty — ${l.name}`}>
                <input
                  className={inputClass}
                  value={form.opening[l.id] ?? "0"}
                  onChange={(e) => setForm((s) => ({ ...s, opening: { ...s.opening, [l.id]: e.target.value } }))}
                />
              </Field>
            ))}
            <Field label="Minimum stock">
              <input className={inputClass} value={form.minStock} onChange={(e) => set("minStock", e.target.value)} />
            </Field>
            <Field label="Reorder / stock alert">
              <input className={inputClass} value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
            </Field>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Inventory tracking is off for this product.</p>
        )}
      </Section>

      <Section title="7. Tax">
        <div className="max-w-sm">
          <Field label="Tax category">
            <SearchSelect
              value={form.taxCategoryId}
              options={(taxes.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
              onChange={(v) => set("taxCategoryId", v)}
            />
          </Field>
        </div>
      </Section>

      <Section title="8. Advanced Settings">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Toggle label="Featured" checked={form.featured} onChange={(v) => set("featured", v)} />
          <Toggle label="POS sale enabled" checked={form.posSaleEnabled} onChange={(v) => set("posSaleEnabled", v)} />
          <Toggle label="Online sale enabled" checked={form.onlineSaleEnabled} onChange={(v) => set("onlineSaleEnabled", v)} />
          <Toggle label="Track inventory" checked={form.trackInventory} onChange={(v) => set("trackInventory", v)} />
          <Toggle label="Allow negative stock" checked={form.allowNegativeStock} onChange={(v) => set("allowNegativeStock", v)} />
          <Toggle label="Expiry tracking" checked={form.expiryTracking} onChange={(v) => set("expiryTracking", v)} />
          <Toggle label="Batch / lot tracking" checked={form.batchTracking} onChange={(v) => set("batchTracking", v)} />
          <Toggle label="Serial number tracking" checked={form.serialTracking} onChange={(v) => set("serialTracking", v)} />
        </div>
      </Section>

      <div className="sticky bottom-3 z-20 flex justify-end gap-2 rounded-lg border bg-card/95 p-2 shadow-md backdrop-blur">
        <button type="button" className={btnGhost} onClick={() => router.push("/products")}>
          Cancel
        </button>
        <button type="button" className={btnPrimary} disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : isEdit ? "Save product" : "Create product"}
        </button>
      </div>

      <ConfirmDialog
        open={dropVariant != null}
        title="Remove variant?"
        description="This combination will be dropped from the generated list."
        confirmLabel="Remove"
        onClose={() => setDropVariant(null)}
        onConfirm={() => {
          setForm((s) => ({ ...s, variants: s.variants.filter((row) => row.id !== dropVariant) }));
          setDropVariant(null);
        }}
      />
    </div>
  );

  function patchVar(id: string, patch: Partial<VariantRow>) {
    setForm((s) => ({
      ...s,
      variants: s.variants.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
      className="rounded-lg border bg-card p-3 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </motion.section>
  );
}

function BundlePicker({
  items,
  onChange,
  excludeProductId,
}: {
  items: { variantId: string; qty: string; label: string }[];
  onChange: (rows: { variantId: string; qty: string; label: string }[]) => void;
  excludeProductId?: string;
}) {
  const [q, setQ] = useState("");
  const search = useDebounced(q, 400);
  const products = useQuery({
    queryKey: ["admin-products", search, "bundle"],
    queryFn: () => api<{ id: string; name: string; variants: { id: string; sku: string; attributes: { option: { label: string } }[] }[] }[]>(
      `/api/v1/catalog/products?status=ACTIVE&limit=25${search ? `&q=${encodeURIComponent(search)}` : ""}`,
    ),
  });
  const hits = (products.data ?? [])
    .filter((p) => p.id !== excludeProductId)
    .flatMap((p) =>
      p.variants.map((v) => ({
        variantId: v.id,
        label: `${p.name} · ${v.attributes.map((a) => a.option.label).filter(Boolean).join(" / ") || v.sku}`,
      })),
    )
    .slice(0, 12);

  return (
    <div className="space-y-2">
      <input className={inputClass} placeholder="Search products to add" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-40 overflow-auto rounded-md border">
        {hits.map((h) => (
          <button
            key={h.variantId}
            type="button"
            className="block w-full px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              if (items.some((i) => i.variantId === h.variantId)) return;
              onChange([...items, { variantId: h.variantId, qty: "1", label: h.label }]);
            }}
          >
            {h.label}
          </button>
        ))}
        {!hits.length ? <div className="px-2 py-2 text-xs text-muted-foreground">No SKUs match.</div> : null}
      </div>
      {items.map((row) => (
        <div key={row.variantId} className="flex items-center gap-2">
          <span className="flex-1 truncate text-sm">{row.label}</span>
          <input
            className={inputClass + " h-8 w-20"}
            value={row.qty}
            onChange={(e) => onChange(items.map((i) => (i.variantId === row.variantId ? { ...i, qty: e.target.value } : i)))}
          />
          <button type="button" className="text-destructive text-sm" onClick={() => onChange(items.filter((i) => i.variantId !== row.variantId))}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
