import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WalletGate from '../WalletGate.js';

vi.mock('wagmi', () => ({
  useConnect: () => ({ connectors: [], connect: vi.fn(), isPending: false }),
  useAccount: () => ({ address: undefined, isConnected: false }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
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
