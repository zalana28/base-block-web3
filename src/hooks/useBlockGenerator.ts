import { useState, useCallback } from 'react';
import { generateThreePieces } from '../lib/game/generator.js';
import type { BlockPiece } from '../lib/game/types.js';

export function useBlockGenerator(): {
  pieces: (BlockPiece | null)[];
  regenerate: () => void;
  markUsed: (id: string) => void;
  clearAll: () => void;
} {
  const [pieces, setPieces] = useState<(BlockPiece | null)[]>(() => generateThreePieces());

  const regenerate = useCallback(() => {
    setPieces(generateThreePieces());
  }, []);

  const markUsed = useCallback((id: string) => {
    setPieces((prev) => prev.map((p) => (p?.id === id ? null : p)));
  }, []);

  const clearAll = useCallback(() => {
    setPieces([null, null, null]);
  }, []);

  return { pieces, regenerate, markUsed, clearAll };
}