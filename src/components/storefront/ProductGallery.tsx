"use client";

import { useState } from "react";

type Slide = { type: "image"; url: string } | { type: "video"; videoId: string };

/// Product media viewer — the uploaded screenshots plus an optional
/// YouTube trailer. Images fill the frame edge to edge (object-cover);
/// the portrait store cover is NOT shown here, it's the card art only.
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
  const current = slides[Math.min(active, slides.length - 1)];

  if (!current) {
    return (
      <div className="grid aspect-[16/10] place-items-center rounded-xl bg-surface2">
        <span className="font-heading text-6xl text-slate-700">{title.slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }

  const go = (dir: -1 | 1) => setActive((a) => (a + dir + slides.length) % slides.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative aspect-[16/10] overflow-hidden rounded-xl bg-surface2">
        {current.type === "video" ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${current.videoId}`}
            title={`${title} trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        )}

        {slides.length > 1 && current.type !== "video" && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-lg text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-lg text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100"
            >
              ›
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={s.type === "video" ? "Play trailer" : `View image ${i + 1}`}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                i === active ? "ring-accent" : "ring-transparent opacity-55 hover:opacity-100"
              }`}
            >
              {s.type === "video" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${s.videoId}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">▶</span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.url} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
