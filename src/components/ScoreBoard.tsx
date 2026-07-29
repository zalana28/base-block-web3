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

function ScoreBlock({
  label, value, bump, valueClass, children,
}: {
  label: string;
  value: number | string;
  bump?: boolean;
  valueClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="score-block">
      <span className="score-label">{label}</span>
      <span className={`score-value${bump ? ' bump' : ''}${valueClass ? ` ${valueClass}` : ''}`}>{value}</span>
      {children}
    </div>
  );
}

export default function ScoreBoard({
  score, bestScore, combo, streak, mode, level, targetScore, timeLeft,
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

  // Streak feedback (Area 2 item 4): pulse green on increase, red
  // "STREAK LOST" overlay on reset to 0. Overlays only — no layout shift.
  const prevStreak = useRef(streak);
  const [streakFx, setStreakFx] = useState<'up' | 'lost' | null>(null);
  useEffect(() => {
    if (streak > prevStreak.current) {
      setStreakFx('up');
      const t = setTimeout(() => setStreakFx(null), 400);
      prevStreak.current = streak;
      return () => clearTimeout(t);
    }
    if (prevStreak.current > 0 && streak === 0) {
      setStreakFx('lost');
      const t = setTimeout(() => setStreakFx(null), 400);
      prevStreak.current = streak;
      return () => clearTimeout(t);
    }
    prevStreak.current = streak;
  }, [streak]);

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
          <ScoreBlock
            label="CLEAR STREAK"
            value={`${streak}x`}
            valueClass={streakFx === 'up' ? 'is-up' : streakFx === 'lost' ? 'is-lost' : undefined}
          >
            {streakFx === 'lost' && (
              <span className="streak-lost-label" aria-live="polite">STREAK LOST</span>
            )}
          </ScoreBlock>
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
