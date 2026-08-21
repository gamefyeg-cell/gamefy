/// Two soft, blurred brand-color blobs fixed behind every storefront page
/// — pure CSS, no JS, no images, so it costs nothing on top of a flat
/// background but stops every non-hero page (product, category, cart,
/// checkout...) from reading as a flat dark rectangle. The hero itself
/// doesn't need this — it has the real bg.png photo doing the same job.
export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full bg-accent/20 blur-[140px]" />
      <div className="absolute top-[60vh] -left-40 w-[480px] h-[480px] rounded-full bg-gold/10 blur-[140px]" />
    </div>
  );
}
