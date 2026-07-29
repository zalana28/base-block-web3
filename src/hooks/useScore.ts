import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

const STORAGE_PREFIX = 'base-block-best';

// Best score dipisah per wallet DAN per mode. Sebelumnya semuanya menumpuk
// di satu key global, jadi ganti wallet di device yang sama membuat user
// melihat rekor orang lain, dan rekor Classic bocor ke Arcade.
function storageKey(scope: string): string {
  return `${STORAGE_PREFIX}:${scope}`;
}

function readBest(scope: string): number {
  try {
    const v = localStorage.getItem(storageKey(scope));
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function useScore(scope = 'anon'): {
  score: number;
  bestScore: number;
  bestAtStart: number;
  addScore: (points: number) => void;
  setScoreValue: (n: number) => void;
  reset: () => void;
} {
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<number>(() => readBest(scope));
  // Snapshot rekor SEBELUM run berjalan. Tanpa ini, "NEW BEST!" praktis
  // selalu tampil: bestScore sudah dinaikkan ke score selama permainan,
  // jadi perbandingan score >= bestScore di layar game over selalu true.
  const [bestAtStart, setBestAtStart] = useState<number>(() => readBest(scope));
  const scopeRef = useRef(scope);

  // Ganti wallet atau ganti mode → muat ulang rekor untuk scope baru.
  useEffect(() => {
    if (scopeRef.current === scope) return;
    scopeRef.current = scope;
    const stored = readBest(scope);
    // Run yang sedang berjalan milik identitas LAMA. Tanpa setScore(0) di
    // sini, effect persist di bawah melihat score lama > bestScore baru
    // pada commit berikutnya dan menulis skor wallet A ke key wallet B —
    // persis kebocoran antar-wallet yang mau ditutup. React membatch
    // ketiganya jadi satu commit, jadi tidak ada render antara.
    setScore(0);
    setBestScore(stored);
    setBestAtStart(stored);
  }, [scope]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      try {
        localStorage.setItem(storageKey(scope), String(score));
      } catch {
        /* ignore storage failure */
      }
    }
  }, [score, bestScore, scope]);

  const addScore = useCallback((points: number) => {
    setScore((s) => s + points);
  }, []);

  const setScoreValue = useCallback((n: number) => {
    setScore(n);
  }, []);

  const reset = useCallback(() => {
    setScore(0);
    setBestAtStart(readBest(scopeRef.current));
  }, []);

  return useMemo(
    () => ({ score, bestScore, bestAtStart, addScore, setScoreValue, reset }),
    [score, bestScore, bestAtStart, addScore, setScoreValue, reset],
  );
}
