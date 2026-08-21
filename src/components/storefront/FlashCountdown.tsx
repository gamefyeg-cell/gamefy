"use client";

import { useEffect, useState } from "react";

export default function FlashCountdown({ endsAt }: { endsAt: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setLabel("Ended");
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!label) return null;
  return <span className="badge bg-warn/20 text-warn font-mono">{label}</span>;
}
