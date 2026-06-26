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
        <div className="hero-mascot">{isTimeUp ? '⏰' : '💀'}</div>
        <h1>{isTimeUp ? "TIME'S UP" : 'GAME OVER'}</h1>
        <h2>BLOCK BLAST COMPLETE</h2>

        {mode === 1 && level != null && (
          <div
            style={{
              fontSize: '14px',
              color: 'var(--base-bright)',
              margin: '8px 0 0',
              letterSpacing: '2px',
            }}
          >
            LEVEL {level}
          </div>
        )}

        <div
          style={{
            fontSize: '36px',
            color: 'var(--frog)',
            textShadow: '0 0 12px var(--frog-glow)',
            margin: '16px 0 8px',
            letterSpacing: '2px',
          }}
        >
          {score.toLocaleString()}
        </div>
        <p style={{ margin: '0 0 20px' }}>FINAL SCORE</p>

        <div
          style={{
            fontSize: '11px',
            color: 'var(--base-bright)',
            marginBottom: '20px',
          }}
        >
          BEST: {bestScore.toLocaleString()}
        </div>

        <button className="primary" onClick={onPlayAgain}>
          PLAY AGAIN
        </button>
        <button className="secondary" onClick={onViewLeaderboard}>
          LEADERBOARD
        </button>
      </div>
    </div>
  );
}