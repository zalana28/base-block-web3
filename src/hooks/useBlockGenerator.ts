import { useState, useCallback } from 'react';
import { generateTrayBatch } from '../lib/game/generator.js';
import type { BlockPiece } from '../lib/game/types.js';

export function useBlockGenerator(): {
  pieces: (BlockPiece | null)[];
  regenerate: () => void;
  markUsed: (id: string) => void;
  clearAll: () => void;
} {
  const [pieces, setPieces] = useState<(BlockPiece | null)[]>(() => generateTrayBatch());

  const regenerate = useCallback(() => {
    setPieces(generateTrayBatch());
  }, []);

  const markUsed = useCallback((id: string) => {
    setPieces((curr) => curr.map((p) => (p?.id === id ? null : p)));
  }, []);

  const clearAll = useCallback(() => {
    setPieces([null, null, null]);
  }, []);

  return { pieces, regenerate, markUsed, clearAll };
}
