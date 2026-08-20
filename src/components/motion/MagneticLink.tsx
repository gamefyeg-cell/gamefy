"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { tapFeedback } from "@/lib/motion";

/// A CTA that leans toward the cursor within a small radius, then springs
/// back — the "magnetic button" touch from award-site portfolios. Purely a
/// hover embellishment; falls back to a static button on touch (no
/// mousemove there, so it just never moves — correct degrade).
export default function MagneticLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 150, damping: 15, mass: 0.3 });
  const y = useSpring(rawY, { stiffness: 150, damping: 15, mass: 0.3 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    rawX.set(relX * 0.35);
    rawY.set(relY * 0.35);
  }

  function handleLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x, y }}
      whileTap={tapFeedback}
      className="inline-block"
    >
      <Link href={href} className={className}>
        {children}
      </Link>
    </motion.div>
  );
}
