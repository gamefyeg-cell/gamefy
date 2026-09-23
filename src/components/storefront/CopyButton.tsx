"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`badge border text-xs transition-colors cursor-pointer shrink-0 ${
        copied
          ? "border-success text-success bg-success/10"
          : "border-border text-slate-400 hover:text-slate-200 hover:border-slate-400"
      }`}
      aria-label="Copy order ID"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
