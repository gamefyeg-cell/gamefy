import type { Metadata } from "next";
import { Anton, Chakra_Petch, Sora } from "next/font/google";
import "./globals.css";

// The site's full type system — three tiers, each doing one job, rather
// than one display face stretched over everything and a body left on
// whatever OS default the visitor happens to have:
//   - Anton        (--font-display) — the single biggest hero headline
//     only. Tall and ultra-condensed rather than wide/rounded (tried
//     Russo One here first — its wider, rounder letterforms read as
//     visibly "bigger"/bulkier at the same size and didn't land; Anton's
//     narrower shapes fit more text without feeling heavy-handed).
//   - Chakra Petch  (--font-heading) — section titles, product/page
//     headings, prices. Futuristic, slightly monospaced gaming-HUD face
//     with a real weight range (300–700), distinct from the display face
//     so the hierarchy is actually legible, not just "the same font big
//     vs. small."
//   - Sora          (--font-sans, the new Tailwind `sans` default) — body
//     text, nav, buttons, forms, the whole admin panel. A modern
//     geometric grotesque — more character than a default system stack,
//     still fully legible at small sizes, which a display/heading face
//     isn't.
// All three are real font files, downloaded once at build time and
// self-hosted from /_next/static via next/font/google — never a runtime
// request to Google's CDN, so this doesn't add an external dependency or
// a render-blocking network hop, same discipline as the original setup.
const display = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
const heading = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});
const body = Sora({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Gamefy — Games, Gift Cards, Top-Ups & Accounts",
  description: "Digital games, gift cards, top-ups, accounts, and subscriptions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${heading.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
