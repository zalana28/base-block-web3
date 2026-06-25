import { describe, it, expect } from 'vitest';
import { generatePiece, generateThreePieces, getShapeSize } from '../generator.js';

describe('generator', () => {
  it('generates a piece with shape and color', () => {
    const p = generatePiece();
    expect(p.id).toBeTruthy();
    expect(p.shape.length).toBeGreaterThan(0);
    expect(p.color).toBeTruthy();
  });

  it('generates 3 unique pieces', () => {
    const pieces = generateThreePieces();
    expect(pieces).toHaveLength(3);
    expect(new Set(pieces.map((p) => p.id)).size).toBe(3);
  });

  it('getShapeSize returns correct dimensions', () => {
    const size = getShapeSize([[true, true], [true, true]]);
    expect(size.rows).toBe(2);
    expect(size.cols).toBe(2);
  });
});
