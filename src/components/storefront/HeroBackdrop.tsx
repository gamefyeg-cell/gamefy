"use client";

import { getImageProps } from "next/image";
import CursorSpotlight from "@/components/storefront/CursorSpotlight";
import heroBg from "../../../public/bg2.png";

/// Everything behind the hero copy + poster fan.
///
/// One image — bg2.png — full-bleed for every viewport. The copy is not
/// boxed; instead a directional gradient darkens the side it sits on so
/// text stays legible while the artwork still shows through, the way a
/// storefront hero normally works.
const IMG_OPTS = { alt: "", sizes: "100vw", priority: true } as const;

export default function HeroBackdrop({ imageUrl, alt }: { imageUrl?: string; alt?: string }) {
  const {
    props: { srcSet, ...imgProps },
  } = getImageProps({ ...IMG_OPTS, src: heroBg });

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...imgProps} srcSet={srcSet} alt="" className="absolute inset-0 h-full w-full object-cover" />

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={alt ?? ""} className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}

      <CursorSpotlight />

      {/* Readability scrims — heavier on the left (desktop) / bottom (mobile)
          where the headline sits; feathered so the art still reads. */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/20 md:hidden" />
      <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-bg via-bg/80 to-transparent" />
      <div className="absolute inset-0 hidden md:block bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
    </div>
  );
}
