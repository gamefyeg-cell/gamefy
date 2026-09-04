"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { parseStringArray } from "@/lib/json";
import { formatMoney } from "@/lib/format";
import { labelFor, PRODUCT_TYPES } from "@/lib/enums";
import { springs, tapFeedback } from "@/lib/motion";

interface CardVariant {
  price: number;
  currency: string;
}

interface CardProduct {
  id: string;
  slug: string;
  title: string;
  type: string;
  coverUrl?: string | null;
  images: string;
  variants: CardVariant[];
}

const cardVariants = {
  rest: { y: 0 },
  hover: { y: -6 },
};
const imageVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.08 },
};

/// Three short diagonal accent bars in one corner, echoing the brand
/// logo/poster-art motif — purely decorative.
function CornerStripes({ position }: { position: "top-right" | "bottom-right" }) {
  const posClass = position === "top-right" ? "top-2 right-2" : "bottom-2 right-2";
  const rotate = position === "top-right" ? "rotate-45" : "-rotate-45";
  return (
    <div className={`absolute ${posClass} flex flex-col gap-[3px] ${rotate} pointer-events-none opacity-90`}>
      <div className="w-6 h-[3px] rounded-full bg-gold" />
      <div className="w-4 h-[3px] rounded-full bg-accent-soft" />
      <div className="w-2.5 h-[3px] rounded-full bg-accent" />
    </div>
  );
}

export default function ProductCard({
  product,
  discount,
}: {
  product: CardProduct;
  discount?: { name: string; amount: number } | null;
}) {
  const images = parseStringArray(product.images);
  // Prefer the dedicated portrait cover; fall back to the first gallery
  // image for products that predate the coverUrl field.
  const cover = product.coverUrl || images[0];
  const cheapest = product.variants.length
    ? product.variants.reduce((min, v) => (v.price < min.price ? v : min))
    : null;
  const discountedPrice = cheapest && discount ? Math.max(0, cheapest.price - discount.amount) : null;

  const reduced = useReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 14);
    rotateX.set(-py * 14);
  }
  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <Link href={`/products/${product.slug}`} className="block">
      <motion.div
        initial="rest"
        whileHover="hover"
        animate="rest"
        whileTap={tapFeedback}
        variants={cardVariants}
        transition={springs.bouncy}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="poster-cut relative aspect-[2/3] p-[3px] bg-gradient-to-br from-accent via-accent-soft to-gold"
        style={{
          willChange: "transform",
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformPerspective: 800,
        }}
      >
        <div className="poster-cut relative w-full h-full overflow-hidden bg-surface2">
          {cover ? (
            <motion.img
              src={cover}
              alt={product.title}
              variants={imageVariants}
              transition={springs.smooth}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-deep via-surface2 to-surface text-5xl font-extrabold text-white/20">
              {product.title.slice(0, 1)}
            </div>
          )}

          {/* bottom scrim for legible overlaid text */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />

          <span className="badge absolute top-2 left-2 bg-black/60 text-slate-200 backdrop-blur">
            {labelFor(PRODUCT_TYPES, product.type)}
          </span>

          <CornerStripes position="top-right" />
          <CornerStripes position="bottom-right" />

          <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-1">
            <h3 className="text-sm font-bold text-white leading-tight tracking-tight line-clamp-2 drop-shadow">
              {product.title}
            </h3>
            <div className="flex items-baseline gap-2">
              {cheapest ? (
                discountedPrice != null ? (
                  <>
                    <span className="text-gold font-extrabold text-sm drop-shadow">
                      {formatMoney(discountedPrice, cheapest.currency)}
                    </span>
                    <span className="text-slate-400 line-through text-xs">
                      {formatMoney(cheapest.price, cheapest.currency)}
                    </span>
                  </>
                ) : (
                  <span className="text-white font-semibold text-sm drop-shadow">
                    from {formatMoney(cheapest.price, cheapest.currency)}
                  </span>
                )
              ) : (
                <span className="text-slate-400 text-xs">No variants yet</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
