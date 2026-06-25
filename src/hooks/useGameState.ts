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
  const scoreHooks = useScore();
  const generator = useBlockGenerator();

  const [grid, setGrid] = useState<Grid>(createGrid());
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalCleared, setTotalCleared] = useState(0);
  const [phase, setPhase] = useState<'menu' | 'playing' | 'over'>('menu');

  const justRegeneratedRef = useRef(false);

  const visiblePieces = useMemo(
    () => generator.pieces.filter((p): p is BlockPiece => p !== null),
    [generator.pieces],
  );

  const gameState: GameState = useMemo(
    () => ({
      grid,
      pieces: generator.pieces, // length 3, null = sudah dipakai
      score: scoreHooks.score,
      bestScore: scoreHooks.bestScore,
      combo, maxCombo, streak, totalCleared, phase,
    }),
    [grid, generator.pieces, scoreHooks.score, scoreHooks.bestScore, combo, maxCombo, streak, totalCleared, phase],
  );

  const startGame = useCallback(() => {
    setGrid(createGrid());
    scoreHooks.reset();
    generator.regenerate();
    setCombo(0); setMaxCombo(0); setStreak(0); setTotalCleared(0);
    setPhase('playing');
  }, [scoreHooks, generator]);

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
      scoreHooks.addScore(points);

      if (linesCleared > 0) {
        setStreak((s) => s + 1);
        setCombo((c) => {
          const next = c + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });
        setTotalCleared((tc) => tc + result.cellsCleared);
      } else {
        setStreak(0);
        setCombo(0);
      }

      generator.markUsed(piece.id);

      // Cek apakah ini blok terakhir di batch
      const remainingAfter = generator.pieces.filter(
        (p): p is BlockPiece => p !== null && p.id !== piece.id,
      );

      if (remainingAfter.length === 0) {
        // Batch habis → regenerate, cek game over di useEffect setelah pieces baru muncul
        justRegeneratedRef.current = true;
        generator.regenerate();
      } else {
        // Masih ada blok tersisa → cek apakah masih bisa ditempatkan
        if (!canPlaceAnyOfPieces(afterClear, remainingAfter)) {
          setPhase('over');
        }
      }

      return true;
    },
    [phase, grid, streak, scoreHooks, generator],
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

  const isGameOver = useCallback((): boolean => {
    if (phase !== 'playing') return false;
    if (visiblePieces.length === 0) return false;
    return !canPlaceAnyOfPieces(grid, visiblePieces);
  }, [phase, grid, visiblePieces]);

  const resetGame = useCallback(() => { setPhase('menu'); }, []);

  return [gameState, { startGame, placePiece, isGameOver, resetGame }];
}
