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
  /** Which parts of a label print. Everything defaults to true (legacy behavior). */
  showBars?: boolean;
  showName?: boolean;
  showSku?: boolean;
  showPrice?: boolean;
  showCode?: boolean;
  /** Labels per row. 0 (default) = auto flow. */
  columns?: number;
};

const CDN_FALLBACK = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";

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
  // Escape "<" so a code can never break out of the inline script block.
  const payload = JSON.stringify(
    expanded.map((l) => ({
      code: l.code.trim(),
      sku: l.sku ?? "",
      name: l.name ?? "",
      price: l.price ?? "",
      kind: formatKind(l.kind),
    })),
  ).replace(/</g, "\\u003c");
  const localLib = `${window.location.origin}/vendor/jsbarcode.min.js`;
  const opts = {
    showBars: options.showBars !== false,
    showName: options.showName !== false,
    showSku: options.showSku !== false,
    showPrice: options.showPrice !== false,
    showCode: options.showCode !== false,
    columns: Math.max(0, Math.min(6, Math.floor(Number(options.columns ?? 0) || 0))),
  };
  if (!opts.showBars && !opts.showName && !opts.showSku && !opts.showPrice && !opts.showCode) return false;

  // Plain new tab (no window features): least likely to be blocked, and
  // document.write reliably works on the returned handle.
  const w = window.open("", "_blank");
  if (!w || w.closed) return false;
  try {
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode labels (${expanded.length})</title>
  <style>
    @page { margin: 6mm; }
    body { font-family: Arial, sans-serif; margin: 0; color: #111; }
    .toolbar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f5f5f5; border-bottom: 1px solid #ddd; font-size: 14px; }
    .toolbar button { padding: 8px 20px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .sheet { display: flex; flex-wrap: wrap; gap: 4mm; padding: 6mm; }
    ${opts.columns > 0 ? `.sheet { display: grid; grid-template-columns: repeat(${opts.columns}, max-content); justify-content: start; }` : ""}
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
    .codeText { font-size: 13px; font-weight: 700; letter-spacing: 1px; margin: 2mm 0; }
    .price { font-size: 12px; font-weight: 700; }
    svg { max-width: 100%; height: auto; }
    .status { font-size: 12px; color: #666; }
    @media print {
      .toolbar { display: none; }
      .sheet { padding: 0; }
      .label { border-color: #ddd; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span id="status" class="status">Preparing ${expanded.length} label(s)…</span>
    <button type="button" onclick="window.focus();window.print();">Print</button>
  </div>
  <div class="sheet" id="sheet"></div>
  <script src="${localLib}"><\/script>
  <script>
    var items = ${payload};
    var barH = ${dim.bar};
    var font = ${dim.font};
    var opts = ${JSON.stringify(opts)};
    function setStatus(t) {
      var el = document.getElementById("status");
      if (el) el.textContent = t;
    }
    function text(tag, cls, str) {
      var d = document.createElement(tag);
      if (cls) d.className = cls;
      d.textContent = str;
      return d;
    }
    function drawBarcode(svg, code, kind) {
      if (!window.JsBarcode) return false;
      var fmt = kind === "EAN13" && code.length === 13 ? "EAN13" : kind === "CODE39" ? "CODE39" : "CODE128";
      var base = { format: fmt, width: 1.4, height: barH, displayValue: !!opts.showCode, fontSize: font, margin: 0 };
      try {
        window.JsBarcode(svg, code, base);
        return true;
      } catch (e) {
        try {
          window.JsBarcode(svg, code, { format: "CODE128", width: 1.4, height: barH, displayValue: !!opts.showCode, fontSize: font, margin: 0 });
          return true;
        } catch (e2) {
          return false;
        }
      }
    }
    function render(libReady) {
      var sheet = document.getElementById("sheet");
      sheet.innerHTML = "";
      var drawn = 0;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var el = document.createElement("div");
        el.className = "label";
        if (item.name && opts.showName) el.appendChild(text("div", "name", item.name));
        if (item.sku && opts.showSku) el.appendChild(text("div", "sku", item.sku));
        var wantBars = opts.showBars && libReady;
        if (wantBars) {
          var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          el.appendChild(svg);
          if (!drawBarcode(svg, item.code, item.kind)) {
            if (opts.showCode) el.appendChild(text("div", "codeText", item.code));
          } else {
            drawn++;
          }
        } else if (opts.showCode) {
          el.appendChild(text("div", "codeText", item.code));
        }
        if (item.price && opts.showPrice) el.appendChild(text("div", "price", "\\u09F3 " + item.price));
        sheet.appendChild(el);
      }
      return drawn;
    }
    function firePrint(msg) {
      setStatus(msg);
      setTimeout(function () {
        try { window.focus(); window.print(); } catch (e) {}
      }, 350);
    }
    function start() {
      // Barcode stripes need the engine; text-only labels print immediately.
      if (!opts.showBars) {
        render(false);
        firePrint(items.length + " text label(s) ready — print dialog opening…");
        return;
      }
      // Local lib (same origin) loads synchronously above; if it failed
      // (offline dev, blocked file), fall back to CDN before giving up.
      if (window.JsBarcode) {
        var n = render(true);
        firePrint(n + " of " + items.length + " barcode(s) ready — print dialog opening…");
        return;
      }
      setStatus("Loading barcode engine…");
      var s = document.createElement("script");
      var settled = false;
      function done(ok) {
        if (settled) return;
        settled = true;
        if (ok && window.JsBarcode) {
          var n = render(true);
          firePrint(n + " of " + items.length + " barcode(s) ready — print dialog opening…");
        } else {
          render(false);
          firePrint(items.length + " label(s) ready as text (barcode engine offline) — print dialog opening…");
        }
      }
      s.src = ${JSON.stringify(CDN_FALLBACK)};
      s.onload = function () { done(true); };
      s.onerror = function () { done(false); };
      document.head.appendChild(s);
      setTimeout(function () { done(!!window.JsBarcode); }, 6000);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  </script>
</body>
</html>`);
    w.document.close();
  } catch {
    try { w.close(); } catch { /* noop */ }
    return false;
  }
  try { w.focus(); } catch { /* noop */ }
  return true;
}
