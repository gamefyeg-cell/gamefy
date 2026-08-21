"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const SEEN_KEY = "gamefy_intro_seen";

/// The site's opening moment — a GSAP-choreographed intro (logo settle,
/// counted progress, curtain wipe) that plays once per browser session,
/// not on every internal navigation. Plays once per hard page load thanks
/// to the App Router's layout persistence; sessionStorage additionally
/// survives a manual refresh.
///
/// This module has a plain static `import gsap from "gsap"` — that's fine
/// *because* the only place this component is ever rendered
/// ((site)/layout.tsx) imports it via `next/dynamic(..., { ssr: false })`.
/// That's the mechanism that actually keeps gsap off the server: Next
/// excludes an ssr:false component's whole module tree from the server
/// compilation. (A dynamic `import()` placed inside a useEffect does NOT
/// achieve this on its own — Next's server compiler still traces and
/// bundles it into `.next/server/chunks`, confirmed by inspecting the
/// build output; only the dynamic(ssr:false) boundary at the *render*
/// site reliably excludes it.)
export default function Preloader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      // ?intro=1 forces a replay regardless of session state — handy for
      // testing without opening a private window or clearing storage.
      const forceReplay = new URLSearchParams(window.location.search).has("intro");
      const alreadySeen = !forceReplay && sessionStorage.getItem(SEEN_KEY);
      const prefersReduced = !forceReplay && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (alreadySeen || prefersReduced) {
        setDone(true);
        return;
      }

      sessionStorage.setItem(SEEN_KEY, "1");
      const counter = { value: 0 };
      document.body.style.overflow = "hidden";

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => {
          document.body.style.overflow = "";
          setDone(true);
        },
      });

      // Durations kept deliberately tight — a full-screen opaque overlay is
      // a well-known LCP anti-pattern (it can push the browser's "largest
      // contentful paint" timestamp back to whenever the real content
      // becomes visible, not when it was first painted underneath). This
      // was measured at ~2.7s total before the fix; now ~1.7s.
      tl.from(".intro-mark", { scale: 0.4, rotate: -20, opacity: 0, duration: 0.4, ease: "back.out(1.8)" })
        .from(".intro-word span", { y: "110%", duration: 0.3, ease: "power3.out" }, "-=0.2")
        .to(
          counter,
          {
            value: 100,
            duration: 0.55,
            ease: "power1.inOut",
            onUpdate: () => {
              const v = Math.round(counter.value);
              if (counterRef.current) counterRef.current.textContent = `${v}%`;
              if (barRef.current) barRef.current.style.transform = `scaleX(${v / 100})`;
            },
          },
          "-=0.1"
        )
        .to({}, { duration: 0.08 }) // brief hold at 100%
        .to(containerRef.current, { pointerEvents: "none", duration: 0 })
        .to(".intro-content", { autoAlpha: 0, y: -20, duration: 0.3, ease: "power2.in" }, "<")
        .to(containerRef.current, { yPercent: -100, duration: 0.45, ease: "power4.inOut" }, "-=0.1");

      return () => {
        document.body.style.overflow = "";
      };
    },
    { scope: containerRef }
  );

  if (done) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-bg"
    >
      <div className="intro-content flex flex-col items-center gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="" className="intro-mark w-20 h-20" />
        <div className="intro-word overflow-hidden">
          <span className="block text-2xl font-extrabold tracking-tight text-white">
            Game<span className="text-logo-gradient">fy</span>
          </span>
        </div>
        <div className="w-48 h-[3px] rounded-full bg-surface2 overflow-hidden">
          <div ref={barRef} className="h-full w-full origin-left bg-gradient-to-r from-accent to-gold" style={{ transform: "scaleX(0)" }} />
        </div>
        <span ref={counterRef} className="font-mono text-xs text-slate-500">
          0%
        </span>
      </div>
    </div>
  );
}
