"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { usePagedRows } from "@/lib/use-pagination";
import { AppShell } from "@/components/app-shell";
import { Button, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow, inputClass } from "@/components/ui";
import { toastError } from "@/lib/toast";

type Code = { code: string; kind: string; sku: string; label: string };

export default function BarcodesPage() {
  const [sku, setSku] = useState("KURTA");
  const [kind, setKind] = useState("CODE128");
  const [count, setCount] = useState("8");
  const [codes, setCodes] = useState<Code[]>([]);
  const { rows, pager } = usePagedRows(codes);
  const gen = useMutation({
    mutationFn: () => api<Code[]>(`/api/v1/extras/barcodes/generate?sku=${encodeURIComponent(sku)}&kind=${kind}&count=${count}`),
    onSuccess: setCodes,
    onError: (e) => toastError(e, "Generate failed"),
  });
  function printLabels() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><body style="font-family:sans-serif">${codes.map((r) => `<div style="border:1px dashed #999;padding:8px;margin:8px;width:220px;text-align:center"><div style="font-size:12px">${r.sku}</div><div style="font-size:22px;letter-spacing:2px">${r.code}</div><div style="font-size:11px">${r.kind}</div></div>`).join("")}</body></html>`);
    w.document.close();
    w.print();
  }
  return (
    <AppShell>
      <PageHeader title="Barcode Generator" description="Create codes and print shelf labels.">
        <Button variant="outline" onClick={printLabels} disabled={!codes.length}>Print labels</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU prefix" />
        <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="CODE128">CODE128</option>
          <option value="EAN13">EAN13</option>
        </select>
        <input className={inputClass} type="number" value={count} onChange={(e) => setCount(e.target.value)} />
        <Button onClick={() => gen.mutate()}>Generate</Button>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>SKU</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell className="font-mono">{r.code}</TableCell>
                <TableCell>{r.kind}</TableCell>
                <TableCell>{r.sku}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination {...pager} />
      </div>
    </AppShell>
  );
}
