"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import { toastError } from "@/lib/toast";
import { compressImageFile, MAX_IMAGE_BYTES } from "@/lib/image-compress";
import { cn } from "@/lib/cn";

type Props = {
  value: string; // imageUrl
  onChange: (next: string) => void;
  disabled?: boolean;
};

export function VariantImageField({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || !files[0]) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toastError(new Error("Please select an image file"), "Invalid file");
      return;
    }
    setBusy(true);
    try {
      let dataUrl: string;
      try {
        dataUrl = await compressImageFile(file, MAX_IMAGE_BYTES);
      } catch (e) {
        toastError(e as Error, "Could not compress image");
        return;
      }
      // validate final size
      const b64 = dataUrl.split(",")[1] ?? "";
      const bytes = Math.ceil((b64.length * 3) / 4);
      if (bytes > MAX_IMAGE_BYTES) {
        toastError(new Error(`Image must be ≤ ${MAX_IMAGE_BYTES / 1024 / 1024} MB after compression`), "Image too large");
        return;
      }
      const row = await api<{ url: string }>("/api/v1/catalog/uploads", {
        method: "POST",
        body: JSON.stringify({ dataUrl }),
      });
      onChange(row.url);
    } catch (e) {
      toastError(e as Error, "Image upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const hasImage = !!value;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30",
          hasImage ? "bg-background" : "border-dashed"
        )}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(value)} alt="Variant" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-[10px] font-medium">
            Uploading…
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {hasImage ? (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              <Pencil className="h-3 w-3" />
              Replace
            </button>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 self-start rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            {busy ? "Uploading…" : "Add image"}
          </button>
        )}
        <span className="text-[10px] leading-none text-muted-foreground">Max 1 MB • auto-compressed</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
