import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createGrid, placeBlock, clearLines, canPlace } from '../lib/game/grid.js';
import { canPlaceAnyOfPieces } from '../lib/game/validator.js';
import { calculateScore } from '../lib/game/scoring.js';
import type { BlockPiece, GameState, Grid } from '../lib/game/types.js';
import { useScore } from './useScore.js';
import { useBlockGenerator } from './useBlockGenerator.js';

interface Actions {
  startGame: () => void;
  placePiece: (piece: BlockPiece, pos: { row: number; col: number }) => boolean;
  isGameOver: () => boolean;
  resetGame: () => void;
}

export function useGameState(): [GameState, Actions] {
  const { score, bestScore, addScore, reset: resetScore } = useScore();
  const { pieces, regenerate, markUsed } = useBlockGenerator();

  const [grid, setGrid] = useState<Grid>(createGrid());
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalCleared, setTotalCleared] = useState(0);
  const [phase, setPhase] = useState<'menu' | 'playing' | 'over'>('menu');

  const justRegeneratedRef = useRef(false);

  const visiblePieces = useMemo(
    () => pieces.filter((p): p is BlockPiece => p !== null),
    [pieces],
  );

  const gameState: GameState = useMemo(
    () => ({
      grid,
      pieces, // length 3, null = sudah dipakai
      score,
      bestScore,
      combo, maxCombo, streak, totalCleared, phase,
    }),
    [grid, pieces, score, bestScore, combo, maxCombo, streak, totalCleared, phase],
  );

  const startGame = useCallback(() => {
    setGrid(createGrid());
    resetScore();
    regenerate();
    setCombo(0); setMaxCombo(0); setStreak(0); setTotalCleared(0);
    setPhase('playing');
  }, [resetScore, regenerate]);

  const placePiece = useCallback(
    (piece: BlockPiece, pos: { row: number; col: number }): boolean => {
      if (phase !== 'playing') return false;
      if (!canPlace(grid, piece.shape, pos)) return false;

      const afterPlace = placeBlock(grid, piece.shape, piece.color, pos);
      const { grid: afterClear, result } = clearLines(afterPlace);
      setGrid(afterClear);

      const placedCells = piece.shape.flat().filter(Boolean).length;
      const linesCleared = result.clearedRows.length + result.clearedCols.length;
      const points = calculateScore(
        placedCells, result.cellsCleared, result.isCombo, linesCleared, streak,
      );
      addScore(points);

      if (linesCleared > 0) {
        setStreak((s) => s + 1);
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        setTotalCleared((tc) => tc + result.cellsCleared);
      } else {
        setStreak(0);
        setCombo(0);
      }

      markUsed(piece.id);

      // Auto-refill sudah handle di useBlockGenerator.markUsed
      // Cek game over dilakukan di useEffect pas pieces update

      return true;
    },
    [phase, grid, streak, combo, addScore, markUsed],
  );

  // Setelah regenerasi batch, cek apakah ada yang bisa ditempatkan
  useEffect(() => {
    if (phase !== 'playing') return;
    if (!justRegeneratedRef.current) return;
    if (visiblePieces.length === 0) return;
    justRegeneratedRef.current = false;
    if (!canPlaceAnyOfPieces(grid, visiblePieces)) {
      setPhase('over');
    }
  }, [visiblePieces, grid, phase]);

  // Cek game over setiap pieces update (termasuk setelah auto-refill)
  useEffect(() => {
    if (phase !== 'playing') return;
    if (visiblePieces.length === 0) return;
    // Debounce cek supaya ga bentrok dengan placement animation
    const timer = setTimeout(() => {
      if (!canPlaceAnyOfPieces(grid, visiblePieces)) {
        setPhase('over');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [visiblePieces, grid, phase]);

  const isGameOver = useCallback((): boolean => {
    if (phase !== 'playing') return false;
    if (visiblePieces.length === 0) return false;
    return !canPlaceAnyOfPieces(grid, visiblePieces);
  }, [phase, grid, visiblePieces]);

  const resetGame = useCallback(() => { setPhase('menu'); }, []);

  const actions = useMemo(
    () => ({ startGame, placePiece, isGameOver, resetGame }),
    [startGame, placePiece, isGameOver, resetGame],
  );

  return [gameState, actions];
}
