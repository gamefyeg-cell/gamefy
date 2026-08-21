"use client";

import { motion } from "framer-motion";
import { springs } from "@/lib/motion";

/// Generic fade+rise-in wrapper for otherwise-static server-rendered
/// content — animates once when scrolled into view, then leaves it alone
/// (viewport.once), so it never re-triggers on scroll-back and never adds
/// runtime cost beyond that first reveal. Reduced-motion is handled by
/// Framer Motion's own OS-level check automatically.
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...springs.smooth, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
