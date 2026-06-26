interface Props {
  score: number;
  bestScore: number;
  mode?: 0 | 1;
  level?: number;
  reason?: 'no-moves' | 'time-up';
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
}

export default function GameOverModal({
  score,
  bestScore,
  mode,
  level,
  reason,
  onPlayAgain,
  onViewLeaderboard,
}: Props) {
  const isTimeUp = reason === 'time-up';
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="panel">
        <div className="landing-badge" style={{ margin: '0 auto 0.75rem' }}>
          <span className="dot" />
          {isTimeUp ? "TIME'S UP" : 'GAME OVER'}
        </div>
        <h1 style={{ marginBottom: '0.25rem' }}>BLOCK BLAST COMPLETE</h1>
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
          BEST: {bestScore.toLocaleString()}
        </div>

        <div className="landing-actions" style={{ marginTop: '0.5rem' }}>
          <button className="primary" onClick={onPlayAgain}>
            PLAY AGAIN
          </button>
          <button className="secondary" onClick={onViewLeaderboard}>
            LEADERBOARD
          </button>
        </div>
      </div>
    </div>
  );
}
