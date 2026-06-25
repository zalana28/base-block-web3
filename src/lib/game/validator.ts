import { canPlace } from './grid.js';
import { GRID_SIZE } from './types.js';
import type { BlockPiece, Grid, Shape } from './types.js';

export function canPlaceShapeAnywhere(grid: Grid, shape: Shape): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlace(grid, shape, { row: r, col: c })) return true;
    }
  }
  return false;
}

export function canPlaceAnyOfPieces(grid: Grid, pieces: BlockPiece[]): boolean {
  return pieces.some((p) => canPlaceShapeAnywhere(grid, p.shape));
}

// Backward-compatible aliases
export function canPlaceAny(grid: Grid, piece: BlockPiece): boolean {
  return canPlaceShapeAnywhere(grid, piece.shape);
}

export function canPlacePiece(grid: Grid, piece: BlockPiece, pos: { row: number; col: number }): boolean {
  return canPlace(grid, piece.shape, pos);
}

export function findAllValidPlacements(grid: Grid, piece: BlockPiece): { row: number; col: number }[] {
  const positions: { row: number; col: number }[] = [];
  const rows = piece.shape.length;
  const cols = piece.shape[0]?.length ?? 0;
  for (let r = 0; r <= GRID_SIZE - rows; r++) {
    for (let c = 0; c <= GRID_SIZE - cols; c++) {
      if (canPlace(grid, piece.shape, { row: r, col: c })) {
        positions.push({ row: r, col: c });
      }
    }
  }
  return positions;
}
