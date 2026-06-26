import { useState, useCallback, useMemo, useRef } from 'react';
import { generateTrayBatch, generatePiece } from '../lib/game/generator.js';
import type { BlockPiece } from '../lib/game/types.js';

export function useBlockGenerator(): {
  pieces: (BlockPiece | null)[];
  regenerate: (level?: number) => void;
  markUsed: (id: string, level?: number) => void;
  clearAll: () => void;
} {
  const [pieces, setPieces] = useState<(BlockPiece | null)[]>(() => generateTrayBatch());
  const levelRef = useRef(1);

  const regenerate = useCallback((level?: number) => {
    const lv = level ?? levelRef.current;
    if (level !== undefined) levelRef.current = level;
    setPieces(generateTrayBatch(lv));
  }, []);

  const markUsed = useCallback((id: string, level?: number) => {
    const lv = level ?? levelRef.current;
    setPieces((curr) => {
      const updated = curr.map((p) => (p?.id === id ? null : p));
      const emptyIndex = updated.findIndex((p) => p === null);
      if (emptyIndex !== -1) {
        updated[emptyIndex] = generatePiece(lv);
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
