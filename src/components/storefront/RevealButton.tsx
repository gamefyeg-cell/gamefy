"use client";

import { useState, useTransition } from "react";
import { revealOrderItemAction } from "@/lib/actions/reveal";

export default function RevealButton({ orderItemId }: { orderItemId: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (value) {
    return (
      <div className="bg-surface2 border border-success/40 rounded-lg p-3 font-mono text-sm text-success break-all">
        {value}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await revealOrderItemAction(orderItemId);
            if (res.error) setError(res.error);
            else setValue(res.value ?? null);
          })
        }
        className="btn-secondary self-start"
      >
        {pending ? "Decrypting…" : "🔒 Reveal key / credentials"}
      </button>
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
