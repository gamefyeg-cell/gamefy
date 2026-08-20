"use client";

import { motion, useReducedMotion } from "framer-motion";
import { springs } from "@/lib/motion";

/// Fade + rise entrance when a section scrolls into view — used to give the
/// homepage a sense of arrival instead of everything just being "there".
/// Respects prefers-reduced-motion (game-feel skill, "every channel needs
/// an accessibility story" — motion gates on Reduce Motion with a static
/// equivalent) by skipping the transform and only fading.
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ ...springs.smooth, delay }}
    >
      {children}
    </motion.div>
  );
}
