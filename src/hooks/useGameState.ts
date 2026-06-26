import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createGrid, placeBlock, clearLines, canPlace } from '../lib/game/grid.js';
import { canPlaceAnyOfPieces } from '../lib/game/validator.js';
import { calculateScore } from '../lib/game/scoring.js';
import type { BlockPiece, GameState, Grid } from '../lib/game/types.js';
import { useScore } from './useScore.js';
import { useBlockGenerator } from './useBlockGenerator.js';

interface Actions {
  startGame: (mode?: 0 | 1) => void;
  placePiece: (piece: BlockPiece, pos: { row: number; col: number }) => boolean;
  isGameOver: () => boolean;
  resetGame: () => void;
}

const LEVEL_THRESHOLD = 500;
const ARCADE_TIME_PER_LEVEL = 90;

function playLevelUpSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // audio unsupported
  }
}

export function useGameState(): [GameState, Actions] {
  const { score, bestScore, addScore, reset: resetScore } = useScore();
  const { pieces, nextPieces, regenerate, markUsed } = useBlockGenerator();

  const [grid, setGrid] = useState<Grid>(createGrid());
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalCleared, setTotalCleared] = useState(0);
  const [phase, setPhase] = useState<'menu' | 'playing' | 'over'>('menu');
  const [mode, setMode] = useState<0 | 1>(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(ARCADE_TIME_PER_LEVEL);
  const prevLevelRef = useRef(1);

  const justRegeneratedRef = useRef(false);

  const visiblePieces = useMemo(
    () => pieces.filter((p): p is BlockPiece => p !== null),
    [pieces],
  );

  const targetScore = useMemo(() => level * LEVEL_THRESHOLD, [level]);

  const gameState: GameState = useMemo(
    () => ({
      grid,
      pieces,
      nextPieces,
      score,
      bestScore,
      combo, maxCombo, streak, totalCleared, phase,
      mode,
      level,
      targetScore,
      timeLeft,
    }),
    [grid, pieces, nextPieces, score, bestScore, combo, maxCombo, streak, totalCleared, phase, mode, level, targetScore, timeLeft],
  );

  const startGame = useCallback((initialMode: 0 | 1 = 0) => {
    setGrid(createGrid());
    resetScore();
    setMode(initialMode);
    setLevel(1);
    prevLevelRef.current = 1;
    regenerate(1);
    setTimeLeft(ARCADE_TIME_PER_LEVEL);
    setCombo(0); setMaxCombo(0); setStreak(0); setTotalCleared(0);
    setPhase('playing');
  }, [resetScore, regenerate]);

  // Arcade countdown timer
  useEffect(() => {
    if (phase !== 'playing' || mode !== 1) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, mode]);

  useEffect(() => {
    if (mode === 1 && timeLeft <= 0 && phase === 'playing') {
      setPhase('over');
    }
  }, [timeLeft, mode, phase]);

  // Visual flash on level up
  const [levelFlash, setLevelFlash] = useState(false);
  useEffect(() => {
    if (levelFlash) {
      const t = setTimeout(() => setLevelFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [levelFlash]);

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

      markUsed(piece.id, level);

      // Arcade level-up check
      if (mode === 1) {
        const newLevel = Math.floor(score / LEVEL_THRESHOLD) + 1;
        if (newLevel > prevLevelRef.current) {
          prevLevelRef.current = newLevel;
          setLevel(newLevel);
          setTimeLeft(ARCADE_TIME_PER_LEVEL); // reset timer
          playLevelUpSound();
          setLevelFlash(true);
        }
      }

      return true;
    },
    [phase, grid, streak, combo, addScore, markUsed, mode, score, level],
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
