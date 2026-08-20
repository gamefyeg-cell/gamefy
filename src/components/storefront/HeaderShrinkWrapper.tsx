"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";

// ssr: false is load-bearing (keeps gsap server-free) — see ScrollShrinkEffect.tsx.
const ScrollShrinkEffect = dynamic(() => import("@/components/storefront/ScrollShrinkEffect"), { ssr: false });

/// Wraps the header bar with a ref for ScrollShrinkEffect to animate.
/// `children` render normally here (server-rendered, always present) —
/// only the gsap-powered animation itself is client-only.
export default function HeaderShrinkWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref}>
      {children}
      <ScrollShrinkEffect targetRef={ref} />
    </div>
  );
}
