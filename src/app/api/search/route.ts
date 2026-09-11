import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseStringArray } from "@/lib/json";
import { searchScore, MIN_QUERY_LENGTH } from "@/lib/search";

/// Live search-bar results. Scoring happens in memory (src/lib/search.ts)
/// rather than a DB `contains` filter so "fc27" can still find "FC 27" and
/// a lone letter never qualifies as a match — see that file's doc comment.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ query: q, results: [] });
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      coverUrl: true,
      images: true,
      category: { select: { name: true } },
      variants: { where: { active: true }, select: { price: true, currency: true } },
    },
  });

  const scored = products
    .map((p) => ({ product: p, score: searchScore(p.title, q) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title))
    .slice(0, 8);

  const results = scored.map(({ product: p }) => {
    const cheapest = p.variants.length ? p.variants.reduce((min, v) => (v.price < min.price ? v : min)) : null;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      type: p.type,
      cover: p.coverUrl || parseStringArray(p.images)[0] || null,
      price: cheapest?.price ?? null,
      currency: cheapest?.currency ?? null,
      categoryName: p.category.name,
    };
  });

  return NextResponse.json({ query: q, results });
}
