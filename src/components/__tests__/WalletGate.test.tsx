import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WalletGate from '../WalletGate.js';

vi.mock('wagmi', () => ({
  useConnect: () => ({ connectors: [], connect: vi.fn(), isPending: false }),
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

vi.mock('../../hooks/useGameContract.js', () => ({
  useGameContract: () => ({ startGame: vi.fn(), status: 'idle', error: null }),
}));

describe('WalletGate', () => {
  it('renders BASE BLOCK title and subtitle', () => {
    render(<WalletGate onReady={() => {}} onViewLeaderboard={() => {}} />);
    expect(screen.getByText('BASE BLOCK')).toBeInTheDocument();
    expect(screen.getByText('Stack. Blast. Compete on Base.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leaderboard/i })).toBeInTheDocument();
  });
});
