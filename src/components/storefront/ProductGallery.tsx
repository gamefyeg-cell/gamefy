"use client";

import { useState } from "react";

type Slide = { type: "image"; url: string } | { type: "video"; videoId: string };

/// Product media viewer: the photo(s) an admin uploaded plus an optional
/// YouTube trailer, all in one clickable strip. A product with just one
/// photo and no video renders exactly as before (single static image, no
/// thumbnail strip) — the video slot only appears when one was set.
export default function ProductGallery({
  images,
  videoId,
  title,
}: {
  images: string[];
  videoId: string | null;
  title: string;
}) {
  const slides: Slide[] = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...(videoId ? [{ type: "video" as const, videoId }] : []),
  ];
  const [active, setActive] = useState(0);
  const current = slides[active];

  return (
    <div className="flex flex-col gap-3">
      {/* Same gradient-frame treatment as the poster cards elsewhere on the
          site (accent → gold border), so the hero image on a product page
          reads as part of the same design system, not a generic <img>. */}
      <div className="rounded-2xl p-[3px] bg-gradient-to-br from-accent via-accent-soft to-gold shadow-glow">
        <div className="rounded-[13px] aspect-video overflow-hidden bg-surface2 flex items-center justify-center">
          {!current ? (
            <span className="text-5xl font-bold text-slate-600">{title.slice(0, 1)}</span>
          ) : current.type === "video" ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${current.videoId}`}
              title={`${title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt={title} className="w-full h-full object-cover" />
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={s.type === "video" ? "Play trailer" : `View photo ${i + 1}`}
              className={`relative w-20 h-20 rounded-lg overflow-hidden border shrink-0 transition-colors ${
                i === active ? "border-accent" : "border-border hover:border-accent/50"
              }`}
            >
              {s.type === "video" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${s.videoId}/default.jpg`} alt="" className="w-full h-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-lg">▶</span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
