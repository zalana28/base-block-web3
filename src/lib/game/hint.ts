// Base Block — hint solver + pure, unit-testable board heuristics.
// NOTE: this game is block-blast with NO gravity (cells stay where placed,
// full rows/cols clear). The Tetris-style heuristic below is adapted to that:
//   - "height" of a column = number of filled cells in it (no gravity stack)
//   - "holes"            = empty cells with a filled cell ABOVE in same column
//   - "bumpiness"        = sum of abs differences between adjacent col heights
//   - "lines"            = full rows + full cols a placement would clear
import { canPlace, placeBlock, clearLines, findValidPlacements } from './grid.js';
import { GRID_SIZE } from './types.js';
import type { BlockPiece, Grid, Position } from './types.js';

/** Full rows + full columns in the given grid. */
export function countFullLines(grid: Grid): number {
  let rows = 0;
  let cols = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every((c) => c !== null)) rows++;
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c] === null) { full = false; break; }
    }
    if (full) cols++;
  }
  return rows + cols;
}

/** Filled-cell count per column (the no-gravity "stack height"). */
function columnHeights(grid: Grid): number[] {
  const heights = new Array<number>(GRID_SIZE).fill(0);
  for (let c = 0; c < GRID_SIZE; c++) {
    let h = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c] !== null) h++;
    }
    heights[c] = h;
  }
  return heights;
}

export function maxHeight(grid: Grid): number {
  return Math.max(0, ...columnHeights(grid));
}

/** Sum of abs height differences between adjacent columns. */
export function bumpiness(grid: Grid): number {
  const h = columnHeights(grid);
  let b = 0;
  for (let c = 0; c < GRID_SIZE - 1; c++) {
    b += Math.abs(h[c] - h[c + 1]);
  }
  return b;
}

/** Empty cells that have a filled cell ABOVE them in the same column. */
export function countHoles(grid: Grid): number {
  let holes = 0;
  for (let c = 0; c < GRID_SIZE; c++) {
    let seenFilled = false;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c] !== null) {
        seenFilled = true;
      } else if (seenFilled) {
        holes++;
      }
    }
  }
  return holes;
}

/** Heuristic score for a board state given the lines this move clears. */
export function scoreBoard(grid: Grid, lines: number): number {
  return lines * 1000 - countHoles(grid) * 12 - bumpiness(grid) * 3 - maxHeight(grid) * 2;
}

export interface HintResult {
  pieceId: string;
  pos: Position;
  cells: Position[]; // cells the piece occupies at pos (for highlight overlay)
  lines: number;
  score: number;
}

/** Cells a piece would occupy at a placement position. */
export function pieceCells(piece: BlockPiece, pos: Position): Position[] {
  const cells: Position[] = [];
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) cells.push({ row: pos.row + r, col: pos.col + c });
    }
  }
  return cells;
}

/** Brute-force the highest-scoring (piece, row, col) across all tray pieces. */
export function findBestPlacement(grid: Grid, pieces: (BlockPiece | null)[]): HintResult | null {
  let best: HintResult | null = null;
  for (const piece of pieces) {
    if (!piece) continue;
    const positions = findValidPlacements(grid, piece.shape);
    for (const pos of positions) {
      if (!canPlace(grid, piece.shape, pos)) continue;
      const placed = placeBlock(grid, piece.shape, piece.color, pos);
      const { result } = clearLines(placed);
      const lines = result.clearedRows.length + result.clearedCols.length;
      const sc = scoreBoard(placed, lines);
      if (!best || sc > best.score) {
        best = { pieceId: piece.id, pos, cells: pieceCells(piece, pos), lines, score: sc };
      }
    }
  }
  return best;
}
