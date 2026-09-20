"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Field, InfoTip, btnGhost, btnPrimary, inputClass } from "@/components/ui";
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
  wholesale: string;
  retail: string;
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
    wholesalePrice?: string;
    retailPrice?: string;
    discount?: string;
    minStock?: string;
    weight?: string | null;
    status: string;
    imageUrl?: string | null;
    barcodes: { code: string }[];
    stock: { locationId: string; quantity: string }[];
    attributes: { option: { id: string; label: string; definition?: { id: string } | null } }[];
  }[];
};

function emptyOpening(locs: Loc[]) {
  return Object.fromEntries(locs.map((l) => [l.id, "0"]));
}

function calcFinalSellingPrice(retailPrice: string, discount: string): string {
  const retail = Number(retailPrice || 0);
  const disc = Number(discount || 0);
  return (retail > 0 ? retail - (retail * disc / 100) : 0).toFixed(2);
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
  const [removedVariantIds, setRemovedVariantIds] = useState<string[]>([]);
  const initialSellingPrice = product?.sellingPrice ?? calcFinalSellingPrice(product?.retailPrice ?? "", product?.discount ?? "0");
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
    sellingPrice: initialSellingPrice,
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

const sell = Number(form.retailPrice || 0);
const cost = Number(form.purchasePrice || 0);
const discountPercent = Number(form.discount || 0);
const finalSellingPrice = sell > 0 ? sell - (sell * discountPercent / 100) : 0;
const profit = finalSellingPrice - cost;
const profitMargin = finalSellingPrice > 0 ? ((profit / finalSellingPrice) * 100).toFixed(1) : "0";
const loss = cost > finalSellingPrice ? cost - finalSellingPrice : 0;

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
    // Preserve already-loaded / already-edited rows so regenerating never wipes
    // per-variant prices, SKUs, or saved variant ids.
    const prev = new Map(form.variants.map((r) => [r.optionIds.slice().sort().join("|"), r]));
    const rows: VariantRow[] = combos.map((combo) => {
      const key = combo.map((o) => o.id).sort().join("|");
      const old = prev.get(key);
      if (old) return { ...old, label: combo.map((o) => o.label).join(" / ") };
      return {
        id: `new|${combo.map((o) => o.id).join("|")}`,
        optionIds: combo.map((o) => o.id),
        label: combo.map((o) => o.label).join(" / "),
        sku: `${form.code || "SKU"}-${combo.map((o) => o.value).join("-")}`.toUpperCase(),
        barcode: "",
        price: calcFinalSellingPrice(form.retailPrice, form.discount),
        cost: form.purchasePrice,
        wholesale: form.wholesalePrice,
        retail: form.retailPrice,
        discount: form.discount,
        minStock: form.minStock,
        weight: "",
        imageUrl: "",
        status: "ACTIVE",
        opening: form.opening,
      };
    });
    setForm((s) => ({ ...s, variants: rows }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const finalSellingPriceNum = Number(calcFinalSellingPrice(form.retailPrice, form.discount));
      const cost = Number(form.purchasePrice || 0);
      const profit = finalSellingPriceNum - cost;
      const calculatedProfitMargin = finalSellingPriceNum > 0 ? ((profit / finalSellingPriceNum) * 100).toFixed(1) : "0";
      const nextErrors: Record<string, string> = {};
      const isNonNegativeNum = (v: unknown) => {
        const s = typeof v === "string" ? v.trim() : String(v ?? "");
        if (s === "") return false;
        const n = Number(s);
        return !isNaN(n) && isFinite(n) && n >= 0;
      };
      const isNonNegativeNumOrEmpty = (v: unknown) => {
        const s = typeof v === "string" ? v.trim() : String(v ?? "");
        if (s === "") return true;
        const n = Number(s);
        return !isNaN(n) && isFinite(n) && n >= 0;
      };
      if (!form.name.trim()) nextErrors.name = "Product name is required";
      if (!form.code.trim()) nextErrors.code = "Product code / SKU is required";
      if (!form.categoryId) nextErrors.categoryId = "Category is required";
      // VARIABLE products carry pricing on each variant — main-level prices are optional.
      if (form.type === "VARIABLE") {
        if (!isNonNegativeNumOrEmpty(form.purchasePrice)) nextErrors.purchasePrice = "Purchase / Cost Price must be a positive number (≥ 0)";
        if (!isNonNegativeNumOrEmpty(form.wholesalePrice)) nextErrors.wholesalePrice = "Wholesale Price must be a positive number (≥ 0)";
        if (!isNonNegativeNumOrEmpty(form.retailPrice)) nextErrors.retailPrice = "Retail Price must be a positive number (≥ 0)";
      } else {
        if (!isNonNegativeNum(form.purchasePrice)) nextErrors.purchasePrice = "Purchase / Cost Price must be a positive number (≥ 0)";
        if (!isNonNegativeNum(form.wholesalePrice)) nextErrors.wholesalePrice = "Wholesale Price must be a positive number (≥ 0)";
        if (!isNonNegativeNum(form.retailPrice)) nextErrors.retailPrice = "Retail Price must be a positive number (≥ 0)";
      }
      if (!isNonNegativeNumOrEmpty(form.minStock)) nextErrors.minStock = "Minimum stock must be a positive number (≥ 0)";
      if (!isNonNegativeNumOrEmpty(form.reorderLevel)) nextErrors.reorderLevel = "Reorder level must be a positive number (≥ 0)";
      const badOpening = Object.entries(form.opening).find(([, q]) => !isNonNegativeNumOrEmpty(q));
      if (badOpening) nextErrors.opening = "Opening qty must be a positive number (≥ 0)";
      if (form.type === "VARIABLE") {
        // Every sellable (ACTIVE) variant must carry its own Cost, Wholesale and Retail price.
        let firstVariantError = "";
        for (const v of form.variants) {
          if (v.status !== "ACTIVE") continue;
          const missing: string[] = [];
          if (!isNonNegativeNum(v.cost)) {
            nextErrors[`variant:${v.id}:cost`] = `Variant "${v.label}" needs a Cost price (≥ 0)`;
            missing.push("Cost");
          }
          if (!isNonNegativeNum(v.wholesale)) {
            nextErrors[`variant:${v.id}:wholesale`] = `Variant "${v.label}" needs a Wholesale price (≥ 0)`;
            missing.push("Wholesale");
          }
          if (!isNonNegativeNum(v.retail)) {
            nextErrors[`variant:${v.id}:retail`] = `Variant "${v.label}" needs a Retail price (≥ 0)`;
            missing.push("Retail");
          }
          if (!isNonNegativeNumOrEmpty(v.price)) {
            nextErrors[`variant:${v.id}:price`] = `Variant "${v.label}" has an invalid selling price`;
          }
          if (
            !isNonNegativeNumOrEmpty(v.minStock) ||
            Object.values(v.opening ?? {}).some((q) => !isNonNegativeNumOrEmpty(q))
          ) {
            nextErrors[`variant:${v.id}:stock`] = `Variant "${v.label}" has an invalid min stock or opening qty`;
          }
          if (missing.length && !firstVariantError) {
            firstVariantError = `Variant "${v.label}" is missing required pricing: ${missing.join(", ")}`;
          }
        }
        if (firstVariantError) nextErrors.variants = firstVariantError;
      }
      if (Number(form.discount || 0) < 0 || Number(form.discount || 0) > 100) nextErrors.discount = "Discount must be between 0 and 100";
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
        sellingPrice: finalSellingPriceNum,
        purchasePrice: form.purchasePrice || undefined,
        wholesalePrice: form.wholesalePrice || undefined,
        retailPrice: form.retailPrice || undefined,
        discount: form.discount,
        profitMargin: calculatedProfitMargin,
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
                price: finalSellingPrice,
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
                id: v.id.startsWith("new|") ? undefined : v.id,
                optionIds: v.optionIds,
                sku: v.sku,
                barcode: v.barcode || undefined,
                price: v.price,
                cost: v.cost,
                wholesalePrice: v.wholesale || undefined,
                retailPrice: v.retail || undefined,
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
        removedVariantIds: form.type === "VARIABLE" ? removedVariantIds : [],
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
  const hydratedProductId = useRef<string | null>(null);
  useEffect(() => {
    if (!locations.length) return;
    // Create mode: just seed empty opening stock once locations arrive.
    if (!product) {
      setForm((s) => (Object.keys(s.opening).length ? s : { ...s, opening: emptyOpening(locations) }));
      return;
    }
    // Edit mode: hydrate saved variants (with full details), attribute picks,
    // and opening stock exactly once per product. Attr definitions must be
    // loaded first so option ids can be mapped back to their attributes.
    if (hydratedProductId.current === product.id) return;
    const attrDefs = attrs.data ?? [];
    if (!attrDefs.length && (product.variants ?? []).some((v) => (v.attributes ?? []).length)) return;
    hydratedProductId.current = product.id;
    setForm((s) => {
      if (s.variants.length) return s;
      const defOfOption = new Map<string, string>();
      for (const d of attrDefs) for (const o of d.options) defOfOption.set(o.id, d.id);
      const rows: VariantRow[] = (product.variants ?? []).map((v) => {
        const optionIds = (v.attributes ?? []).map((a) => a.option.id);
        const labels = (v.attributes ?? []).map((a) => a.option.label).filter(Boolean);
        const opening: Record<string, string> = {};
        for (const l of locations) opening[l.id] = "0";
        for (const st of v.stock ?? []) opening[st.locationId] = String(st.quantity ?? "0");
        return {
          id: v.id,
          optionIds,
          label: labels.join(" / ") || v.variantKey || "Default",
          sku: v.sku ?? "",
          barcode: v.barcodes?.[0]?.code ?? "",
          price: String(v.price ?? "0"),
          cost: String(v.cost ?? "0"),
          wholesale: String(v.wholesalePrice ?? ""),
          retail: String(v.retailPrice ?? ""),
          discount: String(v.discount ?? "0"),
          minStock: String(v.minStock ?? "0"),
          weight: v.weight ?? "",
          imageUrl: v.imageUrl ?? "",
          status: v.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
          opening,
        };
      });
      const selectedAttrIds: string[] = [];
      const selectedOptions: Record<string, string[]> = {};
      for (const row of rows) {
        for (const oid of row.optionIds) {
          const did = defOfOption.get(oid);
          if (!did) continue;
          if (!selectedAttrIds.includes(did)) selectedAttrIds.push(did);
          const cur = selectedOptions[did] ?? [];
          if (!cur.includes(oid)) selectedOptions[did] = [...cur, oid];
        }
      }
      const firstStock = product.variants?.[0]?.stock?.length
        ? Object.fromEntries(product.variants[0].stock.map((st) => [st.locationId, String(st.quantity ?? "0")]))
        : null;
      return {
        ...s,
        variants: rows,
        selectedAttrIds: s.selectedAttrIds.length ? s.selectedAttrIds : selectedAttrIds,
        selectedOptions: Object.keys(s.selectedOptions).length ? s.selectedOptions : selectedOptions,
        opening: Object.keys(s.opening).length ? s.opening : firstStock || emptyOpening(locations),
      };
    });
  }, [locations, product, attrs.data]);

  return (
    <div className="relative space-y-3 pb-20">
      <Section title="1. Basic Information">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Product name *" error={errors.name}>
            <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter product name" />
          </Field>
          <Field label="Product code / SKU *" error={errors.code} hint={form.autoSku ? "Auto from name" : undefined}>
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={form.code}
                placeholder="Enter product code / SKU"
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
          <Field
            label={
              <span className="inline-flex items-center gap-1">
                Barcode / QR
                <InfoTip
                  label="Product barcode"
                  description="For products without variants (Simple). Variable products need a unique barcode per variant below."
                />
              </span>
            }
          >
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
            <textarea className={inputClass + " min-h-[72px]"} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Enter product description" />
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
            Generate combinations ({form.variants.length}
            {form.variants.some((v) => !v.id.startsWith("new|"))
              ? ` · ${form.variants.filter((v) => !v.id.startsWith("new|")).length} saved`
              : ""}
            {form.variants.some((v) => v.id.startsWith("new|"))
              ? ` · ${form.variants.filter((v) => v.id.startsWith("new|")).length} new`
              : ""})
          </button>
          {form.variants.length ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
      {form.variants.map((v) => (
        <div
          key={v.id}
          className="rounded-md border p-2 bg-card shadow-sm"
        >
          {/* Header: variant name + New badge + Status + Delete */}
          <div className="grid grid-cols-4 gap-1.5 text-xs mb-1">
            <span className="font-medium line-clamp-1">{v.label}</span>
            {v.id.startsWith("new|") ? (
              <span
                className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              >
                New
              </span>
            ) : null}
            <span className="flex items-center gap-0.5">
              <span className="h-2 w-2 rounded bg-green-500" />
              <span className="text-[10px] font-medium">Active</span>
            </span>
            <button
              type="button"
              className="text-destructive p-0.5 text-xs"
              onClick={() => setDropVariant(v.id)}
            >
              ×
            </button>
          </div>

          {/* SKU + Barcode on same row */}
          <div className="grid grid-cols-2 gap-1.5">
            <input
              className={inputClass + " h-8"}
              value={v.sku}
              onChange={(e) => patchVar(v.id, { sku: e.target.value })}
            />
            <input
              className={inputClass + " h-8"}
              value={v.barcode}
              onChange={(e) => patchVar(v.id, { barcode: e.target.value })}
            />
          </div>

          {/* Price + Cost + Discount */}
          <div className="grid grid-cols-3 gap-1.5">
            <label className="block">
              <span className="mb-0.5 block text-[10px] text-muted-foreground">Price</span>
              <input
                className={inputClass + " h-8" + (errors[`variant:${v.id}:price`] ? " border-destructive" : "")}
                value={v.price}
                onChange={(e) => patchVar(v.id, { price: e.target.value })}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[10px] text-muted-foreground">Cost *</span>
              <input
                className={inputClass + " h-8" + (errors[`variant:${v.id}:cost`] ? " border-destructive" : "")}
                value={v.cost}
                onChange={(e) => patchVar(v.id, { cost: e.target.value })}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[10px] text-muted-foreground">Discount</span>
              <input
                className={inputClass + " h-8"}
                value={v.discount}
                onChange={(e) => patchVar(v.id, { discount: e.target.value })}
                type="number"
                min="0"
                max="100"
                step="0.01"
                inputMode="decimal"
              />
            </label>
          </div>

          {/* Wholesale + Retail (required per variant) */}
          <div className="grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className="mb-0.5 block text-[10px] text-muted-foreground">Wholesale *</span>
              <input
                className={inputClass + " h-8" + (errors[`variant:${v.id}:wholesale`] ? " border-destructive" : "")}
                value={v.wholesale}
                onChange={(e) => patchVar(v.id, { wholesale: e.target.value })}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[10px] text-muted-foreground">Retail *</span>
              <input
                className={inputClass + " h-8" + (errors[`variant:${v.id}:retail`] ? " border-destructive" : "")}
                value={v.retail}
                onChange={(e) => patchVar(v.id, { retail: e.target.value })}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
              />
            </label>
          </div>
          {variantPriceError(v.id) ? (
            <p className="mt-1 text-[11px] text-destructive">{variantPriceError(v.id)}</p>
          ) : null}

          {/* Min Wt + Floor + Test */}
          <div className="grid grid-cols-3 gap-1.5">
            <input
              className={inputClass + " h-8"}
              value={v.minStock}
              onChange={(e) => patchVar(v.id, { minStock: e.target.value })}
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
            />
            <input
              className={inputClass + " h-8"}
              value={
                Object.keys(v.opening).length > 0
                  ? v.opening[Object.keys(v.opening)[0]] ?? "0"
                  : "0"
              }
              onChange={(e) =>
                patchVar(v.id, {
                  opening: {
                    ...v.opening,
                    [Object.keys(v.opening)[0] || ""]: e.target.value,
                  },
                })
              }
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
            />
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={v.status === "ACTIVE"}
                onChange={(e) =>
                  patchVar(v.id, {
                    status: e.target.checked ? "ACTIVE" : "INACTIVE",
                  })
                }
                className="h-3 w-3 rounded-border"
              />
              <span className="text-[10px] text-muted-foreground">Test</span>
            </div>
          </div>
        </div>
      ))}
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
          <Field label={form.type === "VARIABLE" ? "Purchase / Cost Price" : "Purchase / Cost Price *"} error={errors.purchasePrice}>
            <input className={inputClass} value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} placeholder="Enter purchase / cost price" type="number" min="0" step="0.01" inputMode="decimal" />
          </Field>
          <Field label={form.type === "VARIABLE" ? "Wholesale Price" : "Wholesale Price *"} error={errors.wholesalePrice}>
            <input className={inputClass} value={form.wholesalePrice} onChange={(e) => set("wholesalePrice", e.target.value)} placeholder="Enter wholesale price" type="number" min="0" step="0.01" inputMode="decimal" />
          </Field>
          <Field label={form.type === "VARIABLE" ? "Retail Price" : "Retail Price *"} error={errors.retailPrice}>
            <input className={inputClass} value={form.retailPrice} onChange={(e) => set("retailPrice", e.target.value)} placeholder="Enter retail price" type="number" min="0" step="0.01" inputMode="decimal" />
          </Field>
          <Field label="Discount %">
            <input className={inputClass} value={form.discount} onChange={(e) => set("discount", e.target.value)} type="number" min="0" max="100" />
            {errors.discount ? <p className="text-xs text-destructive">{errors.discount}</p> : null}
          </Field>
          <Field label="Final Selling Price">
            <input className={inputClass} value={finalSellingPrice.toFixed(2)} readOnly />
          </Field>
          <Field label="Profit / Loss">
            <input className={inputClass} value={profit.toFixed(2)} readOnly style={{ color: profit < 0 ? "red" : profit > 0 ? "green" : "inherit" }} />
            {profit < 0 ? <p className="text-xs text-destructive">Loss of {loss.toFixed(2)}</p> : null}
          </Field>
          <Field label="Profit Margin %">
            <input className={inputClass} value={profitMargin} readOnly />
          </Field>
        </div>
      </Section>

      <Section title="6. Inventory">
        {errors.opening ? <p className="mb-2 text-xs text-destructive">{errors.opening}</p> : null}
        {form.trackInventory ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {locations.map((l) => (
              <Field key={l.id} label={`Opening qty — ${l.name}`}>
                <input
                  className={inputClass}
                  value={form.opening[l.id] ?? "0"}
                  onChange={(e) => setForm((s) => ({ ...s, opening: { ...s.opening, [l.id]: e.target.value } }))}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                />
              </Field>
            ))}
            <Field label="Minimum stock" error={errors.minStock}>
              <input className={inputClass} value={form.minStock} onChange={(e) => set("minStock", e.target.value)} type="number" min="0" step="1" inputMode="numeric" />
            </Field>
            <Field label="Reorder / stock alert" error={errors.reorderLevel}>
              <input className={inputClass} value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} type="number" min="0" step="1" inputMode="numeric" />
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
        description={
          dropVariant && !dropVariant.startsWith("new|")
            ? "This saved variant will be permanently deleted on save (stock and barcode history go with it)."
            : "This combination will be dropped from the generated list."
        }
        confirmLabel="Remove"
        onClose={() => setDropVariant(null)}
        onConfirm={() => {
          setForm((s) => ({ ...s, variants: s.variants.filter((row) => row.id !== dropVariant) }));
          if (dropVariant && !dropVariant.startsWith("new|")) {
            setRemovedVariantIds((ids) => (ids.includes(dropVariant) ? ids : [...ids, dropVariant]));
          }
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

  function variantPriceError(id: string) {
    const msgs = [
      errors[`variant:${id}:cost`],
      errors[`variant:${id}:wholesale`],
      errors[`variant:${id}:retail`],
      errors[`variant:${id}:price`],
      errors[`variant:${id}:stock`],
    ].filter(Boolean);
    if (!msgs.length) return null;
    return msgs.length > 1 ? `${msgs[0]} (+${msgs.length - 1} more)` : msgs[0];
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
