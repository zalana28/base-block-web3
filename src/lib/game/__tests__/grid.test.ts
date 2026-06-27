import { describe, it, expect } from 'vitest';
import { createGrid, canPlace, placeBlock, clearLines, cloneGrid } from '../grid.js';

describe('grid', () => {
  it('creates an empty 8x8 grid', () => {
    const grid = createGrid();
    expect(grid).toHaveLength(8);
    expect(grid[0]).toHaveLength(8);
    expect(grid.every((row) => row.every((c) => c === null))).toBe(true);
  });

  it('canPlace returns true for empty grid', () => {
    const grid = createGrid();
    const shape = [[true, true], [true, true]];
    expect(canPlace(grid, shape, { row: 0, col: 0 })).toBe(true);
    expect(canPlace(grid, shape, { row: 6, col: 6 })).toBe(true);
  });

  it('canPlace returns false out of bounds', () => {
    const grid = createGrid();
    const shape = [[true, true], [true, true]];
    expect(canPlace(grid, shape, { row: 7, col: 7 })).toBe(false);
    expect(canPlace(grid, shape, { row: 0, col: 7 })).toBe(false);
  });

  it('canPlace returns false overlapping', () => {
    let grid = createGrid();
    grid = placeBlock(grid, [[true]], 'red', { row: 0, col: 0 });
    expect(canPlace(grid, [[true]], { row: 0, col: 0 })).toBe(false);
  });

  it('placeBlock sets color correctly', () => {
    let grid = createGrid();
    grid = placeBlock(grid, [[true, true], [true, true]], 'blue', { row: 1, col: 1 });
    expect(grid[1][1]).toBe('blue');
    expect(grid[1][2]).toBe('blue');
    expect(grid[2][1]).toBe('blue');
    expect(grid[2][2]).toBe('blue');
    expect(grid[0][0]).toBeNull();
  });

  it('clearLines removes full rows', () => {
    const grid = createGrid();
    for (let c = 0; c < 8; c++) grid[3][c] = 'red';
    const { grid: next, result } = clearLines(grid);
    expect(result.clearedRows).toContain(3);
    expect(result.cellsCleared).toBe(8);
    expect(next[3].every((c) => c === null)).toBe(true);
  });

  it('clearLines removes full cols', () => {
    const grid = createGrid();
    for (let r = 0; r < 8; r++) grid[r][5] = 'green';
    const { grid: next, result } = clearLines(grid);
    expect(result.clearedCols).toContain(5);
    expect(next.every((row) => row[5] === null)).toBe(true);
  });

  it('combo detected for multi-line clear', () => {
    const grid = createGrid();
    for (let c = 0; c < 8; c++) { grid[2][c] = 'red'; grid[3][c] = 'blue'; }
    const { result } = clearLines(grid);
    expect(result.isCombo).toBe(true);
    expect(result.clearedRows).toHaveLength(2);
  });

  it('cloneGrid is independent', () => {
    const a = createGrid();
    const b = cloneGrid(a);
    b[0][0] = 'red';
    expect(a[0][0]).toBeNull();
  });
});
