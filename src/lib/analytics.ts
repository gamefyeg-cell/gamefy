import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/// How much each interaction is worth toward a product's popularityScore
/// (used to auto-rank "Trending Now" homepage blocks — see
/// AUTO_POPULARITY in HomepageBlocks.tsx). A sale means a lot more than a
/// browse; an add-to-cart is a real signal of intent, in between.
const WEIGHT = { VIEW: 1, ADD_TO_CART: 5, PURCHASE: 20 } as const;
export type ProductEventType = keyof typeof WEIGHT;

const COUNTER_FIELD: Record<ProductEventType, "viewCount" | "cartAddCount" | "purchaseCount"> = {
  VIEW: "viewCount",
  ADD_TO_CART: "cartAddCount",
  PURCHASE: "purchaseCount",
};

/// Records one analytics event and keeps Product's denormalized counters
/// (viewCount/cartAddCount/purchaseCount/popularityScore) in sync with it,
/// atomically. Never throws — a broken analytics write must never break
/// browsing, add-to-cart, or checkout, so failures are swallowed here.
///
/// Pass `db` when calling from inside a caller-managed transaction (e.g.
/// checkout, where the purchase event has to land in the same atomic
/// commit as the order itself) — omit it everywhere else and this opens
/// its own short transaction.
export async function trackProductEvent(
  productId: string,
  type: ProductEventType,
  opts: { quantity?: number; revenue?: number; db?: Db } = {}
) {
  const quantity = opts.quantity ?? 1;
  const field = COUNTER_FIELD[type];

  const run = async (client: Db) => {
    await client.productAnalyticsEvent.create({
      data: { productId, type, quantity, revenue: opts.revenue ?? null },
    });
    await client.product.update({
      where: { id: productId },
      data: {
        [field]: { increment: quantity },
        popularityScore: { increment: WEIGHT[type] * quantity },
      },
    });
  };

  try {
    if (opts.db) {
      await run(opts.db);
    } else {
      await prisma.$transaction((tx) => run(tx));
    }
  } catch {
    // Swallowed on purpose — see doc comment above.
  }
}
