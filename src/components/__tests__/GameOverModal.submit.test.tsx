import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GameOverModal from '../GameOverModal.js';

describe('GameOverModal — explicit score submission (no auto-submit)', () => {
  it('shows a SUBMIT button and the gas note in the button description (no long paragraph)', () => {
    render(
      <GameOverModal
        score={1200}
        bestScore={800}
        mode={0}
        level={3}
        reason="no-moves"
        onPlayAgain={() => {}}
        onViewLeaderboard={() => {}}
        onSubmitScore={vi.fn()}
        txStatus="idle"
        lastSubmittedScore={null}
      />,
    );
    const btn = screen.getByRole('button', { name: /submit score/i });
    expect(btn).toBeInTheDocument();
    // Long paragraph removed; gas note lives in the button's accessible description.
    expect(
      screen.queryByText(/ask your wallet to confirm a transaction/i),
    ).not.toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-description', expect.stringMatching(/gas fee/i));
  });

  it('does NOT call onSubmitScore on render (no auto-submit)', () => {
    const onSubmit = vi.fn();
    render(
      <GameOverModal
        score={1200}
        bestScore={800}
        reason="no-moves"
        onPlayAgain={() => {}}
        onViewLeaderboard={() => {}}
        onSubmitScore={onSubmit}
        lastSubmittedScore={null}
      />,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmitScore exactly once when the button is clicked', () => {
    const onSubmit = vi.fn();
    render(
      <GameOverModal
        score={1200}
        bestScore={800}
        reason="no-moves"
        onPlayAgain={() => {}}
        onViewLeaderboard={() => {}}
        onSubmitScore={onSubmit}
        lastSubmittedScore={null}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /submit score/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the button and shows confirmed state only after success', () => {
    const { rerender } = render(
      <GameOverModal
        score={1200}
        bestScore={800}
        reason="no-moves"
        onPlayAgain={() => {}}
        onViewLeaderboard={() => {}}
        onSubmitScore={vi.fn()}
        txStatus="confirming"
        lastSubmittedScore={null}
      />,
    );
    expect(screen.getByRole('button', { name: /confirm in wallet/i })).toBeDisabled();

    rerender(
      <GameOverModal
        score={1200}
        bestScore={800}
        reason="no-moves"
        onPlayAgain={() => {}}
        onViewLeaderboard={() => {}}
        onSubmitScore={vi.fn()}
        txStatus="success"
        lastSubmittedScore={1200}
      />,
    );
    expect(screen.getByRole('button', { name: /submitted/i })).toBeDisabled();
    expect(screen.getByText(/score confirmed on-chain/i)).toBeInTheDocument();
  });

  it('shows an error message when the transaction is rejected/fails', () => {
    render(
      <GameOverModal
        score={1200}
        bestScore={800}
        reason="no-moves"
        onPlayAgain={() => {}}
        onViewLeaderboard={() => {}}
        onSubmitScore={vi.fn()}
        txStatus="error"
        txError={{ message: 'User rejected the request' }}
        lastSubmittedScore={null}
      />,
    );
    expect(screen.getByText(/user rejected the request/i)).toBeInTheDocument();
  });
});
