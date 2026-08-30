"use client";

import { motion, useReducedMotion } from "framer-motion";
import ProductCard from "@/components/storefront/ProductCard";

interface FanProduct {
  id: string;
  slug: string;
  title: string;
  type: string;
  coverUrl?: string | null;
  images: string;
  variants: { price: number; currency: string }[];
}

// Five slots in a hand-of-cards fan: center card largest/frontmost, each
// step out gets smaller, further, and more rotated — the standard "poster
// wall" arrangement, built from the same poster-cards used everywhere else
// on the site rather than a generic 3D primitive, so the hero actually
// looks like a game store.
// Offsets are kept tight enough to fit inside the container's own width at
// both its mobile (300px) and sm+ (380px) sizes without the outer cards
// spilling past the edge — see the width math in the container below.
const FAN = [
  { rotate: -16, x: -84, y: 22, scale: 0.78, z: 1 },
  { rotate: -7, x: -40, y: 6, scale: 0.9, z: 2 },
  { rotate: 2, x: 4, y: -6, scale: 1.04, z: 4 },
  { rotate: 10, x: 48, y: 8, scale: 0.9, z: 2 },
  { rotate: 18, x: 90, y: 24, scale: 0.78, z: 1 },
] as const;

export default function HeroPosterFan({ products }: { products: FanProduct[] }) {
  const reduced = useReducedMotion();
  const items = products.slice(0, 5);
  if (items.length === 0) return null;

  // FAN[2] is the true center (largest, frontmost, x≈0). Whatever number
  // of items we actually have, they should straddle that center slot —
  // not start from FAN[0] — or the whole group reads as shifted left.
  // (With 5 items this is a no-op: startSlot lands on 0, same as before.)
  const startSlot = 2 - Math.floor((items.length - 1) / 2);

  return (
    <div className="relative w-[260px] h-[300px] sm:w-[380px] sm:h-[420px]">
      {items.map((p, i) => {
        const slot = startSlot + i;
        const cfg = FAN[slot] ?? FAN[2];
        // Mobile shows at most the 3 cards closest to center; desktop
        // always shows every item passed in.
        const outermost = items.length > 3 && Math.abs(slot - 2) > 1;
        return (
          <motion.div
            key={p.id}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${outermost ? "hidden md:block" : ""}`}
            initial={{ zIndex: cfg.z }}
            whileHover={{ zIndex: 10 }}
          >
            <motion.div
              className="w-28 sm:w-36"
              initial={{ opacity: 0, y: 60, rotate: 0, scale: 0.6 }}
              animate={{
                opacity: 1,
                x: cfg.x,
                y: reduced ? cfg.y : [cfg.y - 8, cfg.y + 8, cfg.y - 8],
                rotate: cfg.rotate,
                scale: cfg.scale,
              }}
              transition={{
                opacity: { duration: 0.6, delay: i * 0.08, ease: "easeOut" },
                x: { duration: 0.6, delay: i * 0.08, ease: "easeOut" },
                scale: { duration: 0.6, delay: i * 0.08, ease: "easeOut" },
                rotate: { duration: 0.6, delay: i * 0.08, ease: "easeOut" },
                y: reduced
                  ? { duration: 0.6, delay: i * 0.08, ease: "easeOut" }
                  : { duration: 4.5 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 },
              }}
              whileHover={{ scale: cfg.scale * 1.1 }}
            >
              <ProductCard product={p} />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
