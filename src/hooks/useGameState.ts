import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createGrid, placeBlock, clearLines, canPlace } from '../lib/game/grid.js';
import { canPlaceAnyOfPieces } from '../lib/game/validator.js';
import { calculateScore } from '../lib/game/scoring.js';
import type { BlockPiece, GameState, Grid, Position } from '../lib/game/types.js';
import { useScore } from './useScore.js';
import { useBlockGenerator } from './useBlockGenerator.js';
import { sfxPlace, sfxClear, sfxCombo, sfxLevelUp, sfxGameOver } from '../lib/audio.js';
import { haptic, vibrate } from '../lib/haptics.js';

interface Actions {
  startGame: (mode?: 0 | 1) => void;
  placePiece: (piece: BlockPiece, pos: { row: number; col: number }) => boolean;
  isGameOver: () => boolean;
  resetGame: () => void;
  endGame: () => void;
}

const LEVEL_THRESHOLD = 500;
const ARCADE_TIME_PER_LEVEL = 90;

// Helper: get absolute cell positions from a piece placement
function getPlacedCells(piece: BlockPiece, pos: { row: number; col: number }): Position[] {
  const cells: Position[] = [];
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) cells.push({ row: pos.row + r, col: pos.col + c });
    }
  }
  return cells;
}

export function useGameState(
  paused = false,
  accountScope = 'anon',
): [GameState, Actions] {
  // Dideklarasikan sebelum useScore supaya scope penyimpanan bisa memuat
  // mode. Urutan hook tetap stabil, jadi ini aman.
  const [mode, setMode] = useState<0 | 1>(0);
  const { score, bestScore, bestAtStart, addScore, reset: resetScore } = useScore(
    `${accountScope}:${mode}`,
  );
  const { pieces, nextPieces, regenerate, markUsed } = useBlockGenerator();

  const [grid, setGrid] = useState<Grid>(createGrid());
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalCleared, setTotalCleared] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [phase, setPhase] = useState<'menu' | 'playing' | 'over'>('menu');
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(ARCADE_TIME_PER_LEVEL);
  const prevLevelRef = useRef(1);

  // Clearing animation state
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [clearingCols, setClearingCols] = useState<number[]>([]);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Placement animation
  const [lastPlacedCells, setLastPlacedCells] = useState<Position[]>([]);
  const placedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visiblePieces = useMemo(
    () => pieces.filter((p): p is BlockPiece => p !== null),
    [pieces],
  );

  const targetScore = useMemo(() => level * LEVEL_THRESHOLD, [level]);

  const gameState: GameState = useMemo(
    () => ({
      grid, pieces, nextPieces, score, bestScore, bestAtStart,
      combo, maxCombo, streak, totalCleared, totalMoves, phase,
      mode, level, targetScore, timeLeft,
      clearingRows, clearingCols, lastPlacedCells,
    }),
    [grid, pieces, nextPieces, score, bestScore, bestAtStart, combo, maxCombo, streak, totalCleared, totalMoves, phase, mode, level, targetScore, timeLeft, clearingRows, clearingCols, lastPlacedCells],
  );

  const startGame = useCallback((initialMode: 0 | 1 = 0) => {
    // Clean up timers
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (placedTimerRef.current) clearTimeout(placedTimerRef.current);

    setGrid(createGrid());
    resetScore();
    setMode(initialMode);
    setLevel(1);
    prevLevelRef.current = 1;
    regenerate(1);
    setTimeLeft(ARCADE_TIME_PER_LEVEL);
    setCombo(0); setMaxCombo(0); setStreak(0); setTotalCleared(0); setTotalMoves(0);
    setClearingRows([]); setClearingCols([]);
    setLastPlacedCells([]);
    setPhase('playing');
  }, [resetScore, regenerate]);

  // Arcade countdown timer — paused flag freezes the countdown (H3)
  useEffect(() => {
    if (phase !== 'playing' || mode !== 1 || paused) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, mode, paused]);

  useEffect(() => {
    if (mode === 1 && timeLeft <= 0 && phase === 'playing') {
      setPhase('over');
    }
  }, [timeLeft, mode, phase]);

  const placePiece = useCallback(
    (piece: BlockPiece, pos: { row: number; col: number }): boolean => {
      if (phase !== 'playing') return false;
      // Gate input while a clear animation is in flight (H2): the deferred
      // grid update would otherwise overwrite this placement after scoring it.
      if (clearingRows.length > 0 || clearingCols.length > 0) return false;
      if (!canPlace(grid, piece.shape, pos)) return false;

      // ── Haptic on place ──────────────────────
      haptic.place();
      sfxPlace();

      // Track placed cells for placement animation
      const placedCells = getPlacedCells(piece, pos);
      setLastPlacedCells(placedCells);
      if (placedTimerRef.current) clearTimeout(placedTimerRef.current);
      placedTimerRef.current = setTimeout(() => setLastPlacedCells([]), 300);

      const afterPlace = placeBlock(grid, piece.shape, piece.color, pos);
      const { grid: afterClear, result } = clearLines(afterPlace);
      const linesCleared = result.clearedRows.length + result.clearedCols.length;

      const placedCellsCount = piece.shape.flat().filter(Boolean).length;
      const points = calculateScore(
        placedCellsCount, result.cellsCleared, result.isCombo, linesCleared, streak,
      );

      // ── If lines cleared, show animation first, then apply ──
      if (linesCleared > 0) {
        // Haptic + SFX
        haptic.clear();
        sfxClear();

        // Show clearing animation
        setClearingRows(result.clearedRows);
        setClearingCols(result.clearedCols);

        // Clear animation runs for 320ms, then apply grid change
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          setGrid(afterClear);
          setClearingRows([]);
          setClearingCols([]);
          clearTimerRef.current = null;
        }, 320);

        setStreak((s) => s + 1);
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        setTotalCleared((tc) => tc + result.cellsCleared);

        // Combo juice on streaks
        if (nextCombo >= 2) {
          sfxCombo(nextCombo);
          haptic.combo(nextCombo);
        }
      } else {
        // No lines cleared — apply immediately
        setGrid(afterClear);
        setStreak(0);
        setCombo(0);
      }

      addScore(points);
      markUsed(piece.id, level);
      setTotalMoves((m) => m + 1);

      // Arcade level-up check — compute from post-move score so leveling
      // registers on the scoring move itself (L1)
      if (mode === 1) {
        const newLevel = Math.floor((score + points) / LEVEL_THRESHOLD) + 1;
        if (newLevel > prevLevelRef.current) {
          prevLevelRef.current = newLevel;
          setLevel(newLevel);
          setTimeLeft(ARCADE_TIME_PER_LEVEL);
          sfxLevelUp();
          vibrate(40);
        }
      }

      return true;
    },
    [phase, grid, streak, combo, addScore, markUsed, mode, score, level, clearingRows, clearingCols],
  );

  // ── Game-over juice: SFX + haptic once on transition to 'over' ──
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase === 'over' && prevPhaseRef.current !== 'over') {
      sfxGameOver();
      haptic.gameOver();
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // ── Delayed game-over check ───────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    if (visiblePieces.length === 0) return;
    const delay = clearingRows.length > 0 || clearingCols.length > 0 ? 380 : 120;
    const timer = setTimeout(() => {
      if (!canPlaceAnyOfPieces(grid, visiblePieces)) {
        setPhase('over');
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [visiblePieces, grid, phase, clearingRows, clearingCols]);

  // Bersihkan semua timer saat unmount — sebelumnya hanya dibersihkan di
  // startGame/resetGame, jadi unmount di tengah animasi meninggalkan
  // setTimeout yang menembak setState ke komponen yang sudah hilang.
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (placedTimerRef.current) clearTimeout(placedTimerRef.current);
    };
  }, []);

  const isGameOver = useCallback((): boolean => {
    if (phase !== 'playing') return false;
    if (visiblePieces.length === 0) return false;
    return !canPlaceAnyOfPieces(grid, visiblePieces);
  }, [phase, grid, visiblePieces]);

  const resetGame = useCallback(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (placedTimerRef.current) clearTimeout(placedTimerRef.current);
    setPhase('menu');
  }, []);

  const endGame = useCallback(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (placedTimerRef.current) clearTimeout(placedTimerRef.current);
    setPhase('over');
  }, []);

  const actions = useMemo(
    () => ({ startGame, placePiece, isGameOver, resetGame, endGame }),
    [startGame, placePiece, isGameOver, resetGame, endGame],
  );

  return [gameState, actions];
}
