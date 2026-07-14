import '@testing-library/jest-dom';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mutable shared state so each test can control the reported tx status
// without re-hoisting vi.mock (which can only capture module-scope values).
const state = { status: 'idle' as string, score: 1500 as number, mode: 0 as number };

const submitScore = vi.fn();
const startGame = vi.fn();

vi.mock('wagmi', () => ({
  useConnect: () => ({
    connectors: [{ uid: '1', name: 'Injected' }],
    connect: vi.fn(),
    isPending: false,
  }),
  useAccount: () => ({
    address: '0x1234567890abcdef1234567890abcdef12345678',
    isConnected: true,
  }),
}));

vi.mock('../../hooks/useGameContract.js', () => ({
  useGameContract: () => ({
    startGame,
    submitScore,
    status: state.status,
    error: null,
    reset: vi.fn(),
  }),
}));

// Enter the game directly (skip wallet connect flow) so App.phase becomes "playing".
vi.mock('../../components/WalletGate.js', () => ({
  default: ({ onReady }: { onReady: (m: 0 | 1) => void }) => (
    <button type="button" onClick={() => onReady(state.mode === 1 ? 1 : 0)}>
      ENTER GAME
    </button>
  ),
}));

// Control the in-game score/mode so we can exercise the enabled/disabled states.
vi.mock('../../hooks/useGameState.js', () => {
  const makeGrid = () =>
    Array.from({ length: 8 }, () =>
      Array.from({ length: 8 }, () => ({ filled: false, color: null })),
    );
  return {
    useGameState: () => [
      {
        grid: makeGrid(),
        pieces: [],
        nextPieces: [],
        score: state.score,
        bestScore: 0,
        combo: 0,
        maxCombo: 0,
        streak: 0,
        totalCleared: 0,
        totalMoves: 0,
        phase: 'playing',
        mode: state.mode,
        level: 1,
        targetScore: 500,
        timeLeft: 90,
        clearingRows: [],
        clearingCols: [],
        lastPlacedCells: [],
      },
      {
        startGame: vi.fn(),
        placePiece: vi.fn(() => true),
        isGameOver: vi.fn(() => false),
        resetGame: vi.fn(),
        endGame: vi.fn(),
      },
    ],
  };
});

import App from '../../App.js';

describe('App — in-game Classic score submission (regression)', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear?.();
    submitScore.mockClear();
    startGame.mockClear();
    state.status = 'idle';
    state.score = 1500;
    state.mode = 0;
  });
  afterEach(() => {
    cleanup();
  });

  function enterGame() {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /enter game/i }));
  }

  it('renders the SUBMIT SCORE button while Classic is playing', () => {
    enterGame();
    expect(
      screen.getByRole('button', { name: /submit score/i }),
    ).toBeInTheDocument();
  });

  it('does NOT auto-submit on render (no transaction from effect)', () => {
    enterGame();
    expect(submitScore).not.toHaveBeenCalled();
  });

  it('calls submitScore once with mode 0 and the latest score on click', () => {
    enterGame();
    fireEvent.click(screen.getByRole('button', { name: /submit score/i }));
    expect(submitScore).toHaveBeenCalledTimes(1);
    const call = submitScore.mock.calls[0];
    expect(call[0]).toBe(0); // Classic = mode 0
    expect(call[1]).toBe(1500);
  });

  it('double-click does not produce two transactions (single-flight guard)', () => {
    enterGame();
    const btn = screen.getByRole('button', { name: /submit score/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(submitScore).toHaveBeenCalledTimes(1);
  });

  it('disables the button while a transaction is pending/confirming', () => {
    state.status = 'pending';
    enterGame();
    const btn = screen.getByRole('button', { name: /confirm in wallet/i });
    expect(btn).toBeDisabled();
  });

  it('does not reset/interrupt the game after a submit click', () => {
    enterGame();
    expect(screen.queryByText(/GAME OVER/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submit score/i }));
    expect(document.querySelector('.game-board')).toBeInTheDocument();
    expect(screen.queryByText(/GAME OVER/i)).not.toBeInTheDocument();
  });

  it('does not render the long gas-fee paragraph during gameplay', () => {
    enterGame();
    expect(
      screen.queryByText(/ask your wallet to confirm a transaction/i),
    ).not.toBeInTheDocument();
  });

  it('renders the board and block tray during Classic play', () => {
    enterGame();
    expect(document.querySelector('.game-board')).toBeInTheDocument();
    expect(document.querySelector('.block-tray')).toBeInTheDocument();
  });

  it('Arcade does NOT render the in-game submit button', () => {
    state.mode = 1;
    enterGame();
    expect(
      screen.queryByRole('button', { name: /submit score/i }),
    ).not.toBeInTheDocument();
  });
});
