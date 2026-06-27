import { useState, useCallback, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'base-block-best';

export function useScore(): {
  score: number;
  bestScore: number;
  addScore: (points: number) => void;
  reset: () => void;
} {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v ? parseInt(v, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      try { localStorage.setItem(STORAGE_KEY, String(score)); } catch { /* ignore storage failure */ }
    }
  }, [score, bestScore]);

  const addScore = useCallback((points: number) => {
    setScore((s) => s + points);
  }, []);

  const reset = useCallback(() => { setScore(0); }, []);

  return useMemo(
    () => ({ score, bestScore, addScore, reset }),
    [score, bestScore, addScore, reset],
  );
}
