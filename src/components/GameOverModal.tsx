import ShareMenu from './ShareMenu.js';

type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

interface Props {
  score: number;
  bestScore: number;
  mode?: 0 | 1;
  level?: number;
  combo?: number;
  streak?: number;
  totalCleared?: number;
  totalMoves?: number;
  reason?: 'no-moves' | 'time-up';
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
  onSubmitScore?: () => void;
  submitStatus?: TxStatus;
  submitError?: { message: string } | null;
}

export default function GameOverModal({
  score, bestScore, mode, level, combo, streak = 0, totalCleared, totalMoves,
  reason, onPlayAgain, onViewLeaderboard, onSubmitScore, submitStatus = 'idle', submitError,
}: Props) {
  const isTimeUp = reason === 'time-up';
  // bestScore di sini adalah bestAtStart (rekor SEBELUM run ini). Pakai '>'
  // bukan '>=': skor yang cuma menyamai rekor bukan rekor baru.
  const isNewBest = score > bestScore && score > 0;
  const isSubmitting = submitStatus === 'pending' || submitStatus === 'confirming';
  const isSubmitted = submitStatus === 'success';

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="panel">
        <div className="landing-badge" style={{ margin: '0 auto 0.75rem' }}>
          <span className="dot" />
          {isTimeUp ? "TIME'S UP" : 'GAME OVER'}
        </div>
        <h1 style={{ marginBottom: '0.25rem' }}>
          {isNewBest ? '🏆 NEW BEST!' : 'BLOCK BLAST COMPLETE'}
        </h1>
        <h2>{isTimeUp ? '⏰ Out of time' : '💀 No moves left'}</h2>

        {mode === 1 && level != null && (
          <div
            style={{
              fontSize: 'clamp(0.75rem, 3.6vw, 0.875rem)',
              color: 'var(--base-bright)',
              margin: '0.25rem 0 0',
              letterSpacing: '0.12em',
            }}
          >
            LEVEL {level}
          </div>
        )}

        <div className="final-score">
          {score.toLocaleString()}
        </div>
        <p className="final-score-label">FINAL SCORE</p>

        <div className="best-score">
          {isNewBest ? '🎉 NEW BEST!' : `BEST: ${bestScore.toLocaleString()}`}
        </div>

        {/* Detailed stats */}
        <div className="game-over-stats">
          {totalMoves != null && (
            <div className="stat-row">
              <span className="stat-label">MOVES</span>
              <span className="stat-value">{totalMoves}</span>
            </div>
          )}
          {combo != null && combo > 0 && (
            <div className="stat-row">
              <span className="stat-label">MAX COMBO</span>
              <span className="stat-value stat-combo">{combo}x</span>
            </div>
          )}
          {totalCleared != null && totalCleared > 0 && (
            <div className="stat-row">
              <span className="stat-label">CELLS CLEARED</span>
              <span className="stat-value">{totalCleared}</span>
            </div>
          )}
        </div>

        {/* User-initiated on-chain score submit — contract reverts on score 0,
            so the button is hidden unless the score is positive */}
        {onSubmitScore && score > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, margin: '0.75rem 0 0.25rem' }}>
            <button
              className="primary"
              onClick={onSubmitScore}
              disabled={isSubmitting || isSubmitted}
              style={{ fontSize: 12, padding: '8px 20px' }}
            >
              {isSubmitting
                ? '⏳ SUBMITTING...'
                : isSubmitted
                  ? '✅ SCORE SUBMITTED'
                  : '📤 SUBMIT SCORE ON-CHAIN'}
            </button>
            {submitStatus === 'error' && submitError && (
              <span style={{ fontSize: 10, color: 'var(--danger)' }}>
                {submitError.message}
              </span>
            )}
          </div>
        )}

        <div className="landing-actions" style={{ marginTop: '0.5rem' }}>
          <button className="primary" onClick={onPlayAgain}>
            PLAY AGAIN
          </button>
          <button className="secondary" onClick={onViewLeaderboard}>
            LEADERBOARD
          </button>
        </div>

        <ShareMenu score={score} streak={streak} mode={mode} level={level} />
      </div>
    </div>
  );
}
