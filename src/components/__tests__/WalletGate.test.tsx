import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WalletGate from '../WalletGate.js';

const mockState = {
  account: { address: undefined, isConnected: false, chainId: undefined },
  switchChain: vi.fn(),
};

vi.mock('wagmi', () => ({
  useConnect: () => ({ connectors: [], connect: vi.fn(), isPending: false }),
  useAccount: () => mockState.account,
  useDisconnect: () => ({ disconnect: vi.fn() }),
  useSwitchChain: () => ({ switchChain: mockState.switchChain, isPending: false, error: null }),
}));

vi.mock('../../hooks/useGameContract.js', () => ({
  useGameContract: () => ({ startGame: vi.fn(), status: 'idle', error: null }),
}));

describe('WalletGate', () => {
  it('renders BASE BLOCK title and subtitle', () => {
    const { container } = render(<WalletGate onReady={() => {}} onViewLeaderboard={() => {}} />);
    expect(screen.getByText('BASE BLOCK')).toBeInTheDocument();
    // Subtitle sengaja dibagi dua span supaya baris hanya boleh patah di
    // antara frasa. getByText hanya melihat text node langsung, jadi cek
    // teks gabungannya lewat elemennya — itu yang dibaca screen reader.
    expect(container.querySelector('.landing-subtitle')).toHaveTextContent(
      'Stack. Blast. Compete on Base.',
    );
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leaderboard/i })).toBeInTheDocument();
  });

  it('keeps each subtitle phrase unbreakable', () => {
    const { container } = render(<WalletGate onReady={() => {}} onViewLeaderboard={() => {}} />);
    // Kalau frasa digabung lagi jadi satu text node, "Base." bisa menggantung
    // sendirian di baris kedua — persis bug yang dibetulkan di sini.
    const phrases = [...container.querySelectorAll('.landing-subtitle > span')].map(
      (el) => el.textContent,
    );
    expect(phrases).toEqual(['Stack. Blast.', 'Compete on Base.']);
  });
});

describe('WalletGate — auto-switch to Base on connect', () => {
  it('shows SWITCH TO BASE button when connected on the wrong chain', () => {
    mockState.account = { address: '0x1234567890abcdef1234567890abcdef12345678', isConnected: true, chainId: 1 };
    render(<WalletGate onReady={() => {}} />);

    expect(screen.getByRole('button', { name: /switch to base/i })).toBeInTheDocument();
    // Mode cards diblokir sampai wallet ada di Base.
    expect(screen.getByRole('button', { name: /start classic/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /start arcade/i })).toBeDisabled();
  });

  it('does not block mode selection when already on Base', () => {
    mockState.account = { address: '0x1234567890abcdef1234567890abcdef12345678', isConnected: true, chainId: 8453 };
    render(<WalletGate onReady={() => {}} />);

    expect(screen.queryByRole('button', { name: /switch to base/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start classic/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /start arcade/i })).toBeEnabled();
  });

  it('calls switchChain when connection is on the wrong chain', () => {
    mockState.account = { address: '0x1234567890abcdef1234567890abcdef12345678', isConnected: true, chainId: 1 };
    render(<WalletGate onReady={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /switch to base/i }));
    expect(mockState.switchChain).toHaveBeenCalledWith({ chainId: 8453 });
  });
});
