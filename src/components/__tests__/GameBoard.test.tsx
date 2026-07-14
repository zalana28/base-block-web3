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
    // 8x8 = 64 cell wrappers rendered
    expect(container.querySelectorAll('.game-board > div').length).toBe(64);
  });

  it('applies the 3D voxel classes (.block-3d + color token) to filled cells', () => {
    const grid = placeBlock(createGrid(), [[true, true]], 'cyan', { row: 0, col: 0 });
    const { container } = render(<GameBoard grid={grid} />);
    const voxels = container.querySelectorAll('.block-3d.bc-cyan');
    // two filled cells from the 1x2 piece
    expect(voxels.length).toBe(2);
    // empty cells use the recessed empty style
    expect(container.querySelectorAll('.board-cell-empty').length).toBe(62);
  });
});
