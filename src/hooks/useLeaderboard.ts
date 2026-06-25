import { useMemo } from 'react';

export function useLeaderboard(): {
  entries: { name: string; score: number; level: number }[];
  isLoading: boolean;
  source: string;
} {
  const entries = useMemo(() => [], []);
  return { entries, isLoading: false, source: 'Local scores' };
}