# Base Block Landing UI Redesign — Design Spec

## Goal
Redesign the landing screen (WalletGate), modals, leaderboard, game over screen, and overall game shell so Base Block feels like a modern Web3 arcade game on Base Network, while remaining mobile-first, responsive, and performant.

## Current State
- `src/App.tsx` handles phase state: wallet → playing → over, plus leaderboard overlay.
- `src/components/WalletGate.tsx` is the current landing screen; simple panel with pixel font, small emoji mascot, and basic buttons.
- `src/styles/index.css` contains all styles; currently desktop-card-like overlay, fixed heights, small fonts.
- `src/components/Leaderboard.tsx`, `GameOverModal.tsx`, `GameBoard.tsx`, `ScoreBoard.tsx`, `BlockTray.tsx`, `BlockShape.tsx` share the same visual language.
- Touch/pointer drag already works in `BlockShape.tsx` via Pointer Events, but the game shell is not optimised for mobile browsers.

## Design Direction

### Visual Language
- **Background**: fullscreen dark futuristic gradient (`#030712` → `#0a1225` → deep Base blue) with a subtle animated grid and soft blue glow.
- **Title**: large “BASE BLOCK” wordmark with neon cyan/blue gradient, glow animation, and subtle 3D depth.
- **Subtitle**: “Stack. Blast. Compete on Base.” in a clean, readable accent color.
- **Menu panel**: glassmorphism card with `rgba(255,255,255,0.05)` background, blurred backdrop, 1px semi-transparent border, soft blue shadow.
- **Decorative elements**: floating block/cube shapes animated with CSS keyframes; positioned behind content, pointer-events none, scaled down on mobile.
- **Buttons**: large (≥48px height), rounded, with hover/active glow states, clear press feedback, full-width on mobile, auto width in grid on desktop.
- **Feature cards** (mode info / wallet status): vertical stack on mobile, 2-column grid on desktop.

### Mobile-First Layout
- Default styles target portrait phones (360px–430px width).
- `min-height: 100dvh` on shell; `env(safe-area-inset-top/bottom)` padding.
- Spacing uses `rem`, `%`, `clamp()`; avoid large fixed heights.
- Game board scales with viewport: `width: min(92vw, 380px)`, `aspect-ratio: 1`.
- Block tray uses responsive cell sizes via CSS custom properties or computed sizes.
- All overlays use `width: min(92vw, 420px)` and `max-height` with scroll.

### Animations
- Floating blocks: `@keyframes float` (translateY + slight rotate).
- Glow pulse: `@keyframes glowPulse` on title and primary buttons.
- Subtle grid pan: `@keyframes gridMove` on background pseudo-element.
- Press feedback: `:active` scale + shadow reset; `:hover` only meaningful on desktop.
- Reduced motion: wrap animations in `prefers-reduced-motion` guard.

### Touch Controls
- Existing Pointer Events in `BlockShape.tsx` already support touch drag.
- Add optional mobile tap-to-place fallback: tap a tray piece to select, then tap board cell to place (does not replace drag).
- Add swipe-down gesture to deselect / cancel selection.
- Keep desktop mouse drag unchanged.

## Scope
**In scope:**
- WalletGate redesign
- Leaderboard, GameOverModal responsive styling
- Game shell responsive tweaks (App layout, ScoreBoard, BlockTray)
- Mobile-first CSS rewrite
- Decorative floating blocks
- Touch selection/place helpers

**Out of scope:**
- Wallet connection logic changes
- Smart contract / score submission logic
- Game rules, scoring, piece generation
- New animation libraries

## Success Criteria
1. Landing screen displays fullscreen dark UI with gradient, grid, neon glow, floating blocks, glass panel, title, subtitle, and buttons.
2. Buttons are ≥48px tall, comfortable spacing, full-width on mobile.
3. Layout is responsive: portrait mobile first, then tablet/desktop via `@media (min-width: 768px)`.
4. No overflow/clip on 360px–430px width devices; safe-area insets applied.
5. Type-check (`npm run check`) passes with zero errors.
6. Existing tests (`npm test`) continue to pass.
7. Build (`npm run build`) succeeds.
8. Touch controls work alongside existing pointer drag.
