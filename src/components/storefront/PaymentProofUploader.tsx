"use client";

import { useRef, useState } from "react";

/// Checkout-only proof-of-transfer uploader — posts to the public
/// /api/checkout/upload-proof endpoint (not the admin one; buyers aren't
/// admins). Keeps the same hidden-input contract as the admin uploaders
/// (a single named field holding the resulting URL) so the surrounding
/// <form action={placeOrderAction}> just reads it like any other field.
export default function PaymentProofUploader({ name }: { name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/checkout/upload-proof", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={url ?? ""} />

      {url ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Payment proof" className="w-20 h-20 object-cover rounded-lg border border-success/40" />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-success font-medium">✓ Screenshot attached</span>
            <button
              type="button"
              onClick={() => {
                setUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-xs text-slate-500 hover:text-slate-300 text-left"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
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
      )}

      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
