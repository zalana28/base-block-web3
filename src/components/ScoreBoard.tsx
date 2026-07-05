import { useRef, useEffect, useState } from 'react';

interface Props {
  score: number;
  bestScore: number;
  combo: number;
  streak: number;
  mode?: 0 | 1;
  level?: number;
  targetScore?: number;
  timeLeft?: number;
}

function ScoreBlock({ label, value, bump }: { label: string; value: number | string; bump?: boolean }) {
  return (
    <div className="score-block">
      <span className="score-label">{label}</span>
      <span className={`score-value${bump ? ' bump' : ''}`}>{value}</span>
    </div>
  );
}

export default function ScoreBoard({
  score,
  bestScore,
  combo,
  streak,
  mode,
  level,
  targetScore,
  timeLeft,
}: Props) {
  const [scoreBump, setScoreBump] = useState(false);
  const prevScore = useRef(score);

  useEffect(() => {
    if (score !== prevScore.current && score > prevScore.current) {
      setScoreBump(true);
      const t = setTimeout(() => setScoreBump(false), 250);
      return () => clearTimeout(t);
    }
    prevScore.current = score;
  }, [score]);

  const progress = targetScore && targetScore > 0
    ? Math.min(score / targetScore, 1)
    : 0;

  const timeColor =
    timeLeft != null && timeLeft <= 10
      ? 'var(--danger)'
      : timeLeft != null && timeLeft <= 30
        ? 'var(--warning)'
        : 'var(--frog)';

  return (
    <div className="score-board" aria-label="Score display">
      <div className="score-board-row">
        <div className="score-board-left">
          <ScoreBlock label="SCORE" value={score} bump={scoreBump} />
          <ScoreBlock label="BEST" value={bestScore} />
        </div>
        <div className="score-board-right">
          <ScoreBlock label="COMBO" value={combo} />
          <ScoreBlock label="STREAK" value={streak} />
          {mode === 1 && level != null && (
            <ScoreBlock label="LEVEL" value={level} />
          )}
        </div>
      </div>

      {mode === 1 && (
        <div className="time-target-bar">
          <div className="time-target-labels">
            <span>TARGET {targetScore}</span>
            <span style={{ color: timeLeft != null ? timeColor : undefined }}>
              ⏱ {timeLeft ?? 0}s
            </span>
          </div>
          <div className="time-target-track">
            <div
              className="time-target-fill"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
