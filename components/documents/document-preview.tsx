"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchPrintHtml, type DocumentLayout, type PosDocumentType } from "@/lib/documents";
import { cn } from "@/lib/cn";

export function DocumentLivePreview({
  type,
  id,
  initialLayout = "receipt",
}: {
  type: PosDocumentType;
  id: string;
  initialLayout?: DocumentLayout;
}) {
  const [layout, setLayout] = useState<DocumentLayout>(initialLayout);
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);
    fetchPrintHtml(type, id, layout, false)
      .then((doc) => {
        if (!cancelled) setHtml(doc);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Preview failed");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, id, layout]);

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border p-0.5">
        <button
          type="button"
          className={cn("rounded px-2.5 py-1 text-xs", layout === "receipt" ? "bg-accent font-medium" : "text-muted-foreground")}
          onClick={() => setLayout("receipt")}
        >
          Thermal preview
        </button>
        <button
          type="button"
          className={cn("rounded px-2.5 py-1 text-xs", layout === "invoice" ? "bg-accent font-medium" : "text-muted-foreground")}
          onClick={() => setLayout("invoice")}
        >
          A4 preview
        </button>
      </div>
      {busy ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {layout === "receipt" ? "Preparing receipt…" : "Preparing invoice…"}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {html ? (
        <div className={cn("max-h-[70vh] overflow-auto rounded-md border", layout === "receipt" ? "bg-[#d0d0d0] p-4" : "bg-[#d8d8d8] p-3")}>
          <iframe
            title={layout === "receipt" ? "Thermal receipt preview" : "A4 invoice preview"}
            srcDoc={html}
            className={cn("mx-auto block bg-white", layout === "receipt" ? "h-[640px] w-[302px]" : "h-[900px] w-full min-w-[720px]")}
          />
        </div>
      ) : null}
    </div>
  );
}
