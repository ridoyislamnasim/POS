"use client";

export const MAX_IMAGE_BYTES = 1 * 1024 * 1024;

function estimateBytes(dataUrl: string): number {
  const b64 = dataUrl.split(",")[1] ?? "";
  // base64 4 chars -> 3 bytes, minus padding
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function canvasToDataUrl(
  img: HTMLImageElement,
  w: number,
  h: number,
  mime: string,
  quality: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  // white background for JPEG (to handle PNG transparency)
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  // PNG ignores quality, so use jpeg when we need compression
  return canvas.toDataURL(mime, quality);
}

export async function compressImageFile(file: File, maxBytes = MAX_IMAGE_BYTES): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Not an image");
  // quick path: if already under limit, return original dataUrl
  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  if (estimateBytes(originalDataUrl) <= maxBytes) {
    return originalDataUrl;
  }
  // need compression
  const img = await loadImage(originalDataUrl);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  // preserve quality: try progressive dimension/quality combos
  const mime = file.type === "image/png" || file.type === "image/webp" ? "image/jpeg" : file.type.toLowerCase() === "image/jpeg" || file.type === "image/jpg" ? "image/jpeg" : file.type;
  const targetMime = mime === "image/gif" ? "image/jpeg" : mime.includes("jpeg") || mime.includes("webp") ? mime : "image/jpeg";

  const dimSteps = [1280, 1024, 800, 640];
  const qualitySteps = [0.85, 0.75, 0.65, 0.5];

  for (const maxDim of dimSteps) {
    const scale = Math.min(1, maxDim / Math.max(origW, origH));
    const w = Math.max(1, Math.round(origW * scale));
    const h = Math.max(1, Math.round(origH * scale));
    for (const q of qualitySteps) {
      const dataUrl = canvasToDataUrl(img, w, h, targetMime, q);
      if (estimateBytes(dataUrl) <= maxBytes) {
        return dataUrl;
      }
    }
  }
  // last attempt: smallest dim + lowest quality
  const w = Math.max(1, Math.round(origW * Math.min(1, 640 / Math.max(origW, origH))));
  const h = Math.max(1, Math.round(origH * Math.min(1, 640 / Math.max(origW, origH))));
  const finalUrl = canvasToDataUrl(img, w, h, targetMime, 0.5);
  if (estimateBytes(finalUrl) > maxBytes) {
    throw new Error(`Image still exceeds ${Math.round(maxBytes / 1024)} KB after compression`);
  }
  return finalUrl;
}

export function dataUrlBytes(dataUrl: string): number {
  return estimateBytes(dataUrl);
}
