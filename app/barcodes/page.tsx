"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { printBarcodeLabels } from "@/lib/print-barcodes";
import { AppShell } from "@/components/app-shell";
import { Button, DataTable, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, inputClass } from "@/components/ui";
import { toastError, toastSuccess, toastWarn } from "@/lib/toast";

type Code = { code: string; kind: string; sku: string; label: string };

export default function BarcodesPage() {
  const [sku, setSku] = useState("KURTA");
  const [kind, setKind] = useState("CODE128");
  const [count, setCount] = useState("8");
  const [copies, setCopies] = useState("1");
  const [size, setSize] = useState<"small" | "standard" | "shelf">("standard");
  const [codes, setCodes] = useState<Code[]>([]);
  const { rows, pager } = usePagedRows(codes);
  const gen = useMutation({
    mutationFn: () => api<Code[]>(`/api/v1/extras/barcodes/generate?sku=${encodeURIComponent(sku)}&kind=${kind}&count=${count}`),
    onSuccess: (rows) => {
      setCodes(rows);
      toastSuccess(`Generated ${rows.length} barcodes`);
    },
    onError: (e) => toastError(e, "Generate failed"),
  });

  function print(list: Code[]) {
    const ok = printBarcodeLabels(
      list.map((r) => ({ code: r.code, sku: r.sku, name: r.label, kind: r.kind })),
      { copies: Number(copies), size },
    );
    if (!ok) toastWarn("Allow pop-ups to print barcode labels");
  }

  return (
    <AppShell>
      <PageHeader title="Barcode Generator" description="Create codes and print scannable shelf / sticker labels.">
        <Button variant="outline" onClick={() => print(codes)} disabled={!codes.length}>
          Print labels
        </Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU prefix" />
        <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="CODE128">CODE128</option>
          <option value="EAN13">EAN13</option>
        </select>
        <input className={inputClass + " w-20"} type="number" min="1" max="50" value={count} onChange={(e) => setCount(e.target.value)} title="How many codes" />
        <select className={inputClass} value={size} onChange={(e) => setSize(e.target.value as typeof size)}>
          <option value="small">Small 38×25mm</option>
          <option value="standard">Standard 50×30mm</option>
          <option value="shelf">Shelf 70×40mm</option>
        </select>
        <input className={inputClass + " w-24"} type="number" min="1" max="50" value={copies} onChange={(e) => setCopies(e.target.value)} title="Copies per code" placeholder="Copies" />
        <Button onClick={() => gen.mutate()}>Generate</Button>
      </div>
      <DataTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell className="font-mono">{r.code}</TableCell>
                <TableCell>{r.kind}</TableCell>
                <TableCell>{r.sku}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => print([r])}>
                    Print
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </DataTable>
    </AppShell>
  );
}
