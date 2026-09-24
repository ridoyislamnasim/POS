"use client";

import { useState } from "react";
import { ChevronDown, Download, FileText, Loader2, Printer, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadPosDocument, printPosDocument, type PosDocumentType } from "@/lib/documents";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { DocumentLivePreview } from "@/components/documents/document-preview";

export function DocumentActions({
  type,
  id,
  number,
  size = "xs",
  preview = false,
  className,
  compact: _compact = true,
  iconOnly = false,
}: {
  type: PosDocumentType;
  id: string;
  number?: string;
  size?: "xs" | "sm";
  preview?: boolean;
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const [busy, setBusy] = useState<"receipt" | "invoice" | "pdf" | "preview" | null>(null);
  const [openPreview, setOpenPreview] = useState(false);

  async function run(mode: "receipt" | "invoice" | "pdf" | "preview") {
    if (busy) return;
    setBusy(mode);
    try {
      if (mode === "receipt") await printPosDocument(type, id, "receipt");
      else if (mode === "invoice") await printPosDocument(type, id, "invoice");
      else if (mode === "pdf") await downloadPosDocument(type, id, number);
      else setOpenPreview(true);
    } catch (e) {
      toastError(e, mode === "pdf" ? "PDF failed" : mode === "preview" ? "Preview failed" : "Print failed");
    } finally {
      setBusy(null);
    }
  }

  const preparing =
    busy === "receipt" ? "Preparing receipt…" : busy === "invoice" ? "Preparing invoice…" : busy === "pdf" ? "Preparing PDF…" : busy === "preview" ? "Preparing…" : null;

  if (iconOnly) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={Boolean(busy)}
              aria-label="Print"
              title={preparing ?? "Print"}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11.5rem]">
            <DropdownMenuItem disabled={Boolean(busy)} onSelect={() => run("receipt")}>
              <Receipt className="h-3.5 w-3.5" />
              Thermal Receipt
            </DropdownMenuItem>
            <DropdownMenuItem disabled={Boolean(busy)} onSelect={() => run("invoice")}>
              <FileText className="h-3.5 w-3.5" />
              A4 Invoice
            </DropdownMenuItem>
            <DropdownMenuItem disabled={Boolean(busy)} onSelect={() => run("pdf")}>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </DropdownMenuItem>
            {preview ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={Boolean(busy)} onSelect={() => run("preview")}>
                  Preview
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog
          open={openPreview}
          title={number ? `Print preview · ${number}` : "Print preview"}
          description="Thermal preview matches the POS receipt. A4 preview matches the invoice and PDF."
          size="full"
          onClose={() => setOpenPreview(false)}
        >
          {openPreview ? <DocumentLivePreview type={type} id={id} /> : null}
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className={cn("inline-flex items-center", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size={size} disabled={Boolean(busy)} aria-label="Print options" className="gap-1">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
              <span>{preparing ?? "Print"}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[11.5rem]">
            <DropdownMenuItem disabled={Boolean(busy)} onSelect={() => run("receipt")}>
              <Receipt className="h-3.5 w-3.5" />
              Thermal Receipt
            </DropdownMenuItem>
            <DropdownMenuItem disabled={Boolean(busy)} onSelect={() => run("invoice")}>
              <FileText className="h-3.5 w-3.5" />
              A4 Invoice
            </DropdownMenuItem>
            <DropdownMenuItem disabled={Boolean(busy)} onSelect={() => run("pdf")}>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </DropdownMenuItem>
            {preview ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={Boolean(busy)} onSelect={() => run("preview")}>
                  Preview
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog
        open={openPreview}
        title={number ? `Print preview · ${number}` : "Print preview"}
        description="Thermal preview matches the POS receipt. A4 preview matches the invoice and PDF."
        size="full"
        onClose={() => setOpenPreview(false)}
      >
        {openPreview ? <DocumentLivePreview type={type} id={id} /> : null}
      </Dialog>
    </>
  );
}
