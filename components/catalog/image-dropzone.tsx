"use client";

import { useRef, useState } from "react";
import { api, fileUrl } from "@/lib/api";
import { btnGhost } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";

export type GalleryImage = { url: string; isPrimary?: boolean };

export function ImageDropzone({
  images,
  onChange,
  multiple = true,
}: {
  images: GalleryImage[];
  onChange: (next: GalleryImage[]) => void;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(true);
    try {
      const uploaded: GalleryImage[] = [];
      for (const file of list) {
        const dataUrl = await readFile(file);
        const row = await api<{ url: string }>("/api/v1/catalog/uploads", {
          method: "POST",
          body: JSON.stringify({ dataUrl }),
        });
        uploaded.push({ url: row.url, isPrimary: false });
      }
      const next = multiple ? [...images, ...uploaded] : uploaded.slice(0, 1);
      if (!next.some((i) => i.isPrimary) && next[0]) next[0] = { ...next[0], isPrimary: true };
      onChange(next);
    } finally {
      setBusy(false);
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    const [row] = next.splice(i, 1);
    next.splice(j, 0, row);
    onChange(next);
  }

  return (
    <div>
      <div
        className={`rounded-md border border-dashed p-3 text-center text-sm ${drag ? "border-primary bg-muted/50" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-muted-foreground">{busy ? "Uploading…" : "Drag & drop images, or"}</p>
        <button type="button" className={btnGhost + " mt-1"} onClick={() => inputRef.current?.click()} disabled={busy}>
          Browse
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>
      {images.length ? (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((img, i) => (
            <div key={img.url + i} className="relative overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl(img.url)} alt="" className="h-20 w-full object-cover" />
              <div className="flex justify-between p-1 text-[10px]">
                <button type="button" onClick={() => move(i, -1)}>
                  ←
                </button>
                <button
                  type="button"
                  className={img.isPrimary ? "font-semibold" : ""}
                  onClick={() => onChange(images.map((x, n) => ({ ...x, isPrimary: n === i })))}
                >
                  {img.isPrimary ? "Main" : "Set main"}
                </button>
                <button type="button" onClick={() => move(i, 1)}>
                  →
                </button>
                <button type="button" className="text-destructive" onClick={() => setPending(i)}>
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <ConfirmDialog
        open={pending != null}
        title="Remove image?"
        description="This image will be removed from the product gallery."
        confirmLabel="Remove"
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending == null) return;
          const next = images.filter((_, n) => n !== pending);
          if (!next.some((i) => i.isPrimary) && next[0]) next[0] = { ...next[0], isPrimary: true };
          onChange(next);
          setPending(null);
        }}
      />
    </div>
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
