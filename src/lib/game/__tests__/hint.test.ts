import { describe, it, expect } from 'vitest';
import { createGrid } from '../grid.js';
import type { Grid } from '../types.js';
import {
  countFullLines, countHoles, bumpiness, maxHeight, scoreBoard,
  pieceCells, findBestPlacement,
} from '../hint.js';
import { generatePiece } from '../generator.js';

function fillRow(grid: Grid, r: number, skipCols: number[] = []) {
  for (let c = 0; c < 8; c++) if (!skipCols.includes(c)) grid[r][c] = 'red';
}
function fillCol(grid: Grid, c: number, skipRows: number[] = []) {
  for (let r = 0; r < 8; r++) if (!skipRows.includes(r)) grid[r][c] = 'blue';
}

describe('hint heuristics', () => {
  it('countFullLines: empty grid = 0', () => {
    expect(countFullLines(createGrid())).toBe(0);
  });
  it('countFullLines: counts full rows + full cols', () => {
    const g = createGrid();
    fillRow(g, 0);
    fillCol(g, 0);
    expect(countFullLines(g)).toBe(2);
  });
  it('countFullLines: near-full does not count', () => {
    const g = createGrid();
    fillRow(g, 0, [0]);
    expect(countFullLines(g)).toBe(0);
  });
  it('countHoles: empty grid = 0', () => {
    expect(countHoles(createGrid())).toBe(0);
  });
  it('countHoles: counts trapped empties under a filled cell', () => {
    const g = createGrid();
    g[0][0] = 'red'; // filled at top, empty below -> 7 holes in col 0
    expect(countHoles(g)).toBe(7);
  });
  it('countHoles: filled below empty (no hole, no gravity)', () => {
    const g = createGrid();
    g[7][0] = 'red'; // filled at bottom, empty above -> NOT a hole
    expect(countHoles(g)).toBe(0);
  });
  it('maxHeight: max filled count per column', () => {
    const g = createGrid();
    g[0][0] = 'red'; g[1][0] = 'red'; // col 0 height 2
    g[0][1] = 'red';                  // col 1 height 1
    expect(maxHeight(g)).toBe(2);
  });
  it('bumpiness: sum of adjacent height diffs', () => {
    const g = createGrid();
    g[0][0] = 'red'; g[1][0] = 'red'; // col0=2
    g[0][1] = 'red';                  // col1=1, rest 0
    // diffs: |2-1|=1, |1-0|=1, then 0s -> total 2
    expect(bumpiness(g)).toBe(2);
  });
  it('scoreBoard: prefers more lines', () => {
    const empty = createGrid();
    expect(scoreBoard(empty, 2)).toBeGreaterThan(scoreBoard(empty, 1));
  });
});

describe('hint solver', () => {
  it('pieceCells: lists occupied cells', () => {
    const p = generatePiece(1);
    const cells = pieceCells(p, { row: 0, col: 0 });
    let filled = 0;
    for (const row of p.shape) for (const c of row) if (c) filled++;
    expect(cells.length).toBe(filled);
    expect(cells.every((c) => c.row >= 0 && c.col >= 0)).toBe(true);
  });
  it('findBestPlacement: returns null when nothing fits', () => {
    const g = createGrid();
    fillRow(g, 0); fillRow(g, 1); fillRow(g, 2); fillRow(g, 3);
    fillRow(g, 4); fillRow(g, 5); fillRow(g, 6); fillRow(g, 7);
    // fully filled 1x1 cannot be placed anywhere
    const p = generatePiece(1); // could be >1x1, so just assert no crash
    const res = findBestPlacement(g, [p]);
    // grid is full -> no valid placement
    expect(res).toBeNull();
  });
  it('findBestPlacement: picks a placement that completes a line over one that does not', () => {
    const g = createGrid();
    // row 0 missing one cell at col 0
    fillRow(g, 0, [0]);
    // a 1x1 piece should be hinted to (0,0) to complete the row (1 line)
    const piece: any = { id: 'p1', name: '1x1', shape: [[true]], color: 'red' };
    const res = findBestPlacement(g, [piece]);
    expect(res).not.toBeNull();
    expect(res!.pos).toEqual({ row: 0, col: 0 });
    expect(res!.lines).toBe(1);
  });
});
