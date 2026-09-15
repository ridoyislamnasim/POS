"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { printBarcodeLabels, type BarcodeLabel, type BarcodePrintOptions } from "@/lib/print-barcodes";
import { toastWarn } from "@/lib/toast";
import { cn } from "@/lib/cn";

export type BarcodePrintInitial = Partial<
  Pick<BarcodePrintOptions, "copies" | "size" | "columns" | "showBars" | "showName" | "showSku" | "showPrice" | "showCode">
>;

const FIELDS: { key: "showBars" | "showName" | "showSku" | "showPrice" | "showCode"; label: string; hint: string }[] = [
  { key: "showBars", label: "Barcode stripes", hint: "Scannable bars" },
  { key: "showName", label: "Product name", hint: "Item name on label" },
  { key: "showSku", label: "SKU", hint: "Variant SKU" },
  { key: "showPrice", label: "Price", hint: "Selling price" },
  { key: "showCode", label: "Barcode number", hint: "Digits under bars" },
];

const DIMS: Record<string, { w: number; h: number }> = {
  small: { w: 38, h: 25 },
  standard: { w: 50, h: 30 },
  shelf: { w: 70, h: 40 },
};

export function BarcodePrintDialog({
  open,
  onClose,
  title = "Print barcode labels",
  labels,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  labels: BarcodeLabel[];
  initial?: BarcodePrintInitial;
}) {
  const [showBars, setShowBars] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [copies, setCopies] = useState("1");
  const [size, setSize] = useState<"small" | "standard" | "shelf">("standard");
  const [columns, setColumns] = useState("3");

  useEffect(() => {
    if (!open) return;
    setShowBars(initial?.showBars !== false);
    setShowName(initial?.showName !== false);
    setShowSku(initial?.showSku !== false);
    setShowPrice(initial?.showPrice !== false);
    setShowCode(initial?.showCode !== false);
    setCopies(String(initial?.copies ?? 1));
    setSize(initial?.size ?? "standard");
    setColumns(String(initial?.columns ?? 3));
    // Reset each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const setters = { showBars: setShowBars, showName: setShowName, showSku: setShowSku, showPrice: setShowPrice, showCode: setShowCode };
  const values = { showBars, showName, showSku, showPrice, showCode };
  const valid = labels.length > 0 && (showBars || showName || showSku || showPrice || showCode);
  const total = labels.length * (Math.min(Math.max(Number(copies) || 1, 1), 50));
  const preview = labels[0];
  const dim = DIMS[size];
  const px = 2.4;

  function onPrint() {
    const ok = printBarcodeLabels(labels, {
      copies: Number(copies) || 1,
      size,
      columns: Number(columns) || 0,
      showBars,
      showName,
      showSku,
      showPrice,
      showCode,
    });
    if (!ok) {
      toastWarn("Allow pop-ups to print barcode labels");
      return;
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      title={title}
      description="Tick only what should print on the label, then print."
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!valid} onClick={onPrint}>
            <Printer className="mr-1.5 h-4 w-4" aria-hidden />
            Print {total} label{total === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <span className="text-sm text-muted-foreground">Print on label</span>
          {FIELDS.map((f) => (
            <label key={f.key} className="flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/50">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0"
                checked={values[f.key]}
                onChange={(e) => setters[f.key](e.target.checked)}
              />
              <span className="font-medium">{f.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{f.hint}</span>
            </label>
          ))}
          {!valid ? (
            <p className="text-xs text-destructive">
              {labels.length ? "Select at least one item to print." : "No barcodes to print."}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Copies">
            <input
              className={cn(inputClass, "h-9")}
              type="number"
              min="1"
              max="50"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
            />
          </Field>
          <Field label="Label size">
            <select className={cn(inputClass, "h-9")} value={size} onChange={(e) => setSize(e.target.value as typeof size)}>
              <option value="small">Small 38×25</option>
              <option value="standard">Standard 50×30</option>
              <option value="shelf">Shelf 70×40</option>
            </select>
          </Field>
          <Field label="Columns / page">
            <select className={cn(inputClass, "h-9")} value={columns} onChange={(e) => setColumns(e.target.value)}>
              <option value="0">Auto</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </Field>
        </div>

        <div>
          <span className="mb-1 block text-sm text-muted-foreground">Preview</span>
          {preview && valid ? (
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 rounded-sm border border-dashed border-border bg-card px-2 py-1.5 text-center"
                style={{ width: dim.w * px, minHeight: dim.h * px }}
              >
                {showName && preview.name ? <div className="truncate text-[10px] leading-tight">{preview.name}</div> : null}
                {showSku && preview.sku ? <div className="truncate text-[10px] text-muted-foreground">{preview.sku}</div> : null}
                {showBars ? (
                  <div
                    aria-hidden
                    className="mx-auto my-1"
                    style={{
                      height: 26,
                      background: "repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 5px)",
                    }}
                  />
                ) : null}
                {showCode ? <div className="text-[10px] font-semibold tracking-widest">{preview.code || "—"}</div> : null}
                {showPrice && preview.price ? <div className="text-[11px] font-bold">৳ {preview.price}</div> : null}
              </div>
              <p className="text-xs tabular-nums text-muted-foreground">
                {labels.length} code{labels.length === 1 ? "" : "s"} × {Math.min(Math.max(Number(copies) || 1, 1), 50)} cop
                {(Number(copies) || 1) === 1 ? "y" : "ies"} = {total} label{total === 1 ? "" : "s"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Select at least one item to see the preview.</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
