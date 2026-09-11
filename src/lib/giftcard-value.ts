/// A gift card's face value is often denominated in a different currency
/// than what the buyer actually pays here — e.g. a Steam China card has a
/// 30 CNY balance but is sold for ٤325 EGP. `ProductVariant.currency` is
/// always the *selling* currency (what `price` is in), so it can never be
/// used to label the face value — that was the bug: the denomination grid
/// was captioning "30" as "EGP VALUE" just because EGP happened to be the
/// price currency.
///
/// Admins encode the real face currency by typing it after the number in
/// the wizard's "Values" field (e.g. "30 CNY, 50 CNY, 60 CNY"); this parses
/// that back apart for display. A bare number ("30", no trailing currency)
/// means the face currency wasn't specified, so nothing is claimed about it.
export function parseGiftCardValue(raw: string): { amount: string; currency: string | null } {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(.+?)\s+([A-Za-z]{3})$/);
  if (m) return { amount: m[1], currency: m[2].toUpperCase() };
  return { amount: trimmed, currency: null };
}
