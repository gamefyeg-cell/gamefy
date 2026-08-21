/// Hex mirrors of the brand ramps in tailwind.config.ts, for use in chart
/// SVGs (recharts fill/stroke props need real color values, not Tailwind
/// classes). Keep these in sync with tailwind.config.ts if that file changes.
///
/// Per dataviz color-formula: color is assigned by job, not picked per-chart.
export const CHART_SURFACE = "#120c1a"; // matches `surface` — chart card background
export const CHART_GRID = "#2b1e3a"; // matches `border` — recessive, one step off surface
export const CHART_AXIS_TEXT = "#64748b"; // slate-500 — muted text token for ticks/labels

// Sequential (single hue, magnitude) — revenue trend, top-products magnitude.
export const GOLD_RAMP = { light: "#f5cd93", DEFAULT: "#edaf59", deep: "#b17944" };
export const ACCENT_RAMP = { light: "#c987ee", DEFAULT: "#a83fe0", deep: "#3c1878" };

/// Ordinal ramp (one hue, monotone lightness) for funnel-shaped stages where
/// order carries meaning — e.g. views → cart adds → purchases. Light end is
/// the earliest/shallowest stage, dark end the deepest into the funnel.
/// NOTE: the darkest step deliberately does NOT reuse `accent.deep` (#3c1878)
/// from tailwind.config.ts — validated against the dark surface (#120c1a)
/// with dataviz's validate_palette.js --ordinal, accent.deep clears only
/// 1.46:1 contrast (near-invisible on a near-black background). #6b2fa8 is a
/// lighter step of the same hue that clears the 2:1 floor (2.38:1) while
/// still reading as the "deepest" step — used here only, not in Tailwind.
export const FUNNEL_ORDINAL_RAMP = [ACCENT_RAMP.light, ACCENT_RAMP.DEFAULT, "#6b2fa8"] as const;

// Status (state, reserved meaning) — see src/lib/orderStatusColors.ts for the
// order-status-specific mapping built on these same tokens.
export const STATUS_HEX = {
  success: "#3ddc97",
  warn: "#ffb84d",
  danger: "#ff5c72",
  neutral: "#64748b",
};
