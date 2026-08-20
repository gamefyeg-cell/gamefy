"use client";

import { useRef, useState } from "react";
import { updateCartQtyAction } from "@/lib/actions/site";

/// +/- stepper instead of a bare number input — same server action
/// underneath, just a more deliberate touch than a raw <input type=number>.
export default function CartQtyInput({ variantId, qty }: { variantId: string; qty: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(qty);

  function commit(next: number) {
    const clamped = Math.max(0, next);
    setValue(clamped);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <form ref={formRef} action={updateCartQtyAction} className="flex items-center gap-1">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="qty" value={value} />
      <button
        type="button"
        onClick={() => commit(value - 1)}
        aria-label="Decrease quantity"
        className="w-7 h-7 rounded-lg bg-surface2 border border-border text-slate-300 hover:border-accent/60 hover:text-white transition-colors"
      >
        −
      </button>
      <span className="w-8 text-center text-sm text-slate-100">{value}</span>
      <button
        type="button"
        onClick={() => commit(value + 1)}
        aria-label="Increase quantity"
        className="w-7 h-7 rounded-lg bg-surface2 border border-border text-slate-300 hover:border-accent/60 hover:text-white transition-colors"
      >
        +
      </button>
    </form>
  );
}
