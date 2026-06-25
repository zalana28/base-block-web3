import { GRID_SIZE, type Grid, type CellColor, type Position, type ClearResult } from './types.js';

export function createGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null as CellColor)
  );
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function canPlace(grid: Grid, shape: boolean[][], pos: Position): boolean {
  const rows = shape.length;
  const cols = shape[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!shape[r][c]) continue;
      const gr = pos.row + r;
      const gc = pos.col + c;
      if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
      if (grid[gr][gc] !== null) return false;
    }
  }
  return true;
}

export function placeBlock(grid: Grid, shape: boolean[][], color: CellColor, pos: Position): Grid {
  const next = cloneGrid(grid);
  const rows = shape.length;
  const cols = shape[0]?.length ?? 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape[r][c]) {
        next[pos.row + r][pos.col + c] = color;
      }
    }
  }
  return next;
}

function isRowFull(grid: Grid, row: number): boolean {
  return grid[row].every((cell) => cell !== null);
}

function isColFull(grid: Grid, col: number): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r][col] === null) return false;
  }
  return true;
}

export function clearLines(grid: Grid): { grid: Grid; result: ClearResult } {
  const next = cloneGrid(grid);
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    if (isRowFull(next, r)) clearedRows.push(r);
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    if (isColFull(next, c)) clearedCols.push(c);
  }

  // Clear rows and cols simultaneously
  for (const r of clearedRows) {
    for (let c = 0; c < GRID_SIZE; c++) next[r][c] = null;
  }
  for (const c of clearedCols) {
    for (let r = 0; r < GRID_SIZE; r++) next[r][c] = null;
  }

  // If a cell was at intersection of cleared row+col, it was cleared twice — still null, fine.

  const cellsCleared = clearedRows.length * GRID_SIZE + clearedCols.length * GRID_SIZE - clearedRows.length * clearedCols.length;
  const isCombo = (clearedRows.length + clearedCols.length) >= 2;

  return { grid: next, result: { clearedRows, clearedCols, cellsCleared, isCombo } };
}

export function findValidPlacements(grid: Grid, shape: boolean[][]): Position[] {
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
