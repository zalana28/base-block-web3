import { useState, useEffect, useCallback } from 'react';

const BEST_SCORE_KEY = 'base-block-best';

export function useScore(): {
  score: number;
  bestScore: number;
  addScore: (points: number) => void;
  reset: () => void;
} {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(BEST_SCORE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) setBestScore(parsed);
    }
  }, []);

  const addScore = useCallback((points: number) => {
    setScore((prev) => {
      const next = prev + points;
      setBestScore((currentBest) => {
        if (next > currentBest) {
          localStorage.setItem(BEST_SCORE_KEY, String(next));
          return next;
        }
        return currentBest;
      });
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setScore(0);
  }, []);

  return { score, bestScore, addScore, reset };
}