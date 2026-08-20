"use client";

import { useRef, useState } from "react";

export default function ImageUploader({
  name,
  initialUrls = [],
}: {
  name: string;
  initialUrls?: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedUrl, setPastedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        uploaded.push(data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    }
    setUrls((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAt(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    setUrls((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {urls.map((url, i) => (
            <div key={url + i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-border" />
              {i === 0 && <span className="badge absolute bottom-1 left-1 bg-black/70 text-slate-200 text-[10px]">cover</span>}
              <div className="absolute -top-2 -right-2 flex gap-1">
                {i > 0 && (
                  <button type="button" onClick={() => move(i, -1)} className="w-5 h-5 rounded-full bg-surface2 border border-border text-xs text-slate-300">
                    ←
                  </button>
                )}
                <button type="button" onClick={() => removeAt(i)} className="w-5 h-5 rounded-full bg-danger text-white text-xs">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="text-xs text-slate-400 file:btn-secondary file:!py-1.5 file:!px-3 file:mr-3 file:border-0"
        />
        {uploading && <span className="text-xs text-slate-500">Uploading…</span>}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={pastedUrl}
          onChange={(e) => setPastedUrl(e.target.value)}
          placeholder="…or paste an image URL"
          className="input !py-1.5 text-xs"
        />
        <button
          type="button"
          className="btn-secondary !px-3 !py-1.5 text-xs"
          onClick={() => {
            if (!pastedUrl.trim()) return;
            setUrls((prev) => [...prev, pastedUrl.trim()]);
            setPastedUrl("");
          }}
        >
          Add
        </button>
      </div>

      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
