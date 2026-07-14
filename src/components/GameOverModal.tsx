import SubmitScoreButton from './SubmitScoreButton.js';

interface Props {
  score: number;
  bestScore: number;
  mode?: 0 | 1;
  level?: number;
  combo?: number;
  totalCleared?: number;
  totalMoves?: number;
  reason?: 'no-moves' | 'time-up';
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
  onSubmitScore?: () => void;
  txStatus?: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  txError?: { message: string } | null;
  lastSubmittedScore?: number | null;
}

export default function GameOverModal({
  score, bestScore, mode, level, combo, totalCleared, totalMoves,
  reason, onPlayAgain, onViewLeaderboard,
  onSubmitScore, txStatus = 'idle', txError = null, lastSubmittedScore = null,
}: Props) {
  const isTimeUp = reason === 'time-up';
  const isNewBest = score >= bestScore && score > 0;

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

        <div className="landing-actions" style={{ marginTop: '0.5rem' }}>
          <button className="primary" onClick={onPlayAgain}>
            PLAY AGAIN
          </button>
          <button className="secondary" onClick={onViewLeaderboard}>
            LEADERBOARD
          </button>
        </div>

        {onSubmitScore && (
          <SubmitScoreButton
            score={score}
            status={txStatus}
            lastSubmittedScore={lastSubmittedScore}
            errorMessage={txError?.message ?? null}
            onSubmit={onSubmitScore}
          />
        )}
      </div>
    </div>
  );
}
