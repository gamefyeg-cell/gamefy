"use client";

import { useRef } from "react";
import { getImageProps } from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import CursorSpotlight from "@/components/storefront/CursorSpotlight";
import heroBgDesktop from "../../../public/bg.png";
import heroBgMobile from "../../../public/bg2.png";

/// Everything behind the hero's text/poster-fan.
///
/// Two different background photos, not one photo cropped two ways:
/// bg.png was composed for a wide landscape frame (its "G7" mark centered
/// for that aspect ratio); bg2.png is a real portrait recomposition for
/// phones. A <picture>/<source> pair lets the *browser* decide which one
/// to fetch — never both — before either download starts, based on
/// viewport width; that's Next's documented art-direction pattern
/// (getImageProps), so it keeps the same automatic WebP/AVIF negotiation
/// and priority-preload behavior the single-image version had (see
/// README "Performance"), just pointed at two sources instead of one.
const IMG_OPTS = { alt: "", sizes: "100vw", priority: true } as const;

export default function HeroBackdrop({ imageUrl, alt }: { imageUrl?: string; alt?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...IMG_OPTS, src: heroBgDesktop });
  const {
    props: { srcSet: mobileSrcSet, ...mobileImgProps },
  } = getImageProps({ ...IMG_OPTS, src: heroBgMobile });

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.div className="absolute inset-0 scale-110" style={{ y }}>
        <picture>
          <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            {...mobileImgProps}
            srcSet={mobileSrcSet}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        </picture>
      </motion.div>

      {imageUrl && (
        <motion.img
          src={imageUrl}
          alt={alt ?? ""}
          style={{ y }}
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-110"
        />
      )}

      <CursorSpotlight />

      {/* bg2.png's portrait composition already keeps its mark out of the
          way better than bg.png's centered landscape crop did, but the
          mobile text still stacks/centers right over that same middle
          band, so this scrim stays as a contrast safety net. Desktop is
          untouched. */}
      <div className="absolute inset-0 bg-bg/55 md:hidden" />
      <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
    </div>
  );
}
