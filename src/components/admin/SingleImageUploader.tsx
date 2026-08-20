"use client";

import { useRef, useState } from "react";

/// Single-image variant of ImageUploader — for fields that hold one URL
/// string (category photo, homepage hero/banner image) rather than a JSON
/// array of many.
export default function SingleImageUploader({
  name,
  initialUrl,
  onChange,
}: {
  name: string;
  initialUrl?: string | null;
  /// Fires whenever the uploaded/removed URL changes — for a parent that
  /// needs the value too (e.g. building a composite JSON config).
  onChange?: (url: string | null) => void;
}) {
  const [url, setUrlState] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setUrl(next: string | null) {
    setUrlState(next);
    onChange?.(next);
  }

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={url ?? ""} />

      {url && (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-32 h-20 object-cover rounded-lg border border-border" />
          <button
            type="button"
            onClick={() => setUrl(null)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-danger text-white text-xs"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files)}
          disabled={uploading}
          className="text-xs text-slate-400 file:btn-secondary file:!py-1.5 file:!px-3 file:mr-3 file:border-0"
        />
        {uploading && <span className="text-xs text-slate-500">Uploading…</span>}
      </div>

      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
