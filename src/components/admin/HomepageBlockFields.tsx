"use client";

import { useMemo, useState } from "react";
import { HOMEPAGE_BLOCK_TYPES } from "@/lib/enums";
import SingleImageUploader from "@/components/admin/SingleImageUploader";

interface Option {
  id: string;
  name: string;
}

interface HeroConfig {
  slides?: { eyebrow?: string; title?: string; ctaText?: string; linkUrl?: string; imageUrl?: string }[];
}
interface BannerConfig {
  title?: string;
  subtitle?: string;
  linkUrl?: string;
  imageUrl?: string;
}
interface CategoryGridConfig {
  categoryIds?: string[];
}
interface CollectionsConfig {
  collectionIds?: string[];
}
interface TrendingConfig {
  title?: string;
  limit?: number;
  productIds?: string[];
}
interface FlashConfig {
  title?: string;
  collectionId?: string;
  endsAt?: string;
}

export default function HomepageBlockFields({
  categories,
  collections,
  products,
  initialType = "CUSTOM_BANNER",
  initialConfig = {},
  initialRankingMode,
}: {
  categories: Option[];
  collections: Option[];
  products: Option[];
  initialType?: string;
  initialConfig?: HeroConfig & BannerConfig & CategoryGridConfig & CollectionsConfig & TrendingConfig & FlashConfig;
  initialRankingMode?: string | null;
}) {
  const [type, setType] = useState(initialType);

  // Hero / banner (share the same shape — one image + title + link)
  const initialSlide = initialConfig.slides?.[0] ?? {};
  const [heroEyebrow, setHeroEyebrow] = useState(initialSlide.eyebrow ?? "");
  const [heroTitle, setHeroTitle] = useState(initialSlide.title ?? initialConfig.title ?? "");
  const [heroCta, setHeroCta] = useState(initialSlide.ctaText ?? "");
  const [heroLink, setHeroLink] = useState(initialSlide.linkUrl ?? initialConfig.linkUrl ?? "");
  const [heroImage, setHeroImage] = useState(initialSlide.imageUrl ?? initialConfig.imageUrl ?? "");
  const [bannerSubtitle, setBannerSubtitle] = useState(initialConfig.subtitle ?? "");

  // Category grid / featured collections
  const [categoryIds, setCategoryIds] = useState<string[]>(initialConfig.categoryIds ?? []);
  const [collectionIds, setCollectionIds] = useState<string[]>(initialConfig.collectionIds ?? []);

  // Trending
  const [trendingTitle, setTrendingTitle] = useState(initialConfig.title ?? "Trending Now");
  const [trendingLimit, setTrendingLimit] = useState(initialConfig.limit ?? 12);
  const [rankingMode, setRankingMode] = useState(initialRankingMode ?? "AUTO_POPULARITY");
  const [productIds, setProductIds] = useState<string[]>(initialConfig.productIds ?? []);

  // Flash deals
  const [flashTitle, setFlashTitle] = useState(initialConfig.title ?? "⚡ Flash Deals");
  const [flashCollectionId, setFlashCollectionId] = useState(initialConfig.collectionId ?? "");
  const [flashEndsAt, setFlashEndsAt] = useState(initialConfig.endsAt?.slice(0, 16) ?? "");

  const config = useMemo(() => {
    switch (type) {
      case "HERO_SLIDER":
        return { slides: [{ eyebrow: heroEyebrow, title: heroTitle, ctaText: heroCta, linkUrl: heroLink, imageUrl: heroImage }] };
      case "CUSTOM_BANNER":
        return { title: heroTitle, subtitle: bannerSubtitle, linkUrl: heroLink, imageUrl: heroImage };
      case "CATEGORY_GRID":
        return { categoryIds };
      case "FEATURED_COLLECTIONS":
        return { collectionIds };
      case "TRENDING":
        return rankingMode === "MANUAL"
          ? { title: trendingTitle, limit: trendingLimit, productIds }
          : { title: trendingTitle, limit: trendingLimit };
      case "FLASH_DEALS":
        return { title: flashTitle, collectionId: flashCollectionId, endsAt: flashEndsAt ? new Date(flashEndsAt).toISOString() : undefined };
      default:
        return {};
    }
  }, [
    type,
    heroEyebrow,
    heroTitle,
    heroCta,
    heroLink,
    heroImage,
    bannerSubtitle,
    categoryIds,
    collectionIds,
    trendingTitle,
    trendingLimit,
    rankingMode,
    productIds,
    flashTitle,
    flashCollectionId,
    flashEndsAt,
  ]);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  return (
    <>
      <input type="hidden" name="config" value={JSON.stringify(config)} />

      <div>
        <label className="label">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input">
          {HOMEPAGE_BLOCK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {/* the real field the server action reads — kept in sync with the select above */}
        <input type="hidden" name="type" value={type} />
      </div>

      {(type === "HERO_SLIDER" || type === "CUSTOM_BANNER") && (
        <>
          <div>
            <label className="label">Image</label>
            <SingleImageUploader name="_heroImagePreview" initialUrl={heroImage} onChange={(url) => setHeroImage(url ?? "")} />
          </div>
          {type === "HERO_SLIDER" && (
            <div>
              <label className="label">Eyebrow badge (small text above the title, optional)</label>
              <input value={heroEyebrow} onChange={(e) => setHeroEyebrow(e.target.value)} className="input" placeholder="⚡ Instant & Reliable" />
            </div>
          )}
          <div>
            <label className="label">Title</label>
            {type === "HERO_SLIDER" ? (
              <>
                <textarea
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  rows={3}
                  className="input font-mono text-sm"
                  placeholder={"INSTANT\nGAME KEYS\n& ACCOUNTS"}
                />
                <p className="text-xs text-slate-600 mt-1">
                  One line per line break. Every other line renders in the purple/gold gradient for
                  emphasis — the classic "white / accent / white" hero look.
                </p>
              </>
            ) : (
              <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className="input" placeholder="Big Sale" />
            )}
          </div>
          {type === "HERO_SLIDER" && (
            <div>
              <label className="label">Button text</label>
              <input value={heroCta} onChange={(e) => setHeroCta(e.target.value)} className="input" placeholder="Shop now" />
            </div>
          )}
          {type === "CUSTOM_BANNER" && (
            <div>
              <label className="label">Subtitle</label>
              <input value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} className="input" placeholder="Up to 40% off" />
            </div>
          )}
          <div>
            <label className="label">Link (where it goes when clicked)</label>
            <input value={heroLink} onChange={(e) => setHeroLink(e.target.value)} className="input" placeholder="/collections/best-sellers" />
          </div>
        </>
      )}

      {type === "CATEGORY_GRID" && (
        <div className="md:col-span-2">
          <label className="label">Categories to show</label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-border rounded-lg">
            {categories.length === 0 && <span className="text-xs text-slate-500">No categories yet.</span>}
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => toggle(categoryIds, setCategoryIds, c.id)}
                className={`badge border ${categoryIds.includes(c.id) ? "bg-accent text-white border-accent" : "bg-surface2 text-slate-300 border-border"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === "FEATURED_COLLECTIONS" && (
        <div className="md:col-span-2">
          <label className="label">Collections to show</label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-border rounded-lg">
            {collections.length === 0 && <span className="text-xs text-slate-500">No collections yet.</span>}
            {collections.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => toggle(collectionIds, setCollectionIds, c.id)}
                className={`badge border ${collectionIds.includes(c.id) ? "bg-accent text-white border-accent" : "bg-surface2 text-slate-300 border-border"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === "TRENDING" && (
        <>
          <div>
            <label className="label">Title</label>
            <input value={trendingTitle} onChange={(e) => setTrendingTitle(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">How many products</label>
            <input
              type="number"
              value={trendingLimit}
              onChange={(e) => setTrendingLimit(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Ranking mode</label>
            <select name="rankingMode" value={rankingMode} onChange={(e) => setRankingMode(e.target.value)} className="input">
              <option value="AUTO_POPULARITY">Auto (most popular — views, cart-adds & sales)</option>
              <option value="AUTO_SALES">Auto (best-selling only)</option>
              <option value="MANUAL">Manual pick</option>
            </select>
            <p className="text-xs text-slate-600 mt-1">
              "Most popular" ranks by real product analytics — see Product Analytics in the sidebar.
            </p>
          </div>
          {rankingMode === "MANUAL" && (
            <div className="md:col-span-2">
              <label className="label">Products to feature</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-border rounded-lg">
                {products.length === 0 && <span className="text-xs text-slate-500">No products yet.</span>}
                {products.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggle(productIds, setProductIds, p.id)}
                    className={`badge border ${productIds.includes(p.id) ? "bg-accent text-white border-accent" : "bg-surface2 text-slate-300 border-border"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {type === "FLASH_DEALS" && (
        <>
          <div>
            <label className="label">Title</label>
            <input value={flashTitle} onChange={(e) => setFlashTitle(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Collection</label>
            <select value={flashCollectionId} onChange={(e) => setFlashCollectionId(e.target.value)} className="input">
              <option value="">Select a collection…</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ends at (countdown target)</label>
            <input
              type="datetime-local"
              value={flashEndsAt}
              onChange={(e) => setFlashEndsAt(e.target.value)}
              className="input"
            />
          </div>
        </>
      )}
    </>
  );
}
