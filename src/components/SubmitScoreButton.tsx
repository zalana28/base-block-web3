type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

interface SubmitScoreButtonProps {
  score: number;
  status: TxStatus;
  lastSubmittedScore: number | null;
  onSubmit: () => void;
  errorMessage?: string | null;
  compact?: boolean;
}

/**
 * Reusable score-submission control.
 *
 * Security invariants (shared by the in-game Classic button and the Game Over modal):
 * - Never triggers a transaction itself — `onSubmit` is wired to a user click handler only.
 * - Never shows "submitted" until the on-chain receipt is confirmed (status === 'success'
 *   AND the current score equals the last confirmed score).
 * - Disabled while a transaction is pending/confirming, when score <= 0, or once the
 *   current score has already been confirmed on-chain.
 *
 * UI: no permanent explanatory paragraph (removed to keep the gameplay viewport free of
 * scroll). Instead the gas-fee note lives in an accessible `title`/aria-description and in
 * the wallet confirmation step. Labels stay terse per the compact single-screen spec.
 */
export default function SubmitScoreButton({
  score,
  status,
  lastSubmittedScore,
  onSubmit,
  errorMessage = null,
  compact = false,
}: SubmitScoreButtonProps) {
  const isBusy = status === 'pending' || status === 'confirming';
  const isConfirmedSame =
    status === 'success' && score > 0 &&
    lastSubmittedScore != null && score === lastSubmittedScore;

  const disabled = isBusy || score <= 0 || isConfirmedSame;

  const label = isBusy
    ? '⏳ CONFIRM IN WALLET'
    : isConfirmedSame
      ? '✅ SUBMITTED ✓'
      : lastSubmittedScore != null && score > lastSubmittedScore
        ? '📤 SUBMIT UPDATED SCORE'
        : '📤 SUBMIT SCORE';

  const feeNote =
    'A wallet transaction and network gas fee are required to record your score on Base.';

  return (
    <div className={`submit-score${compact ? ' submit-score--compact' : ''}`}>
      <button
        type="button"
        className="primary submit-score-btn"
        onClick={onSubmit}
        disabled={disabled}
        title={feeNote}
        aria-description={feeNote}
      >
        {label}
      </button>
      {status === 'error' && errorMessage && (
        <span className="submit-score-error">{errorMessage}</span>
      )}
      {isConfirmedSame && (
        <span className="submit-score-confirmed">Score confirmed on-chain ✓</span>
      )}
    </div>
  );
}
