"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { tapFeedback } from "@/lib/motion";

/// A Link with spring press-feedback — for primary CTAs where the tactile
/// "it responded to my tap" cue matters (game-feel: routine actions still
/// deserve a small, honest acknowledgement).
export default function MotionLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div whileTap={tapFeedback} className="inline-block">
      <Link href={href} className={className}>
        {children}
      </Link>
    </motion.div>
  );
}
