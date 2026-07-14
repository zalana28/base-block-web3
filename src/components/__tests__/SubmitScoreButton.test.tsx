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
  it('shows the SUBMIT button and explains the wallet transaction', () => {
    render(<SubmitScoreButton {...base} />);
    expect(screen.getByRole('button', { name: /submit score on-chain/i })).toBeInTheDocument();
    expect(screen.getByText(/ask your wallet to confirm a transaction/i)).toBeInTheDocument();
  });

  it('does NOT call onSubmit on render (no auto-submit)', () => {
    const onSubmit = vi.fn();
    render(<SubmitScoreButton {...base} onSubmit={onSubmit} />);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit exactly once on click', () => {
    const onSubmit = vi.fn();
    render(<SubmitScoreButton {...base} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /submit score on-chain/i }));
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
    expect(screen.getByRole('button', { name: /score submitted/i })).toBeDisabled();
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
    expect(screen.getByRole('button', { name: /submit score on-chain/i })).toBeDisabled();
  });

  it('shows the error message on failure', () => {
    render(
      <SubmitScoreButton {...base} status="error" errorMessage="User rejected the request" />,
    );
    expect(screen.getByText(/user rejected the request/i)).toBeInTheDocument();
  });
});
