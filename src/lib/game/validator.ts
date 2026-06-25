import { GRID_SIZE } from './types.js';
import type { Grid, BlockPiece, Position } from './types.js';
import { canPlace } from './grid.js';

export function canPlacePiece(grid: Grid, piece: BlockPiece, pos: Position): boolean {
  return canPlace(grid, piece.shape, pos);
}

export function canPlaceAny(grid: Grid, piece: BlockPiece): boolean {
  const rows = piece.shape.length;
  const cols = piece.shape[0]?.length ?? 0;
  for (let r = 0; r <= GRID_SIZE - rows; r++) {
    for (let c = 0; c <= GRID_SIZE - cols; c++) {
      if (canPlace(grid, piece.shape, { row: r, col: c })) {
        return true;
      }
    }
  }
  return false;
}

export function canPlaceAnyOfPieces(grid: Grid, pieces: BlockPiece[]): boolean {
  return pieces.some((p) => canPlaceAny(grid, p));
}

export function findAllValidPlacements(grid: Grid, piece: BlockPiece): Position[] {
  const positions: Position[] = [];
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
