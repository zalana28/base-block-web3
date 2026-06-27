import { describe, it, expect } from 'vitest';
import type { CellColor } from '../types.js';
import { createGrid } from '../grid.js';
import { generatePiece, generateThreePieces } from '../generator.js';
import { canPlaceAny, canPlaceAnyOfPieces, canPlaceShapeAnywhere } from '../validator.js';

describe('validator', () => {
  it('canPlaceShapeAnywhere true when space exists', () => {
    const grid = createGrid();
    const p = generatePiece();
    expect(canPlaceShapeAnywhere(grid, p.shape)).toBe(true);
  });

  it('canPlaceShapeAnywhere false when grid full', () => {
    const grid = createGrid();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) grid[r][c] = 'red';
    const p = generatePiece();
    expect(canPlaceShapeAnywhere(grid, p.shape)).toBe(false);
  });

  it('canPlaceAny true when space exists', () => {
    const grid = createGrid();
    const p = generatePiece();
    expect(canPlaceAny(grid, p)).toBe(true);
  });

  it('canPlaceAnyOfPieces false when none fit', () => {
    const grid = createGrid();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) grid[r][c] = 'red';
    const pieces = generateThreePieces();
    expect(canPlaceAnyOfPieces(grid, pieces)).toBe(false);
  });

  it('canPlaceAnyOfPieces true when at least one fits', () => {
    const grid = createGrid();
    // Fill entire grid except cell (0,0)
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (r === 0 && c === 0) continue;
        grid[r][c] = 'blue';
      }
    }
    const smallPiece = { id: 's', shape: [[true]], color: 'green' as CellColor, name: '1x1' };
    const bigPiece = { id: 'b', shape: [[true, true], [true, true]], color: 'green' as CellColor, name: '2x2' };
    expect(canPlaceAnyOfPieces(grid, [smallPiece, bigPiece])).toBe(true);
  });
});
