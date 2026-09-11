/// Shared between ProductBuyBox and GiftCardOptionGrid — both show an
/// ActivationRegion (Global / Zone / Country) next to a purchase option and
/// should render the same icon for the same kind.
export function regionIcon(kind?: string | null): string {
  return kind === "GLOBAL" ? "🌍" : kind === "ZONE" ? "🗺️" : "📍";
}
