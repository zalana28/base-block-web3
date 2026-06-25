# Verification Report — Mobile Drag-and-Drop Accuracy Fix

## Summary
Fixed the mobile drag-and-drop accuracy bug where pieces "jump" on drop because the anchor cell was always treated as (0,0).

## Files Changed

### `src/components/BlockShape.tsx`
- Updated `Props.onDragStart` signature: added `anchorRow` and `anchorCol` parameters.
- In `handlePointerDown`, added cell-level hit detection using `getBoundingClientRect()` and per-cell size to compute which cell within the piece was grabbed. The anchor is clamped to the piece bounds and passed to `onDragStart`.

### `src/components/BlockTray.tsx`
- Updated `Props.onDragStart` signature to match `BlockShape.tsx`: `(piece: BlockPiece, anchorRow: number, anchorCol: number) => void`.

### `src/App.tsx`
- Added `grabOffset` state: `useState<{ row: number; col: number }>({ row: 0, col: 0 })`.
- `handleDragStart` now accepts `anchorRow`/`anchorCol` and stores them in `grabOffset`.
- `handleDragMove` now subtracts `grabOffset.col` from the computed column and `grabOffset.row` from the computed row when positioning the ghost. Removed the now-obsolete `Math.max/min` clamping — `canPlace` determines validity. Added `grabOffset` to dependency array.
- `handleDragEnd` now recalculates drop position using `getBoundingClientRect()` (not stale `ghostPos`) and subtracts `grabOffset` to get the correct anchor-relative position. Added `grabOffset` to dependency array. Resets `grabOffset` on cleanup.

## Build Result

```
> tsc -b && vite build
✓ built in 219ms
```

No TypeScript errors. Build succeeded.

## Test Output
No test suite is present in this project (`npm test` not configured).

## Lint Output
No lint errors.

## Verdict
ALL_PASS