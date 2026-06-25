import { useState, useCallback, useMemo } from 'react';
import { createGrid, placeBlock, clearLines, canPlace } from '../lib/game/grid.js';
import { canPlaceAnyOfPieces } from '../lib/game/validator.js';
import { calculateScore } from '../lib/game/scoring.js';
import type { BlockPiece, GameState, Grid } from '../lib/game/types.js';
import { useScore } from './useScore.js';
import { useBlockGenerator } from './useBlockGenerator.js';

export function useGameState(): [GameState, {
  startGame: () => void;
  placePiece: (piece: BlockPiece, pos: { row: number; col: number }) => boolean;
  isGameOver: () => boolean;
  resetGame: () => void;
}] {
  const scoreHooks = useScore();
  const generator = useBlockGenerator();

  const [grid, setGrid] = useState<Grid>(createGrid());
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalCleared, setTotalCleared] = useState(0);
  const [phase, setPhase] = useState<'menu' | 'playing' | 'over'>('menu');

  const gameState: GameState = useMemo(() => ({
    grid,
    pieces: generator.pieces.filter((p): p is BlockPiece => p !== null) as BlockPiece[],
    score: scoreHooks.score,
    bestScore: scoreHooks.bestScore,
    combo,
    maxCombo,
    streak,
    totalCleared,
    phase,
  }), [grid, generator.pieces, scoreHooks.score, scoreHooks.bestScore, combo, maxCombo, streak, totalCleared, phase]);

  const startGame = useCallback(() => {
    setGrid(createGrid());
    scoreHooks.reset();
    generator.regenerate();
    setCombo(0);
    setMaxCombo(0);
    setStreak(0);
    setTotalCleared(0);
    setPhase('playing');
  }, [scoreHooks, generator]);

  const isGameOver = useCallback((): boolean => {
    if (phase !== 'playing') return false;
    const remaining = generator.pieces.filter((p): p is BlockPiece => p !== null);
    if (remaining.length === 0) return false;
    return !canPlaceAnyOfPieces(grid, remaining);
  }, [phase, grid, generator.pieces]);

  const placePiece = useCallback((piece: BlockPiece, pos: { row: number; col: number }): boolean => {
    if (phase !== 'playing') return false;

    if (!canPlace(grid, piece.shape, pos)) return false;

    // Place the block
    const afterPlace = placeBlock(grid, piece.shape, piece.color, pos);

    // Clear lines
    const { grid: afterClear, result } = clearLines(afterPlace);
    setGrid(afterClear);

    // Count placed cells
    const placedCells = piece.shape.flat().filter(Boolean).length;

    const currentStreak = streak;
    const linesCleared = result.clearedRows.length + result.clearedCols.length;
    const points = calculateScore(
      placedCells,
      result.cellsCleared,
      result.isCombo,
      linesCleared,
      currentStreak,
    );
    scoreHooks.addScore(points);

    // Update combo and streak
    if (result.clearedRows.length > 0 || result.clearedCols.length > 0) {
      const newStreak = currentStreak + 1;
      const newCombo = combo + 1;
      setStreak(newStreak);
      setCombo(newCombo);
      setMaxCombo((m) => Math.max(m, newCombo));
      setTotalCleared((tc) => tc + result.cellsCleared);
    } else {
      setStreak(0);
      setCombo(0);
    }

    // Mark piece as used
    generator.markUsed(piece.id);

    // Check if all pieces used — regenerate
    const afterMarkUsed = generator.pieces.map((p) => (p?.id === piece.id ? null : p));
    if (afterMarkUsed.filter((p) => p !== null).length === 0) {
      generator.regenerate();
    }

    // Check game over using current state (before potential regeneration)
    const remaining = afterMarkUsed.filter((p): p is BlockPiece => p !== null);
    if (remaining.length === 0 || !canPlaceAnyOfPieces(afterClear, remaining)) {
      setPhase('over');
    }

    return true;
  }, [phase, grid, streak, combo, scoreHooks, generator]);

  const resetGame = useCallback(() => {
    setPhase('menu');
  }, []);

  return [gameState, { startGame, placePiece, isGameOver, resetGame }];
}