interface Props {
  score: number;
  bestScore: number;
  combo: number;
  streak: number;
}

function ScoreBlock({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="score-block">
      <span className="score-label">{label}</span>
      <span className="score-value">{value}</span>
    </div>
  );
}

export default function ScoreBoard({ score, bestScore, combo, streak }: Props) {
  return (
    <div className="score-board" aria-label="Score display">
      <div className="score-board-left">
        <ScoreBlock label="SCORE" value={score} />
        <ScoreBlock label="BEST" value={bestScore} />
      </div>
      <div className="score-board-right">
        <ScoreBlock label="COMBO" value={combo} />
        <ScoreBlock label="STREAK" value={streak} />
      </div>
    </div>
  );
}
