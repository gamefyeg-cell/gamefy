"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/// A soft purple/gold glow that follows the cursor within its parent —
/// fills the section (absolute inset-0), sits above the 3D scene/image but
/// below the text content. Pure decoration: pointer-events disabled so it
/// never intercepts clicks, and it simply doesn't move on touch devices
/// (no mousemove events there, which is the correct degrade).
export default function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 80, damping: 20 });
  const y = useSpring(rawY, { stiffness: 80, damping: 20 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(e.clientX - rect.left);
    rawY.set(e.clientY - rect.top);
  }

  return (
    <div ref={ref} onMouseMove={handleMove} className="absolute inset-0 overflow-hidden pointer-events-auto">
      <motion.div
        className="absolute w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{
          left: x,
          top: y,
          translateX: "-50%",
          translateY: "-50%",
          background: "radial-gradient(circle, rgba(237,175,89,0.18) 0%, rgba(168,63,224,0.14) 45%, transparent 70%)",
        }}
      />
    </div>
  );
}
