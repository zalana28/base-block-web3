import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GameBoard from '../GameBoard.js';
import { createGrid, placeBlock } from '../../lib/game/grid.js';

describe('GameBoard', () => {
  it('renders a fresh (empty) grid without crashing', () => {
    // Fresh board = every cell is null. This is the exact state right after
    // a game mode is selected. Regression guard for the merge crash where
    // GameBoard read cell.filled / cell.color on null cells.
    expect(() => render(<GameBoard grid={createGrid()} />)).not.toThrow();
  });

  it('renders a grid containing filled (colored) cells without crashing', () => {
    const grid = placeBlock(createGrid(), [[true, true]], 'cyan', { row: 0, col: 0 });
    const { container } = render(<GameBoard grid={grid} />);
    // 8x8 = 64 cells rendered
    expect(container.querySelectorAll('.game-board > div').length).toBe(64);
  });
});
