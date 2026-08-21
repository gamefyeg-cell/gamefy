# Gamefy

A full, running gaming marketplace — digital games, gift cards, top-ups, Microsoft/Xbox/PSN accounts, and subscriptions. The admin panel is the source of truth: categories, collections, homepage layout, product details, activation regions, discounts, and provider registrations are all data, editable at `/admin` — nothing on the storefront is hardcoded.

## Quick start

```bash
npm install
npx prisma db push      # creates prisma/dev.db (SQLite) from the schema
npm run prisma:seed     # demo categories, products, an admin user, discounts, key stock
npm run dev              # http://localhost:3000
```

Storefront: **http://localhost:3000**
Admin panel: **http://localhost:3000/admin** — login `admin@gamefy.dev` / `Admin123!`

## What's actually implemented (not a mockup)

- **Storefront**: homepage rendered entirely from admin-authored `HomepageBlock` rows (hero slider, category grid, featured collections, auto/manual trending, flash deals with live countdown, custom banners); category & collection pages; product page with the **Key vs. Full Account toggle** (plan §1) — a game can have independently priced/stocked KEY and FULL_ACCOUNT variants under one listing; cart; checkout with coupon codes; order confirmation with **one-time, logged decryption** of delivered keys/credentials.
- **Add Product is one step**: title/category/type, an image uploader (drag in files or paste a URL), rich-ish description (`**bold**`, `- bullets`, emoji), and an optional "Price & availability" section that creates the first purchase option (price, currency, sale mode, stock, activation region) right there — more purchase options (e.g. adding an Account variant next to a Key variant) can always be added afterward from the product page.
- **Activation regions**: a real `Global → Zone (Europe, Middle East, Americas, Asia, Africa, Oceania) → Country (Egypt, France, …)` hierarchy, admin-editable at `/admin/activation-regions`, picked per variant — separate from checkout currency, which each variant just carries directly (no separate "pricing region" concept to manage).
- **Discounts & Offers** (`/admin/discounts`): run a sale on one product, a whole category/collection, or the entire site; leave the code blank to auto-apply, or set one (e.g. `WELCOME10`) so buyers enter it at checkout. Discounts are recomputed **server-side** at checkout — never trusted from the client — and show consistently as a strikethrough price + badge on product cards, the product page, cart, checkout, and the final order.
- **Custom sold-out messaging**: each variant can carry its own out-of-stock text (e.g. "Restocking Sunday") instead of a generic "Out of stock".
- **Admin CMS**: full CRUD for categories (nested), collections (+ product assignment), products, variants (region-lock type, activation/redemption instructions, warranty, account access level), custom checkout fields (e.g. Player ID), key/credential stock upload, homepage blocks (add/reorder/schedule/region-target), providers (registration + encrypted API key), discounts, orders (manual fulfillment, refund, cancel), and a real audit log page.
- **Auth**: real sessions (JWT via `jose`, httpOnly cookie), bcrypt password hashing, role-gated `/admin` via middleware **and** a server-side check inside every admin action (plan §5).
- **Encryption**: delivered keys and account credentials are AES-256-GCM encrypted at rest and decrypted only at the point a buyer/admin clicks "Reveal" — every reveal is written to the audit log (plan §5).
- **Order fulfillment**: checkout atomically consumes a `KeyStockItem` row per AUTO_KEY/CREDENTIAL_DELIVERY unit, decrements manual stock, applies any matching discount/coupon, and marks the order FULFILLED/PARTIALLY_FULFILLED/PAID accordingly; anything that can't auto-deliver drops to admin manual fulfillment.

Verified end-to-end: `npm run build` compiles clean across all 32 routes; the add→pay→consume-stock→encrypt→decrypt round trip, the image upload endpoint, the activation-region hierarchy, a category-wide automatic discount, and a custom sold-out message were all exercised directly against the running dev server.

## What's intentionally stubbed (needs real third-party credentials I don't have)

- **Payments** — checkout uses a mock "Pay Now" that instantly marks the order paid. No Stripe/Paymob/Fawry/PayPal integration is wired up; `Order.paymentProvider`/`paymentRef` fields are ready for one.
- **Provider sync** — the `/admin/providers` page registers suppliers (Kinguin/Eneba/top-up APIs) and encrypts their API key, but there's no live stock/price polling or webhook receiver yet — that requires a real account with each provider.
- **2FA (TOTP)** — `User.twoFactorSecret`/`twoFactorEnabled` exist in the schema but issuance/verification isn't wired into login yet.
- **Top-up API delivery** — TOPUP_DIRECT variants (e.g. Free Fire Diamonds) collect the Player ID at checkout but fall back to admin manual fulfillment rather than calling a live top-up provider.
- **Image storage** — uploads land on local disk (`public/uploads/`), fine for a single instance; a real deploy would swap the one function in `src/app/api/admin/upload/route.ts` for S3/R2/Vercel Blob without touching any caller.

## Performance (Core Web Vitals)

Two concrete fixes landed after a real Web Vitals measurement showed LCP at 3.80s ("needs improvement") and INP at 320ms ("needs improvement"):

1. **The hero background image now goes through `next/image`, not a plain `<img>`.** It's a real photo (`public/bg.png`, a static asset shipped with the app — 1717×916, 2.0MB as a PNG) used as the hero's full-bleed backdrop, replacing an earlier CSS-only aurora/starfield/pedestal approximation (now deleted: `HeroVisual.tsx`, `HeroPedestal.tsx` no longer exist). Since it's a static import (`import heroBg from "../../public/bg.png"`), Next generates responsive `srcset` variants and negotiates format by the browser's `Accept` header. Verified directly: fetching it with a browser-realistic `Accept: image/avif,image/webp,...` header returns **WebP at 77KB**, vs. 2.0MB for the raw PNG — a 96% reduction on what was very likely the LCP element. The `priority` prop also emits a `<link rel="preload" as="image">` in `<head>` (confirmed in the rendered HTML), so the browser fetches it immediately instead of discovering it only once the DOM is parsed.
2. **The GSAP intro was shortened from ~2.7s to ~1.7s.** A full-screen opaque loading overlay is a known LCP anti-pattern: it can push the browser's LCP timestamp to whenever the real content becomes visible after the curtain lifts, not when it was first painted underneath. The overlay wasn't removed (see "GSAP intro" below for why it's genuinely useful), but every step in its timeline was tightened — still recognizably the same "logo settle → counted progress → wipe" beat, just not sitting on the page for as long.

Two other admin-UI-flagged animation layers (the CSS aurora blobs and pedestal glow rings, several of them running `repeat: Infinity` simultaneously) were removed as part of the same change, which also reduces continuous main-thread animation work — a plausible contributor to the elevated INP figure (input responsiveness competes with any JS actively animating on every frame). I can't re-run the user's exact Web Vitals measurement from this environment to confirm the new numbers directly, so these are the concrete, verifiable changes made in response to it, not a claim of a specific new score.

## GSAP intro + keeping the server light (Vercel)

Opening the storefront (not `/admin`) plays a GSAP-choreographed intro once per browser session — logo settle, a real counted 0→100% progress timeline, then a curtain wipe off-screen. It never replays on internal navigation (App Router layout persistence — `(site)/layout.tsx` only mounts once per hard load) and skips entirely on repeat visits within a session (`sessionStorage`) or under `prefers-reduced-motion`.

The whole thing — and the GSAP ScrollTrigger-driven header-shrink-on-scroll effect — is loaded through `next/dynamic(..., { ssr: false })`, which is the part that actually matters for "keep the server light": a plain `import gsap from "gsap"` at the top of a "use client" file still gets pulled into `.next/server` and bundled for every Vercel serverless function that renders it, because Next.js server-renders client components too. Only an `ssr:false` boundary reliably excludes a module's whole import tree from server compilation — I confirmed this the hard way: an earlier attempt using a dynamic `import()` *inside* a `useEffect` looked like it should work but didn't — `gsap`'s full source (~70KB minified) still showed up in `.next/server/chunks` on inspection. The current setup was verified clean by grepping the actual build output (`.next/server` has zero gsap references; `.next/static` has it in its own lazy-loaded chunks).

Structurally this means: `Preloader.tsx` (all gsap) is 100% client-only, with a thin `PreloaderLoader.tsx` client-boundary file since Next disallows `ssr:false` directly inside a Server Component like the layout. `HeaderShrinkWrapper.tsx` renders the header's real content (nav links, cart, sign-in) as plain always-SSR'd markup — no gsap import in that file at all — and hands a ref to a separate `ScrollShrinkEffect.tsx` (the only file that imports gsap there), loaded the same ssr:false way, so nav content is never hidden from SSR/crawlers/no-JS just to get the scroll animation.

Trade-off worth knowing: because the Preloader is ssr:false, it isn't in the server-rendered HTML — it mounts a beat after hydration rather than being present in the very first paint. On a typical connection that's imperceptible; on a slow one the raw page could theoretically be visible for a moment before the curtain drops. Given the explicit "keep server not heavy for Vercel" priority, that's the right side of the trade-off to take.

## Display typography

Headline-scale text (the hero title, homepage section headings like "Trending Now") uses **Anton** — a bold, condensed, all-caps display face suited to a gaming storefront, not the body sans-serif stretched up to 72px. Loaded via `next/font/google` in the root layout, which downloads and self-hosts the font file at *build* time (served from `/_next/static`, confirmed present as a `.woff2` in the build output) — no runtime request to Google, so it doesn't add an external dependency or affect server response time. Registered as the `font-display` Tailwind utility (`tailwind.config.ts`), applied deliberately narrowly — hero/section headings only, not body text or small card titles, since a face this heavy hurts legibility at small sizes.

The hero title supports multi-line text with alternating emphasis: enter it with line breaks in the admin (`INSTANT\nGAME KEYS\n& ACCOUNTS`), and every other line renders in a purple→magenta gradient (`bg-clip-text`) against solid white for the rest — the "white / accent / white" look common on gaming-brand hero sections. An optional "eyebrow" badge (small pill above the title, e.g. "⚡ Instant & Reliable") is also admin-configurable per the same "nothing hardcoded" principle as the rest of the site.

## Motion & the hero visual (no WebGL — on purpose)

An earlier version of the hero used a real WebGL scene (`@react-three/fiber` + `three`). It broke twice in a row with `TypeError: Cannot read properties of undefined (reading 'ReactCurrentOwner')` — a known r3f + Next.js App Router incompatibility where r3f's internals resolve a different React module instance than the rest of the app. The documented fix (`transpilePackages` in `next.config.js`) did not actually resolve it in this setup, and a crash in a `next/dynamic` component surfaces Next's full-screen dev error overlay regardless of the error boundary wrapping it — so the failure was also silently eating the loading-screen and making the whole homepage look broken. Rather than sink more time into a dependency proven fragile twice, the WebGL scene was removed entirely (`three`/`@react-three/*` uninstalled).

Its replacement went through a second iteration too: the first cut (`HeroVisual.tsx` with an abstract CSS-3D rotating cube) technically worked but was the wrong visual for a *game* marketplace — an abstract purple cube doesn't read as "games," and real storefronts (Steam, Epic, PSN) lean on cover art as their visual language. `HeroVisual.tsx` is now just atmosphere (the aurora gradient + a few drifting sparkle points); the actual centerpiece is `HeroPosterFan.tsx` — a hand-of-cards fan of real product poster-cards (the same component used everywhere else on the site, so it's the actual store's art, not a mockup), each floating with a gentle idle bob and popping forward on hover. `HeroSlider` fetches a handful of active products (preferring ones with real cover images) to feature there. When the admin sets a hero image, it shows behind the fan at low opacity as atmosphere rather than competing with it. The three demo products ship with generated placeholder cover art (`prisma/seed.js`, `public/uploads/demo-*.png`) so the storefront doesn't fall back to plain letter tiles out of the box.

Interaction throughout the storefront uses real spring physics (`framer-motion`, spring presets translated 1:1 from Apple's animation-patterns skill — see `src/lib/motion.ts`): mouse-tracked 3D tilt on every product card (`rotateX`/`rotateY` toward the cursor), a magnetic hero CTA, a cursor-following spotlight glow, scroll-parallax on the hero image, a sliding-pill tab switcher, and staggered scroll-reveal on every homepage section. Everything checks `useReducedMotion()` (plus a global CSS `prefers-reduced-motion` fallback for the remaining CSS-only hovers) and degrades to instant/static rather than forcing motion on anyone who's disabled it.

**Seeing the intro screen again**: it's gated by `sessionStorage` so it doesn't replay on every navigation — if you've already loaded the site once this browser session, add `?intro=1` to the URL (e.g. `http://localhost:3000/?intro=1`) to force a replay without opening a private window.

Route-level `loading.tsx` files (home, product, category, collection) stream branded skeleton screens — shaped like the real poster-cards, not a generic spinner — via React Suspense, confirmed by fetching a page directly and seeing the skeleton HTML stream first, followed by the real content in the same response.

## Branding

The site theme is sampled directly from `public/logo.png` (the source logo you provided) — not a stock palette. `accent` (`#a83fe0`) is the logo's violet-purple, `gold` (`#edaf59`) is its amber/gold stroke, and `bg`/`surface`/`border` are shades of the logo's own near-black. See `tailwind.config.ts` for the exact tokens.

- `public/logo.png` — full lockup (mark + "GAMEFY" wordmark + tagline), background keyed to transparent.
- `public/logo-mark.png` — just the "G" mark, square, transparent — used in the header, footer, admin sidebar, and auth pages.
- `src/app/icon.png` — the same mark, Next.js's file-convention favicon (auto-served at `/icon.png`, no manual `<link>` needed).

## What changed based on feedback (and why)

- **Removed the separate "Pricing Regions" admin section.** It duplicated what a variant's own `currency` field already does and added a confusing second "region" concept next to Activation Regions. Currency is now just a plain field per variant; the `Region`/`CategoryRegionVisibility` tables still exist in the schema for a future multi-currency storefront switcher, just with no admin UI forcing you to manage them today.
- **Price, images, and a purchase region now live on the Add Product form itself**, not hidden behind a second "add a variant" step — see the "Add Product is one step" note above.
- **All 194 countries**, not a hand-picked dozen — activation-region countries are generated from the [`world-countries`](https://www.npmjs.com/package/world-countries) package (filtered to UN members/independent states) and auto-classified into the 7 zones by UN subregion, with Egypt/Libya/Tunisia/etc. grouped under "Middle East" (MENA) rather than "Africa" — how a gaming marketplace conventionally groups them, not a geography claim.
- **Currency is a picker now, not free text** — a curated ~50-currency list, defaulting to EGP everywhere a variant is created or edited.
- **Platform is a picker now, not free text** — PC / PlayStation / Xbox / Nintendo Switch / Mobile / Mac / Linux / Cross-Platform / Other, on both the product and variant.
- **Sale mode and delivery method now show their human-readable label** (e.g. "Auto Key (instant, from stock/provider)") everywhere, including the admin order detail page, which previously printed the raw code (`AUTO_KEY`).
- **Homepage Builder no longer asks you to hand-write JSON.** Each block type now has real fields — an image uploader for the hero/banner, checkbox-style pickers for categories/collections/products, a collection dropdown + countdown datetime for flash deals — and the hero/banner image is a proper file upload, not a URL you have to already have hosted somewhere.
- **Categories can have an uploaded photo now** (`bannerUrl`), shown as a full-bleed tile image on the homepage category grid and as a header banner on the category page; categories without a photo get a nicer icon-on-gradient tile instead of the old plain letter-in-a-circle.

## Database: SQLite now, Postgres in production

Local dev uses SQLite (`DATABASE_URL="file:./dev.db"`) for zero-setup runnability. SQLite's Prisma connector doesn't support native `enum`/`Json`/`Decimal` types, so [prisma/schema.prisma](prisma/schema.prisma) models those as validated `String`/JSON-text/`Float` columns instead — every such field has a `// PG: ...` comment showing its intended Postgres type. To go to production (Neon/Supabase, per the original tech-stack recommendation): change the datasource `provider` to `"postgresql"`, restore the annotated types, and run a fresh migration. Valid enum values live in [src/lib/enums.ts](src/lib/enums.ts) either way.

## Project layout

```
prisma/schema.prisma        Full data model (see file header for the SQLite/Postgres note)
prisma/seed.js               Demo data — delete/replace freely, it's just example content
src/lib/                     Prisma client, session/auth, cart, crypto, discounts, enums, JSON/richtext helpers
src/lib/actions/             Server Actions — storefront (cart/checkout/auth) + admin/* (CRUD, guarded)
src/components/storefront/   Header, product card, buy box (Key/Account tabs), homepage block renderer
src/components/admin/        Admin sidebar/shell, image uploader, activation-region & discount-scope pickers
src/app/api/admin/upload/     Local-disk image upload endpoint (admin-gated)
src/app/(site)/              Public storefront routes
src/app/admin/                Admin panel routes (gated by middleware.ts + requireAdmin() per action)
```

## Design notes carried over from the schema

- `ProductVariant.saleMode` (`KEY` / `FULL_ACCOUNT` / `SHARED_ACCOUNT` / `TOPUP_DIRECT`) is the load-bearing field enabling one `Product` to carry independently priced/stocked key and account variants.
- `KeyStockItem` is generic encrypted-secret inventory — it holds either a redeemable key code or JSON account credentials, consumed by whichever `deliveryMethod` needs it.
- `Discount.scope`/`scopeId` covers product/category/collection/site-wide with the same four fields, rather than four separate discount tables.
- `AdminAuditLog` is generic (`entity` + `before`/`after` JSON) so any mutation type can be logged without a dedicated table per action.
