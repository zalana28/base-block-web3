import { GRID_SIZE } from './types.js';
import type { Grid, Shape, CellColor, Position, ClearResult } from './types.js';

export function createGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null as CellColor | null),
  );
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function canPlace(grid: Grid, shape: Shape, pos: Position): boolean {
  for (let r = 0; r < shape.length; r++) {
    const row = shape[r];
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue;
      const gr = pos.row + r;
      const gc = pos.col + c;
      if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
      if (grid[gr][gc] !== null) return false;
    }
  }
  return true;
}

export function placeBlock(
  grid: Grid,
  shape: Shape,
  color: CellColor,
  pos: Position,
): Grid {
  const next = grid.map((row) => row.slice());
  for (let r = 0; r < shape.length; r++) {
    const row = shape[r];
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue;
      next[pos.row + r][pos.col + c] = color;
    }
  }
  return next;
}

export function clearLines(grid: Grid): { grid: Grid; result: ClearResult } {
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every((c) => c !== null)) clearedRows.push(r);
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c] === null) { full = false; break; }
    }
    if (full) clearedCols.push(c);
  }

  if (clearedRows.length === 0 && clearedCols.length === 0) {
    return { grid, result: { clearedRows, clearedCols, cellsCleared: 0, isCombo: false } };
  }

  const next = grid.map((row) => row.slice());
  for (const r of clearedRows) {
    for (let c = 0; c < GRID_SIZE; c++) next[r][c] = null;
  }
  for (const c of clearedCols) {
    for (let r = 0; r < GRID_SIZE; r++) next[r][c] = null;
  }

  let cellsCleared = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] !== null && next[r][c] === null) cellsCleared++;
    }
  }

  return {
    grid: next,
    result: {
      clearedRows,
      clearedCols,
      cellsCleared,
      isCombo: clearedRows.length + clearedCols.length > 1,
    },
  };
}

export function findValidPlacements(grid: Grid, shape: Shape): Position[] {
  const positions: Position[] = [];
  const rows = shape.length;
  const cols = shape[0]?.length ?? 0;
  for (let r = 0; r <= GRID_SIZE - rows; r++) {
    for (let c = 0; c <= GRID_SIZE - cols; c++) {
      if (canPlace(grid, shape, { row: r, col: c })) {
        positions.push({ row: r, col: c });
      }
    }
  }
  return positions;
}
