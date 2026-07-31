import '@testing-library/jest-dom';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import GameOverModal from '../GameOverModal.js';

// Status final-score submit harus sepenuhnya independen dari live submit:
// sukses submit saat game berlangsung TIDAK BOLEH membuat tombol final score
// terlihat "SCORE SUBMITTED". Masing-masing status diuji di sini.
describe('GameOverModal — final score submit button', () => {
  afterEach(() => cleanup());

  const renderModal = (props: Partial<Parameters<typeof GameOverModal>[0]> = {}) => {
    const onSubmitScore = vi.fn();
    render(
      <GameOverModal
        score={1200}
        bestScore={800}
        mode={0}
        level={1}
        onPlayAgain={() => {}}
        onViewLeaderboard={() => {}}
        onSubmitScore={onSubmitScore}
        submitStatus="idle"
        submitError={null}
        {...props}
      />,
    );
    return { onSubmitScore };
  };

  it('shows an ENABLED submit button when idle (no final tx yet)', () => {
    renderModal();
    const btn = screen.getByRole('button', { name: /submit score on-chain/i });
    expect(btn).toBeEnabled();
  });

  it('clicking while idle calls onSubmitScore', () => {
    const { onSubmitScore } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /submit score on-chain/i }));
    expect(onSubmitScore).toHaveBeenCalledTimes(1);
  });

  it('shows SUBMITTING... and disables the button while pending/confirming', () => {
    for (const status of ['pending', 'confirming']) {
      cleanup();
      renderModal({ submitStatus: status as 'pending' | 'confirming' });
      const btn = screen.getByRole('button', { name: /submitting/i });
      expect(btn).toBeDisabled();
      expect(screen.queryByRole('button', { name: /submit score on-chain/i })).not.toBeInTheDocument();
    }
  });

  it('shows SCORE SUBMITTED and locks the button only after final tx succeeds', () => {
    const { onSubmitScore } = renderModal({ submitStatus: 'success' });
    const btn = screen.getByRole('button', { name: /score submitted/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onSubmitScore).not.toHaveBeenCalled();
  });

  it('re-enables the button (retry) and surfaces the error on failure', () => {
    renderModal({
      submitStatus: 'error',
      submitError: { message: 'User rejected the request.' },
    });
    const btn = screen.getByRole('button', { name: /submit score on-chain/i });
    expect(btn).toBeEnabled();
    expect(screen.getByText('User rejected the request.')).toBeInTheDocument();
  });

  it('hides the submit section entirely when the score is 0 (contract reverts)', () => {
    renderModal({ score: 0 });
    expect(screen.queryByRole('button', { name: /submit score on-chain/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submitting/i })).not.toBeInTheDocument();
  });
});
