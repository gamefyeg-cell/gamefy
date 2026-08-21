"use client";

import { motion } from "framer-motion";
import { springs } from "@/lib/motion";

/// A checkout completion is the rarest, highest-stakes moment in the whole
/// flow — game-feel's "feedback scales with rarity" says it should be the
/// one thing that actually gets a real spring-in moment, not the same
/// quiet text treatment as "added to cart". Kept to a single honest beat
/// (no confetti loop) so it doesn't compete with the order details below.
export default function OrderSuccessBadge() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={springs.bouncy}
      className="relative mx-auto w-16 h-16 flex items-center justify-center"
    >
      <motion.span
        initial={{ scale: 0.8, opacity: 0.6 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="absolute inset-0 rounded-full bg-gold/40"
      />
      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-gold to-accent flex items-center justify-center shadow-goldGlow">
        <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="black" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5 9.5 18 20 6" />
        </svg>
      </div>
    </motion.div>
  );
}
