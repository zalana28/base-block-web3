import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SubmitScoreButton from '../SubmitScoreButton.js';

// Shared status type used across the app.
type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

const base = {
  score: 1200,
  onSubmit: vi.fn(),
  status: 'idle' as TxStatus,
  lastSubmittedScore: null as number | null,
};

describe('SubmitScoreButton — shared submit control', () => {
  it('shows the SUBMIT button (no permanent explanatory paragraph)', () => {
    render(<SubmitScoreButton {...base} />);
    expect(screen.getByRole('button', { name: /submit score/i })).toBeInTheDocument();
    // The long gas-fee paragraph must NOT be rendered in-game/modal.
    expect(
      screen.queryByText(/ask your wallet to confirm a transaction/i),
    ).not.toBeInTheDocument();
    // Gas note is still available to assistive tech via the button's description.
    expect(screen.getByRole('button', { name: /submit score/i })).toHaveAttribute(
      'aria-description',
      expect.stringMatching(/gas fee/i),
    );
  });

  it('does NOT call onSubmit on render (no auto-submit)', () => {
    const onSubmit = vi.fn();
    render(<SubmitScoreButton {...base} onSubmit={onSubmit} />);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit exactly once on click', () => {
    const onSubmit = vi.fn();
    render(<SubmitScoreButton {...base} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /submit score/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('is disabled while pending/confirming', () => {
    const { rerender } = render(<SubmitScoreButton {...base} status="pending" />);
    expect(screen.getByRole('button', { name: /confirm in wallet/i })).toBeDisabled();
    rerender(<SubmitScoreButton {...base} status="confirming" />);
    expect(screen.getByRole('button', { name: /confirm in wallet/i })).toBeDisabled();
  });

  it('shows "SCORE SUBMITTED" only after success with matching score', () => {
    render(
      <SubmitScoreButton {...base} status="success" lastSubmittedScore={1200} />,
    );
    expect(screen.getByRole('button', { name: /submitted/i })).toBeDisabled();
    expect(screen.getByText(/score confirmed on-chain/i)).toBeInTheDocument();
  });

  it('re-enables for an updated score after success', () => {
    render(
      <SubmitScoreButton {...base} status="success" lastSubmittedScore={1200} score={1500} />,
    );
    expect(screen.getByRole('button', { name: /submit updated score/i })).toBeEnabled();
  });

  it('is disabled when score <= 0', () => {
    render(<SubmitScoreButton {...base} score={0} />);
    expect(screen.getByRole('button', { name: /submit score/i })).toBeDisabled();
  });

  it('shows the error message on failure', () => {
    render(
      <SubmitScoreButton {...base} status="error" errorMessage="User rejected the request" />,
    );
    expect(screen.getByText(/user rejected the request/i)).toBeInTheDocument();
  });
});
