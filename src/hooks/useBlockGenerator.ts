import { useState, useCallback, useMemo } from 'react';
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
    setPieces((curr) => {
      const updated = curr.map((p) => (p?.id === id ? null : p));
      
      // FIX: Auto-refill individual slot yang kosong
      const emptyIndex = updated.findIndex((p) => p === null);
      if (emptyIndex !== -1) {
        // Generate 1 piece baru untuk slot kosong
        const newBatch = generateTrayBatch();
        updated[emptyIndex] = newBatch[0];
      }
      
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setPieces([null, null, null]);
  }, []);

  return useMemo(
    () => ({ pieces, regenerate, markUsed, clearAll }),
    [pieces, regenerate, markUsed, clearAll],
  );
}
