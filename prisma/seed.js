// Example seed data only — this is exactly the kind of content the plan
// says the admin should be free to delete/rename/reorder on day one
// (plan §7). Nothing here is a hardcoded assumption the storefront relies on.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");

const prisma = new PrismaClient();

function encryptSecret(plaintext) {
  const keyHex = process.env.ENCRYPTION_KEY;
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

const j = (v) => JSON.stringify(v);

async function main() {
  // --- Admin user ---
  await prisma.user.upsert({
    where: { email: "admin@gamefy.dev" },
    update: {},
    create: {
      email: "admin@gamefy.dev",
      passwordHash: await bcrypt.hash("Admin123!", 12),
      role: "SUPER_ADMIN",
      emailVerified: true,
    },
  });

  // --- Regions ---
  const eg = await prisma.region.upsert({
    where: { code: "EG" },
    update: {},
    create: { code: "EG", name: "Egypt", currency: "EGP" },
  });
  await prisma.region.upsert({
    where: { code: "US" },
    update: {},
    create: { code: "US", name: "United States", currency: "USD" },
  });

  // --- Top-level categories (plan §7) ---
  const games = await prisma.category.upsert({
    where: { slug: "games" },
    update: {},
    create: { name: "Games", slug: "games", sortOrder: 1, icon: "🎮" },
  });
  const giftcards = await prisma.category.upsert({
    where: { slug: "gift-cards" },
    update: {},
    create: { name: "Gift Cards", slug: "gift-cards", sortOrder: 2, icon: "🎁" },
  });
  const accounts = await prisma.category.upsert({
    where: { slug: "accounts" },
    update: {},
    create: {
      name: "Accounts",
      slug: "accounts",
      sortOrder: 3,
      icon: "🔑",
      defaultBuyerNotice:
        "This is a full account delivery. Do not change the account email or enable 2FA — doing so voids the replacement warranty.",
    },
  });
  const topups = await prisma.category.upsert({
    where: { slug: "top-ups" },
    update: {},
    create: { name: "Top-Ups", slug: "top-ups", sortOrder: 4, icon: "⚡" },
  });

  const gamesPc = await prisma.category.upsert({
    where: { slug: "games-pc" },
    update: {},
    create: { name: "PC", slug: "games-pc", parentId: games.id, sortOrder: 1 },
  });

  // --- Activation regions: Global / Zone / Country hierarchy ---
  // Separate from pricing Region above — this is "where can this key/
  // account actually be used", editable from /admin/activation-regions.
  const globalActivationRegion = await prisma.activationRegion.upsert({
    where: { id: "seed-global" },
    update: {},
    create: { id: "seed-global", name: "Global", kind: "GLOBAL", sortOrder: 0 },
  });

  const zoneDefs = [
    { id: "seed-zone-europe", name: "Europe" },
    { id: "seed-zone-mena", name: "Middle East" },
    { id: "seed-zone-namerica", name: "North America" },
    { id: "seed-zone-samerica", name: "South America" },
    { id: "seed-zone-asia", name: "Asia" },
    { id: "seed-zone-africa", name: "Africa" },
    { id: "seed-zone-oceania", name: "Oceania" },
  ];
  const zones = {};
  for (const [i, z] of zoneDefs.entries()) {
    zones[z.id] = await prisma.activationRegion.upsert({
      where: { id: z.id },
      update: {},
      create: { id: z.id, name: z.name, kind: "ZONE", sortOrder: i + 1 },
    });
  }

  // Every real, currently-recognized country (world-countries — filtered to
  // UN members / independent states, so no tiny dependent territories),
  // auto-classified into the zones above by UN subregion. Egypt and the
  // rest of North Africa are grouped into "Middle East" (MENA) rather than
  // "Africa" — how gaming/commerce platforms conventionally group them,
  // not a strict geography claim.
  function classifyZone(country) {
    const sub = country.subregion;
    if (sub === "Western Asia" || sub === "Northern Africa") return "seed-zone-mena";
    if (["Eastern Africa", "Middle Africa", "Southern Africa", "Western Africa"].includes(sub)) return "seed-zone-africa";
    if (["North America", "Central America", "Caribbean"].includes(sub)) return "seed-zone-namerica";
    if (sub === "South America") return "seed-zone-samerica";
    if (["Central Asia", "Eastern Asia", "South-Eastern Asia", "Southern Asia"].includes(sub)) return "seed-zone-asia";
    if (["Northern Europe", "Western Europe", "Southern Europe", "Eastern Europe", "Central Europe", "Southeast Europe"].includes(sub))
      return "seed-zone-europe";
    if (["Australia and New Zealand", "Melanesia", "Micronesia", "Polynesia"].includes(sub)) return "seed-zone-oceania";
    return null;
  }

  // Countries are fully regenerated from the library each run — wipe first
  // so re-seeding never leaves stale/duplicate entries. Any variant that
  // pointed at an old country row self-heals below (its upsert always
  // re-sets activationRegionId in the `update` branch too).
  await prisma.activationRegion.deleteMany({ where: { kind: "COUNTRY" } });

  const worldCountries = require("world-countries");
  const realCountries = worldCountries
    .filter((c) => c.unMember || c.independent)
    .sort((a, b) => a.name.common.localeCompare(b.name.common));

  const countryRecords = [];
  let countrySortOrder = 1;
  for (const c of realCountries) {
    const zoneId = classifyZone(c);
    if (!zoneId) continue; // shouldn't happen for a real sovereign state, but skip safely if it does
    const created = await prisma.activationRegion.create({
      data: { name: c.name.common, kind: "COUNTRY", code: c.cca2, zoneId, sortOrder: countrySortOrder++ },
    });
    countryRecords.push(created);
  }

  const egypt = countryRecords.find((c) => c.code === "EG");
  const europeZone = zones["seed-zone-europe"];

  // --- Collections ---
  const bestSellers = await prisma.collection.upsert({
    where: { slug: "best-sellers" },
    update: {},
    create: { name: "Best Sellers", slug: "best-sellers", type: "MANUAL", sortOrder: 1 },
  });

  // --- Example product: sold both as a Key AND as a Full Account (plan §1) ---
  const fifa25Images = j(["/uploads/demo-fifa25.png"]);
  const fifa25 = await prisma.product.upsert({
    where: { slug: "fifa-25" },
    update: { images: fifa25Images },
    create: {
      categoryId: gamesPc.id,
      type: "GAME",
      title: "FIFA 25",
      slug: "fifa-25",
      description: "Standard Edition, PC. Full game, latest squads and kits.",
      buyerNotice: "Key must be activated on a Steam account with region set to Europe.",
      requiresNoticeAck: true,
      publisher: "EA Sports",
      platform: "PC",
      tags: j(["sports", "ea", "2025"]),
      images: fifa25Images,
    },
  });

  const fifaKeyVariant = await prisma.productVariant.upsert({
    where: { sku: "FIFA25-PC-KEY-EU" },
    update: { activationRegionId: europeZone.id },
    create: {
      productId: fifa25.id,
      regionId: eg.id,
      activationRegionId: europeZone.id,
      platform: "PC",
      edition: "Standard",
      sku: "FIFA25-PC-KEY-EU",
      price: 1200,
      cost: 950,
      currency: "EGP",
      saleMode: "KEY",
      deliveryMethod: "AUTO_KEY",
      stockMode: "MANUAL",
      stockQty: 25,
      regionLockType: "SOFT_RESTRICTED",
      activationInstructions: "Activate via Steam > Games > Activate a Product on Steam.",
      redemptionInstructions: "Steam > Games > Activate a Product on Steam > paste code.",
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "FIFA25-PC-ACC-FULL" },
    update: { activationRegionId: globalActivationRegion.id },
    create: {
      productId: fifa25.id,
      regionId: eg.id,
      activationRegionId: globalActivationRegion.id,
      platform: "PC",
      edition: "Standard",
      sku: "FIFA25-PC-ACC-FULL",
      price: 900,
      cost: 700,
      currency: "EGP",
      saleMode: "FULL_ACCOUNT",
      deliveryMethod: "CREDENTIAL_DELIVERY",
      stockMode: "MANUAL",
      stockQty: 3,
      warrantyDays: 30,
      accountAccessLevel: "FULL",
      accountDeliveryNote:
        "Full access account — you may change email/password. 30-day replacement if recovered or banned.",
    },
  });

  // Pre-load a couple of demo keys so a checkout can actually auto-deliver.
  const existingStock = await prisma.keyStockItem.count({ where: { variantId: fifaKeyVariant.id } });
  if (existingStock === 0) {
    await prisma.keyStockItem.createMany({
      data: [
        { variantId: fifaKeyVariant.id, codeEncrypted: encryptSecret("FIFA25-DEMO-KEY1-AAAA-BBBB") },
        { variantId: fifaKeyVariant.id, codeEncrypted: encryptSecret("FIFA25-DEMO-KEY2-CCCC-DDDD") },
      ],
    });
  }

  // A second key variant scoped to one specific country (not just a whole
  // zone) — demonstrates the Global / Zone / Country activation region choice.
  const france = countryRecords.find((c) => c.code === "FR");
  const fifaFrKeyVariant = await prisma.productVariant.upsert({
    where: { sku: "FIFA25-PC-KEY-FR" },
    update: {},
    create: {
      productId: fifa25.id,
      regionId: eg.id,
      activationRegionId: france.id,
      platform: "PC",
      edition: "Standard",
      sku: "FIFA25-PC-KEY-FR",
      price: 1250,
      cost: 980,
      currency: "EGP",
      saleMode: "KEY",
      deliveryMethod: "AUTO_KEY",
      stockMode: "MANUAL",
      stockQty: 10,
      regionLockType: "HARD_LOCKED",
      activationInstructions: "This key only activates on a Steam account with region set to France.",
      redemptionInstructions: "Steam > Games > Activate a Product on Steam > paste code.",
    },
  });
  const frStockExisting = await prisma.keyStockItem.count({ where: { variantId: fifaFrKeyVariant.id } });
  if (frStockExisting === 0) {
    await prisma.keyStockItem.createMany({
      data: [{ variantId: fifaFrKeyVariant.id, codeEncrypted: encryptSecret("FIFA25-DEMO-KEY-FR-9999") }],
    });
  }

  // --- Gift card product ---
  const steamCardImages = j(["/uploads/demo-steam-wallet.png"]);
  const steamCard = await prisma.product.upsert({
    where: { slug: "steam-wallet-code" },
    update: { images: steamCardImages },
    create: {
      categoryId: giftcards.id,
      type: "GIFTCARD",
      title: "Steam Wallet Code",
      slug: "steam-wallet-code",
      description: "Add funds to your Steam Wallet instantly.",
      publisher: "Valve",
      tags: j(["steam", "wallet"]),
      images: steamCardImages,
    },
  });
  const steamVariant = await prisma.productVariant.upsert({
    where: { sku: "STEAM-EG-100" },
    update: { activationRegionId: egypt.id },
    create: {
      productId: steamCard.id,
      regionId: eg.id,
      activationRegionId: egypt.id,
      sku: "STEAM-EG-100",
      price: 250,
      cost: 220,
      currency: "EGP",
      saleMode: "KEY",
      deliveryMethod: "AUTO_KEY",
      stockMode: "MANUAL",
      stockQty: 50,
      regionLockType: "HARD_LOCKED",
      redemptionInstructions: "Steam > Wallet > Redeem Steam Wallet Code.",
    },
  });
  const steamStockCount = await prisma.keyStockItem.count({ where: { variantId: steamVariant.id } });
  if (steamStockCount === 0) {
    await prisma.keyStockItem.createMany({
      data: [{ variantId: steamVariant.id, codeEncrypted: encryptSecret("STEAM-DEMO-CODE-1111-2222") }],
    });
  }

  // --- Top-up product with a custom "Player ID" field ---
  const freeFireImages = j(["/uploads/demo-free-fire.png"]);
  const freeFire = await prisma.product.upsert({
    where: { slug: "free-fire-diamonds" },
    update: { images: freeFireImages },
    create: {
      categoryId: topups.id,
      type: "TOPUP",
      title: "Free Fire Diamonds",
      slug: "free-fire-diamonds",
      description: "Direct top-up to your Free Fire account.",
      buyerNotice: "Enter your exact in-game Player ID. Wrong ID = no refund.",
      requiresNoticeAck: true,
      publisher: "Garena",
      tags: j(["mobile", "topup"]),
      images: freeFireImages,
    },
  });
  await prisma.productVariant.upsert({
    where: { sku: "FF-DIAMONDS-100" },
    update: { activationRegionId: globalActivationRegion.id },
    create: {
      productId: freeFire.id,
      regionId: eg.id,
      activationRegionId: globalActivationRegion.id,
      sku: "FF-DIAMONDS-100",
      price: 60,
      currency: "EGP",
      saleMode: "TOPUP_DIRECT",
      deliveryMethod: "TOPUP_API",
      stockMode: "UNLIMITED",
    },
  });
  await prisma.customField.upsert({
    where: { productId_fieldKey: { productId: freeFire.id, fieldKey: "player_id" } },
    update: {},
    create: {
      productId: freeFire.id,
      fieldKey: "player_id",
      label: "Player ID / UID",
      type: "TEXT",
      required: true,
      sortOrder: 1,
    },
  });

  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId: bestSellers.id, productId: fifa25.id } },
    update: {},
    create: { collectionId: bestSellers.id, productId: fifa25.id },
  });
  await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId: bestSellers.id, productId: steamCard.id } },
    update: {},
    create: { collectionId: bestSellers.id, productId: steamCard.id },
  });

  // --- Homepage blocks ---
  const blockCount = await prisma.homepageBlock.count();
  if (blockCount === 0) {
    await prisma.homepageBlock.create({
      data: {
        type: "HERO_SLIDER",
        config: j({
          slides: [
            {
              eyebrow: "⚡ Instant & Reliable",
              title: "Instant\nGame Keys\n& Accounts",
              ctaText: "Shop Best Sellers",
              linkUrl: "/collections/best-sellers",
            },
          ],
        }),
        sortOrder: 1,
      },
    });
    await prisma.homepageBlock.create({
      data: {
        type: "CATEGORY_GRID",
        config: j({ categoryIds: [games.id, giftcards.id, accounts.id, topups.id] }),
        sortOrder: 2,
      },
    });
    await prisma.homepageBlock.create({
      data: {
        type: "FEATURED_COLLECTIONS",
        config: j({ collectionIds: [bestSellers.id] }),
        sortOrder: 3,
      },
    });
    await prisma.homepageBlock.create({
      data: {
        type: "TRENDING",
        rankingMode: "AUTO_SALES",
        config: j({ title: "Trending Now", limit: 12 }),
        sortOrder: 4,
      },
    });
  }

  // --- Discounts / offers (plan: run a sale on one product, a whole
  // category/collection, or the entire site — with or without a code) ---
  await prisma.discount.upsert({
    where: { id: "seed-discount-giftcards" },
    update: {},
    create: {
      id: "seed-discount-giftcards",
      name: "Gift Cards -10%",
      type: "PERCENT",
      value: 10,
      scope: "CATEGORY",
      scopeId: giftcards.id,
      active: true,
    },
  });
  await prisma.discount.upsert({
    where: { id: "seed-discount-welcome" },
    update: {},
    create: {
      id: "seed-discount-welcome",
      name: "Welcome Offer",
      code: "WELCOME10",
      type: "PERCENT",
      value: 10,
      scope: "ALL",
      active: true,
    },
  });

  // --- Payment methods (InstaPay / Telda) ---
  // Placeholder handles — an admin should replace these with the store's
  // real InstaPay/Telda accounts under Admin → Payment Methods before
  // going live. Seeded so checkout is testable out of the box.
  const paymentMethodCount = await prisma.paymentMethod.count();
  if (paymentMethodCount === 0) {
    await prisma.paymentMethod.create({
      data: { type: "INSTAPAY", label: "InstaPay — Main account", handle: "gamefy@instapay", sortOrder: 1 },
    });
    await prisma.paymentMethod.create({
      data: { type: "TELDA", label: "Telda — Main account", handle: "01000000000", sortOrder: 1 },
    });
  }

  console.log("Seed complete. Admin login: admin@gamefy.dev / Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
