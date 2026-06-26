# Base Block Landing UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the landing screen and game shell into a modern, mobile-first Web3 arcade UI on Base Network.

**Architecture:** Keep all existing React components and logic intact; update JSX className/structure in `WalletGate`, `Leaderboard`, `GameOverModal`, and `App`; centralize new visual system in `src/styles/index.css` using mobile-first CSS, CSS variables, and keyframe animations. Add touch-selection helpers to `BlockTray`/`BlockShape` without removing pointer drag.

**Tech Stack:** React 18, TypeScript, Vite, CSS Modules (plain CSS file), Vitest, jsdom, @testing-library/react.

---

## Task 1: Scaffold new CSS design tokens and animations

**Files:**
- Modify: `src/styles/index.css`

- [ ] **Step 1: Add new CSS variables**

Replace/extend `:root` with modern token set:

```css
:root {
  --bg-deep: #030712;
  --bg-mid: #0a1225;
  --base-blue: #0052ff;
  --base-cyan: #00e5ff;
  --base-bright: #4d8aff;
  --neon-glow: rgba(0, 229, 255, 0.45);
  --panel-bg: rgba(10, 18, 40, 0.72);
  --panel-border: rgba(255, 255, 255, 0.1);
  --text: #e2e8f0;
  --text-dim: #94a3b8;
  /* keep legacy vars for existing components */
}
```

- [ ] **Step 2: Add keyframe animations**

```css
@keyframes float { ... }
@keyframes glowPulse { ... }
@keyframes gridPan { ... }
@keyframes fadeInUp { ... }
```

- [ ] **Step 3: Verify no syntax errors**

Run: `npx stylelint src/styles/index.css || true`
Expected: no parse errors (stylelint may not be installed; if missing, skip).

---

## Task 2: Redesign landing screen (`WalletGate.tsx`)

**Files:**
- Modify: `src/components/WalletGate.tsx`

- [ ] **Step 1: Update disconnected state layout**

Render fullscreen dark shell with:
- animated gradient background layer
- subtle grid overlay
- floating decorative block elements
- large title with gradient text
- subtitle “Stack. Blast. Compete on Base.”
- feature cards stack (mobile) / grid (desktop)
- full-width Connect Wallet button
- Leaderboard button

- [ ] **Step 2: Update connected state layout**

Show wallet status in glass card, mode selection cards (Classic / Arcade), and Disconnect option.

- [ ] **Step 3: Keep all logic unchanged**

`useConnect`, `useAccount`, `useGameContract`, handlers, effects stay identical.

---

## Task 3: Make modals responsive and modern

**Files:**
- Modify: `src/components/Leaderboard.tsx`
- Modify: `src/components/GameOverModal.tsx`

- [ ] **Step 1: Leaderboard responsive styling**

Use existing classNames but ensure list items are readable (font-size `clamp(0.75rem, 3vw, 0.875rem)`), full-width rows, and the panel scrolls on small screens.

- [ ] **Step 2: GameOverModal responsive styling**

Center score, large final-score number with glow, full-width primary/secondary buttons, safe-area padding.

---

## Task 4: Mobile-first game shell CSS

**Files:**
- Modify: `src/styles/index.css`

- [ ] **Step 1: Reset shell to mobile-first**

```css
html, body { min-height: 100dvh; }
#root {
  min-height: 100dvh;
  display: flex; flex-direction: column;
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
}
```

- [ ] **Step 2: Redefine button styles**

Default buttons: `min-height: 48px; width: 100%; font-size: clamp(0.75rem, 3.5vw, 0.875rem);`
Desktop: `width: auto; min-width: 180px;` inside `@media (min-width: 768px)`.

- [ ] **Step 3: Redefine panels/overlays**

`.overlay`: fullscreen flex, padding `clamp(1rem, 4vw, 2rem)`.
`.panel`: `width: min(92vw, 420px);` mobile, `width: min(92vw, 520px);` desktop, glassmorphism.

- [ ] **Step 4: Responsive game board**

`.game-board`: `width: min(92vw, 380px); aspect-ratio: 1;` mobile, `width: min(90vw, 420px);` desktop.

---

## Task 5: Add touch-selection / tap-to-place helpers

**Files:**
- Modify: `src/components/BlockTray.tsx`
- Modify: `src/components/BlockShape.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Lift selected piece state in App**

```ts
const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
```

- [ ] **Step 2: Add board tap handler in App**

Compute board cell from `clientX/clientY`; if a piece is selected and placement valid, call `actions.placePiece`. Clear selection.

- [ ] **Step 3: Pass selection state through BlockTray**

`BlockTray` receives `selectedPieceId` and `onSelectPiece`; passes to each `BlockShape`.

- [ ] **Step 4: Add tap-to-select in BlockShape**

On `onPointerDown`, if not dragging, set selected piece. Highlight selected piece with CSS class `selected`.

---

## Task 6: Add / update tests

**Files:**
- Create: `src/components/__tests__/WalletGate.test.tsx`

- [ ] **Step 1: Write failing test for WalletGate rendering**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WalletGate from '../WalletGate';

vi.mock('wagmi', () => ({
  useConnect: () => ({ connectors: [], connect: vi.fn(), isPending: false }),
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

vi.mock('../../hooks/useGameContract.js', () => ({
  useGameContract: () => ({ startGame: vi.fn(), status: 'idle', error: null }),
}));

describe('WalletGate', () => {
  it('renders BASE BLOCK title and subtitle', () => {
    render(<WalletGate onReady={() => {}} />);
    expect(screen.getByText(/BASE BLOCK/i)).toBeInTheDocument();
    expect(screen.getByText(/Stack\. Blast\. Compete on Base\./i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test and verify it fails/passes**

Run: `npm test -- src/components/__tests__/WalletGate.test.tsx`
Expected: PASS after implementation.

---

## Task 7: Type-check, lint, build

**Files:**
- All modified files.

- [ ] **Step 1: Type-check**

Run: `npm run check`
Expected: exit 0, zero TS errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new lint errors.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `dist/` created, no errors.

---

## Commit Plan

1. `feat(ui): redesign landing screen with mobile-first arcade shell`
2. `feat(ui): responsive modals and glassmorphism panels`
3. `feat(ui): add tap-to-place touch controls`
4. `test(ui): add WalletGate render test`
