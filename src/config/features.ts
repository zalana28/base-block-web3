// Base Block — feature flags for the juice / QoL / drag-precision pass.
// Every addition can be disabled independently. With every flag false the
// game must behave and render exactly as it does today (zero layout shift,
// zero behavior change). Flags default to the values requested in the spec.
export const FEATURES = {
  clearAnimation: true,
  floatingScore: true,
  combo: true,
  screenShake: true,
  particles: true,
  sfx: true,
  streakFeedback: true,
  undo: true,
  hint: true,
  pause: true,
  soundToggle: true,
  share: true,
  dragRaf: true,
  snapTolerance: true,
  invalidFeedback: true,
  rowColHighlight: true,
  // Opt-in ONLY. When true, an EXTRA ~0.5 cell lift is added on top of the
  // existing 0.8-cell lift, for touch input only. Default false so the
  // current drag feel (which the owner is comfortable with) never changes.
  piecePointerOffset: false,
} as const;

export type FeatureFlags = typeof FEATURES;
