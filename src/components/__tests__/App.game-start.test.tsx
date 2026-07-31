import '@testing-library/jest-dom';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────
// Wallet is connected and the on-chain startGame tx resolves to "success"
// immediately, so WalletGate calls onReady(mode) and App enters "playing".
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
  useDisconnect: () => ({ disconnect: vi.fn() }),
}));

vi.mock('../../hooks/useGameContract.js', () => ({
  useGameContract: () => ({
    startGame: vi.fn(),
    submitScore: vi.fn(),
    status: 'success',
    error: null,
    reset: vi.fn(),
  }),
}));

vi.mock('../../hooks/useFinalScoreSubmit.js', () => ({
  useFinalScoreSubmit: () => ({
    submitScore: vi.fn(),
    status: 'idle',
    error: null,
    reset: vi.fn(),
  }),
}));

import App from '../../App.js';

describe('App — game start does not crash (regression for PR #35 merge)', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear?.();
  });
  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  function startMode(label: 'CLASSIC' | 'ARCADE') {
    render(<App />);
    // Wallet is connected -> mode selector is shown immediately.
    const modeBtn = screen.getByRole('button', { name: new RegExp(`start ${label}`, 'i') });
    act(() => {
      fireEvent.click(modeBtn);
    });
  }

  it('selecting CLASSIC renders the board + block tray without throwing', () => {
    expect(() => startMode('CLASSIC')).not.toThrow();
    expect(document.querySelector('.game-board')).toBeInTheDocument();
    expect(document.querySelector('.block-tray')).toBeInTheDocument();
    // 8x8 board cells present
    expect(document.querySelectorAll('.game-board > div').length).toBe(64);
  });

  it('selecting ARCADE renders the board + block tray without throwing', () => {
    expect(() => startMode('ARCADE')).not.toThrow();
    expect(document.querySelector('.game-board')).toBeInTheDocument();
    expect(document.querySelector('.block-tray')).toBeInTheDocument();
    expect(document.querySelectorAll('.game-board > div').length).toBe(64);
  });

  it('mode selection menu renders while connected', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /start classic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start arcade/i })).toBeInTheDocument();
  });
});
