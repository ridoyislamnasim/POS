export type BarcodeLabel = {
  code: string;
  sku?: string;
  name?: string;
  price?: string;
  kind?: string;
};

export type BarcodePrintOptions = {
  copies?: number;
  size?: "small" | "standard" | "shelf";
};

function formatKind(kind?: string) {
  const k = (kind ?? "CODE128").toUpperCase();
  if (k === "EAN13" || k === "EAN-13") return "EAN13";
  if (k === "CODE39") return "CODE39";
  return "CODE128";
}

export function printBarcodeLabels(labels: BarcodeLabel[], options: BarcodePrintOptions = {}) {
  const copies = Math.min(Math.max(Number(options.copies ?? 1) || 1, 1), 50);
  const size = options.size ?? "standard";
  const dim =
    size === "small"
      ? { w: "38mm", h: "25mm", bar: 40, font: 12 }
      : size === "shelf"
        ? { w: "70mm", h: "40mm", bar: 56, font: 14 }
        : { w: "50mm", h: "30mm", bar: 48, font: 13 };
  const expanded = labels.flatMap((l) => Array.from({ length: copies }, () => l)).filter((l) => l.code?.trim());
  if (!expanded.length) return false;
  const payload = JSON.stringify(
    expanded.map((l) => ({
      code: l.code.trim(),
      sku: l.sku ?? "",
      name: l.name ?? "",
      price: l.price ?? "",
      kind: formatKind(l.kind),
    })),
  );
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) return false;
  w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode labels</title>
  <style>
    @page { margin: 6mm; }
    body { font-family: Arial, sans-serif; margin: 0; color: #111; }
    .sheet { display: flex; flex-wrap: wrap; gap: 4mm; }
    .label {
      width: ${dim.w};
      min-height: ${dim.h};
      border: 1px dashed #bbb;
      padding: 2mm 2.5mm;
      box-sizing: border-box;
      text-align: center;
      page-break-inside: avoid;
    }
    .name { font-size: 10px; line-height: 1.2; max-height: 2.4em; overflow: hidden; }
    .sku { font-size: 10px; color: #333; }
    .price { font-size: 12px; font-weight: 700; }
    svg { max-width: 100%; height: auto; }
    @media print { .label { border-color: #ddd; } }
  </style>
</head>
<body>
  <div class="sheet" id="sheet"></div>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    const items = ${payload};
    const sheet = document.getElementById("sheet");
    const barH = ${dim.bar};
    const font = ${dim.font};
    for (const item of items) {
      const el = document.createElement("div");
      el.className = "label";
      el.innerHTML =
        (item.name ? '<div class="name">' + item.name.replace(/</g,"") + "</div>" : "") +
        (item.sku ? '<div class="sku">' + item.sku.replace(/</g,"") + "</div>" : "") +
        '<svg class="bc"></svg>' +
        (item.price ? '<div class="price">৳ ' + item.price.replace(/</g,"") + "</div>" : "");
      sheet.appendChild(el);
      const svg = el.querySelector("svg");
      try {
        JsBarcode(svg, item.code, {
          format: item.kind === "EAN13" && item.code.length === 13 ? "EAN13" : item.kind === "CODE39" ? "CODE39" : "CODE128",
          width: 1.4,
          height: barH,
          displayValue: true,
          fontSize: font,
          margin: 0,
        });
      } catch (e) {
        JsBarcode(svg, item.code, { format: "CODE128", width: 1.4, height: barH, displayValue: true, fontSize: font, margin: 0 });
      }
    }
    setTimeout(function () { window.focus(); window.print(); }, 250);
  </script>
</body>
</html>`);
  w.document.close();
  return true;
}
