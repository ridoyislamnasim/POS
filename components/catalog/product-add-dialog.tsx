"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Field, Dialog, btnGhost, btnPrimary, inputClass } from "@/components/ui";
import { toastCreated, toastError, toastWarn } from "@/lib/toast";

type Attr = {
  id: string;
  key: string;
  name: string;
  options: { id: string; value: string; label: string }[];
};
type Loc = { id: string; name: string };
type Tax = { id: string; name: string };

function emptyForm() {
  return {
    name: "",
    code: "",
    category: "",
    taxCategoryId: "",
    colours: [] as string[],
    sizes: [] as string[],
    price: "0",
    cost: "0",
    wholesalePrice: "",
    retailPrice: "",
    discount: "0",
    opening: {} as Record<string, string>,
  };
}

export function ProductAddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const attrs = useQuery({
    queryKey: ["attrs"],
    queryFn: () => api<Attr[]>("/api/v1/catalog/attributes?limit=100"),
    enabled: open,
  });
  const taxes = useQuery({
    queryKey: ["taxes"],
    queryFn: () => api<Tax[]>("/api/v1/catalog/tax-categories"),
    enabled: open,
  });
  const locs = useQuery({
    queryKey: ["inv-locs"],
    queryFn: () => api<Loc[]>("/api/v1/inventory/locations"),
    enabled: open,
  });

  const colourDef = attrs.data?.find((a) => a.key === "colour");
  const sizeDef = attrs.data?.find((a) => a.key === "size");
  const combo = useMemo(() => form.colours.length * form.sizes.length, [form.colours, form.sizes]);

  const save = useMutation({
    mutationFn: async () => {
      const retail = Number(form.retailPrice || 0);
      const disc = Number(form.discount || 0);
      const finalPrice = retail > 0 ? (retail - (retail * disc / 100)).toFixed(2) : "0";
      const product = await api<{ id: string }>("/api/v1/catalog/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          category: form.category,
          taxCategoryId: form.taxCategoryId || undefined,
          retailPrice: form.retailPrice || undefined,
          wholesalePrice: form.wholesalePrice || undefined,
          discount: form.discount,
        }),
      });
      if (form.colours.length && form.sizes.length) {
        await api(`/api/v1/catalog/products/${product.id}/generate-variants`, {
          method: "POST",
          body: JSON.stringify({
            colourOptionIds: form.colours,
            sizeOptionIds: form.sizes,
            price: finalPrice,
            cost: form.cost,
            discount: form.discount,
            openingStock: Object.entries(form.opening).map(([locationId, quantity]) => ({ locationId, quantity })),
          }),
        });
      }
      return product;
    },
    onSuccess: () => {
      toastCreated("product", form.name);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setForm(emptyForm());
      onClose();
    },
    onError: (e) => toastError(e, "Could not create product"),
  });

  function toggle(key: "colours" | "sizes", id: string) {
    setForm((s) => ({
      ...s,
      [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id],
    }));
  }

  function submit() {
    if (!form.name.trim() || !form.code.trim()) {
      toastWarn("Name and code are required");
      return;
    }
    if (!form.cost || Number(form.cost) < 0) {
      toastWarn("Cost Price is required");
      return;
    }
    if (!form.retailPrice || Number(form.retailPrice) < 0) {
      toastWarn("Retail Price is required");
      return;
    }
    if (!form.wholesalePrice || Number(form.wholesalePrice) < 0) {
      toastWarn("Wholesale Price is required");
      return;
    }
    save.mutate();
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      title="Add product"
      description="Create a style, pick Colour × Size, set price and opening stock — all in one place."
      size="xl"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} disabled={save.isPending} onClick={submit}>
            {save.isPending ? "Saving…" : "Create product"}
          </button>
        </>
      }
    >
      <div className="space-y-5">

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Basics</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Nokshi Kurti"
            />
          </Field>
          <Field label="Code">
            <input
              className={inputClass}
              value={form.code}
              onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              placeholder="e.g. NK-001"
            />
          </Field>
          <Field label="Category">
            <input
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
              placeholder="Optional"
            />
          </Field>
          <Field label="Tax">
            <select
              className={inputClass}
              value={form.taxCategoryId}
              onChange={(e) => setForm((s) => ({ ...s, taxCategoryId: e.target.value }))}
            >
              <option value="">None</option>
              {(taxes.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Variants</h3>
          <span className="text-xs text-muted-foreground">
            {combo} Colour × Size variant{combo === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Colour</div>
            <div className="flex flex-wrap gap-2">
              {(colourDef?.options ?? []).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle("colours", o.id)}
                  className={`${btnGhost} ${form.colours.includes(o.id) ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {o.label}
                </button>
              ))}
              {!colourDef?.options.length ? <span className="text-xs text-muted-foreground">No colours</span> : null}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Size</div>
            <div className="flex flex-wrap gap-2">
              {(sizeDef?.options ?? []).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle("sizes", o.id)}
                  className={`${btnGhost} ${form.sizes.includes(o.id) ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {o.label}
                </button>
              ))}
              {!sizeDef?.options.length ? <span className="text-xs text-muted-foreground">No sizes</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Price & opening stock</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Retail Price">
            <input
              className={inputClass}
              value={form.retailPrice}
              onChange={(e) => setForm((s) => ({ ...s, retailPrice: e.target.value }))}
              placeholder="Enter retail price"
            />
          </Field>
          <Field label="Discount %">
            <input
              className={inputClass}
              value={form.discount}
              onChange={(e) => setForm((s) => ({ ...s, discount: e.target.value }))}
              type="number"
              min="0"
              max="100"
              placeholder="0"
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cost">
            <input
              className={inputClass}
              value={form.cost}
              onChange={(e) => setForm((s) => ({ ...s, cost: e.target.value }))}
              placeholder="Enter purchase / cost price"
            />
          </Field>
          <Field label="Wholesale">
            <input
              className={inputClass}
              value={form.wholesalePrice}
              onChange={(e) => setForm((s) => ({ ...s, wholesalePrice: e.target.value }))}
              placeholder="Enter wholesale price"
            />
          </Field>
          <Field label="Final Price (calc)">
            <input
              className={inputClass}
              value={Number(form.retailPrice || 0) > 0 ? (Number(form.retailPrice) - (Number(form.retailPrice) * Number(form.discount || 0) / 100)).toFixed(2) : "0"}
              readOnly
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(locs.data ?? []).map((l) => (
            <Field key={l.id} label={`Opening stock — ${l.name}`}>
              <input
                className={inputClass}
                value={form.opening[l.id] ?? "0"}
                onChange={(e) => setForm((s) => ({ ...s, opening: { ...s.opening, [l.id]: e.target.value } }))}
              />
            </Field>
          ))}
        </div>
      </section>
      </div>
    </Dialog>
  );
}
