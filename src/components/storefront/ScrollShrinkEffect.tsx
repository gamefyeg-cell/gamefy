"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/// Only ever loaded via next/dynamic({ ssr: false }) from
/// HeaderShrinkWrapper — that boundary is what keeps gsap out of the
/// server bundle (see Preloader.tsx for the full explanation). This file
/// has no rendered output of its own; it just attaches a scroll-scrubbed
/// scale tween to the ref its parent already rendered server-side, so the
/// real header content (nav links, cart, sign-in) is never hidden from
/// SSR/no-JS/crawlers — only the decorative animation is client-only.
export default function ScrollShrinkEffect({ targetRef }: { targetRef: RefObject<HTMLDivElement> }) {
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !targetRef.current) return;

    gsap.to(targetRef.current, {
      scale: 0.94,
      transformOrigin: "top center",
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "120px top",
        scrub: true,
      },
    });
  }, [targetRef]);

  return null;
}
