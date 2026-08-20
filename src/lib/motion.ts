// Spring presets translated directly from Apple's animation-patterns skill
// (core-animations.md, "Spring Presets iOS 17+"). Framer Motion's spring
// type accepts the same duration+bounce parameterization, so these are 1:1
// — not an approximation.
export const springs = {
  /// .bouncy — duration: 0.5, bounce: 0.3 — playful; card lift/hover.
  bouncy: { type: "spring", duration: 0.5, bounce: 0.3 } as const,
  /// .snappy — duration: 0.3, bounce: 0.15 — quick, subtle bounce; taps/presses.
  snappy: { type: "spring", duration: 0.3, bounce: 0.15 } as const,
  /// .smooth — duration: 0.5, bounce: 0 — gentle settle; entrances, reveals.
  smooth: { type: "spring", duration: 0.5, bounce: 0 } as const,
};

/// Standard press feedback for interactive controls — apply via
/// `whileTap={tapFeedback}` on any motion.* element.
export const tapFeedback = { scale: 0.96 };
