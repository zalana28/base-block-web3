interface Props {
  score: number;
  bestScore: number;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
}

export default function GameOverModal({
  score,
  bestScore,
  onPlayAgain,
  onViewLeaderboard,
}: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Game over">
      <div className="panel">
        <div className="hero-mascot">💀</div>
        <h1>GAME OVER</h1>
        <h2>BLOCK BLAST COMPLETE</h2>

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