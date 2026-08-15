import { useState, useRef, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import type { BlockPiece, Grid, Position } from "./lib/game/types.js";
import { canPlace } from "./lib/game/grid.js";
import { useGameState } from "./hooks/useGameState.js";
import { useGameContract } from "./hooks/useGameContract.js";
import { useFinalScoreSubmit } from "./hooks/useFinalScoreSubmit.js";
import GameBoard from "./components/GameBoard.js";
import BlockTray from "./components/BlockTray.js";
import ScoreBoard from "./components/ScoreBoard.js";
import GameOverModal from "./components/GameOverModal.js";
import WalletGate from "./components/WalletGate.js";
import Leaderboard from "./components/Leaderboard.js";
import { invalidateLeaderboardCache } from "./hooks/useContractEvents.js";
import ComboEffect from "./components/ComboEffect.js";
import { FEATURES } from "./config/features.js";
import FloatingScore, { type FloatScoreItem } from "./components/FloatingScore.js";
import Particles, { type ParticleItem } from "./components/Particles.js";
import { initSoundPrefs, getSfxEnabled, setSfxEnabled, getMusicEnabled, setMusicEnabled, sfxDenied } from "./lib/audio.js";
import { haptic } from "./lib/haptics.js";

type AppPhase = "wallet" | "playing" | "over";
type GameOverReason = 'no-moves' | 'time-up';

// ── Board geometry ─────────────────────────────────────────────
// Pointer→cell mapping must account for the board's CSS padding and grid
// gap; using plain rect.width/8 drifts up to ~26px by the board edge.
// Measured from computed styles so future CSS tweaks don't skew the math.
interface BoardMetrics {
  left: number;  // x of the first cell's left edge (rect.left + padding)
  top: number;   // y of the first cell's top edge
  cell: number;  // rendered cell size in px
  pitch: number; // cell + gap — distance between cell origins
}

// Snap "magnetis": kalau sel tepat di bawah jari tidak valid, cari
// posisi valid terdekat dalam radius 1 sel. Tanpa ini pemain harus
// menaruh keping presisi piksel — penyebab utama rasa "susah nempel".
// Urutannya dari jarak terdekat, jadi hasilnya selalu yang paling wajar.
const SNAP_OFFSETS: Position[] = [
  { row: 0, col: 0 },
  { row: 0, col: -1 }, { row: 0, col: 1 },
  { row: -1, col: 0 }, { row: 1, col: 0 },
  { row: -1, col: -1 }, { row: -1, col: 1 },
  { row: 1, col: -1 }, { row: 1, col: 1 },
];

function snapToValid(grid: Grid, shape: BlockPiece['shape'], pos: Position): Position | null {
  for (const off of SNAP_OFFSETS) {
    const candidate = { row: pos.row + off.row, col: pos.col + off.col };
    if (canPlace(grid, shape, candidate)) return candidate;
  }
  return null;
}

// Area 4.2 nearest-center snap (~0.5 cell tolerance). Accept the closest valid
// placement only if it is within ~0.75 cell of the raw target cell.
function nearestCenterSnap(grid: Grid, shape: BlockPiece['shape'], pos: Position, cell: number, pitch: number): Position | null {
  const rows = shape.length;
  const cols = shape[0]?.length ?? 0;
  let best: Position | null = null;
  let bestDist = Infinity;
  for (let r = 0; r <= 8 - rows; r++) {
    for (let c = 0; c <= 8 - cols; c++) {
      if (!canPlace(grid, shape, { row: r, col: c })) continue;
      const d = Math.hypot((r - pos.row) * pitch, (c - pos.col) * pitch);
      if (d < bestDist) { bestDist = d; best = { row: r, col: c }; }
    }
  }
  if (best && bestDist <= pitch * 0.75) return best;
  return null;
}

function measureBoard(el: HTMLElement): BoardMetrics {
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const padX = parseFloat(cs.paddingLeft) || 0;
  const padY = parseFloat(cs.paddingTop) || 0;
  const gap = parseFloat(cs.columnGap) || 0;
  const cell = (rect.width - 2 * padX - 7 * gap) / 8;
  return { left: rect.left + padX, top: rect.top + padY, cell, pitch: cell + gap };
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("wallet");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('no-moves');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sfxOn, setSfxOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [hintCells, setHintCells] = useState<Position[] | null>(null);
  const [floatItems, setFloatItems] = useState<FloatScoreItem[]>([]);
  const [particleItems, setParticleItems] = useState<ParticleItem[]>([]);
  const [boardShake, setBoardShake] = useState<0 | 2 | 3>(0);
  const [boardFlash, setBoardFlash] = useState(false);
  const [highlightCells, setHighlightCells] = useState<Position[] | null>(null);
  const fxIdRef = useRef(0);

  const { submitScore, status: txStatus, error: txError, reset: txReset } = useGameContract();
  const {
    submitScore: submitFinalScore,
    status: finalStatus,
    error: finalError,
    reset: finalReset,
  } = useFinalScoreSubmit();
  const { address } = useAccount();

  // Reset state final-score submit saat wallet ganti, supaya status sukses
  // submit lama tidak terbawa ke game berikutnya (atau pemain lain).
  useEffect(() => {
    finalReset();
  }, [address, finalReset]);

  // Instant leaderboard cache invalidation on successful on-chain submit
  useEffect(() => {
    if (txStatus === 'success' || finalStatus === 'success') {
      invalidateLeaderboardCache();
    }
  }, [txStatus, finalStatus]);

  // Drag state — batched dalam satu object untuk hindari re-render cascade
  interface DragState {
    piece: BlockPiece | null;
    pos: { x: number; y: number } | null;
    ghost: Position | null;
    ghostValid: boolean;
  }
  const [dragState, setDragState] = useState<DragState>({
    piece: null,
    pos: null,
    ghost: null,
    ghostValid: false,
  });

  // Refs untuk drag state internal (tidak trigger render)
  const isDraggingRef = useRef(false);
  const dragPieceRef = useRef<BlockPiece | null>(null);
  const grabOffsetRef = useRef<{ row: number; col: number }>({ row: 0, col: 0 });
  const boardCellSizeRef = useRef(28);
  const boardMetricsRef = useRef<BoardMetrics | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  // Pemilik drag yang sedang jalan. Slot drag di sini cuma satu, jadi tanpa
  // penanda pointerId jari kedua bisa menyetir drag jari pertama: keping
  // salah mendarat di lokasi jari yang lain, dan keping satunya hilang.
  const dragPointerIdRef = useRef<number | null>(null);

  const [gameState, actions] = useGameState(isPaused, address ?? 'anon');
  const boardRef = useRef<HTMLDivElement>(null);

  // Cached board metrics — di-invalidate saat resize, dihitung lazy saat input
  const getBoardMetrics = useCallback((): BoardMetrics | null => {
    if (!boardMetricsRef.current && boardRef.current) {
      boardMetricsRef.current = measureBoard(boardRef.current);
      boardCellSizeRef.current = boardMetricsRef.current.cell;
    }
    return boardMetricsRef.current;
  }, []);

  // Input gate: block placement while a clear animation is in flight (H2)
  const isClearing =
    gameState.clearingRows.length > 0 || gameState.clearingCols.length > 0;

  // Ref untuk grid — hindari stale closure di RAF
  const gridRef = useRef(gameState.grid);
  useEffect(() => {
    gridRef.current = gameState.grid;
  }, [gameState.grid]);

  // Transition to game-over phase (score submit is user-initiated in GameOverModal)
  useEffect(() => {
    if (gameState.phase === "over") {
      setPhase("over");
      if (gameState.timeLeft <= 0 && gameState.mode === 1) {
        setGameOverReason('time-up');
      } else {
        setGameOverReason('no-moves');
      }
    }
  }, [gameState.phase, gameState.timeLeft, gameState.mode]);

  // Invalidate cached board metrics on resize biar cell mapping tetap akurat
  useEffect(() => {
    function onResize() {
      boardMetricsRef.current = null;
      boardCellSizeRef.current = 28;
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // ── Area 3 QoL handlers ────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (actions.undo()) setShowSettings(false);
  }, [actions]);

  const handleHint = useCallback(() => {
    const res = actions.requestHint();
    if (!res) return;
    setHintCells(res.cells);
    setShowSettings(false);
    window.setTimeout(() => setHintCells(null), 2000);
  }, [actions]);

  const toggleSfx = useCallback(() => {
    setSfxEnabled(!sfxOn);
    setSfxOn(!sfxOn);
  }, [sfxOn]);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(!musicOn);
    setMusicOn(!musicOn);
  }, [musicOn]);

  // Init persisted sound prefs once (Area 3.4).
  useEffect(() => {
    initSoundPrefs();
    setSfxOn(getSfxEnabled());
    setMusicOn(getMusicEnabled());
  }, []);

  // Auto-pause when the tab loses focus (Area 3.3) — critical on Android tablets.
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "hidden" && phase === "playing" && !isPaused) {
        setIsPaused(true);
        setShowSettings(false);
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, isPaused]);

  // Keyboard: Esc/Space pause, Ctrl/Cmd+Z undo, H hint (Area 3).
  useEffect(() => {
    if (phase !== "playing") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        setIsPaused((p) => !p);
        setShowSettings(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        handleHint();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleUndo, handleHint]);

  // Disable undo once the onchain submit succeeds (anti-cheat, Area 3.1).
  useEffect(() => {
    if (txStatus === "success") actions.lockUndo();
  }, [txStatus, actions]);

  // Area 1 juice: spawn floating score + particles + shake when lines clear.
  // Fires when clearingRows/cols transition from empty -> non-empty.
  const prevClearingRef = useRef(false);
  useEffect(() => {
    const clearing = gameState.clearingRows.length > 0 || gameState.clearingCols.length > 0;
    if (!clearing || prevClearingRef.current) { prevClearingRef.current = clearing; return; }
    prevClearingRef.current = clearing;
    if (!boardRef.current) return;
    const lines = gameState.clearingRows.length + gameState.clearingCols.length;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // floating score at board center
    if (FEATURES.floatingScore) {
      const r = boardRef.current.getBoundingClientRect();
      const id = ++fxIdRef.current;
      const text = lines > 1 ? `+${Math.round(gameState.score)} DOUBLE!` : `+${lines}`;
      setFloatItems((prev) => [...prev, { id, text, x: r.width / 2, y: r.height / 2, big: lines > 1 }]);
      window.setTimeout(() => setFloatItems((prev) => prev.filter((f) => f.id !== id)), 950);
    }
    // particles: 6-8 per cleared cell, hard cap 80
    if (FEATURES.particles && !reduced) {
      const r = boardRef.current.getBoundingClientRect();
      const m = boardMetricsRef.current;
      const cell = m ? m.cell : 28;
      const pad = m ? m.left - r.left : 6;
      const padT = m ? m.top - r.top : 6;
      const cells: { x: number; y: number }[] = [];
      for (const row of gameState.clearingRows) for (let c = 0; c < 8; c++) cells.push({ x: pad + c * (cell + 2) + cell / 2, y: padT + row * (cell + 2) + cell / 2 });
      for (const col of gameState.clearingCols) for (let r2 = 0; r2 < 8; r2++) cells.push({ x: pad + col * (cell + 2) + cell / 2, y: padT + r2 * (cell + 2) + cell / 2 });
      const cols = ['var(--block-cyan)', 'var(--block-green)', 'var(--block-yellow)', 'var(--block-pink)'];
      const burst: ParticleItem[] = [];
      for (const cellPos of cells.slice(0, 10)) { // cap cells for perf
        for (let k = 0; k < 7; k++) {
          if (burst.length >= 80) break;
          burst.push({ id: ++fxIdRef.current, x: cellPos.x, y: cellPos.y, color: cols[k % cols.length] });
        }
      }
      setParticleItems((prev) => [...prev.slice(-80 + burst.length), ...burst]);
      const ids = new Set(burst.map((b) => b.id));
      window.setTimeout(() => setParticleItems((prev) => prev.filter((pt) => !ids.has(pt.id))), 550);
    }
    // shake proportional (Area 1.4): 1 line = none, 2 = 180ms, 3+ = 300ms + flash
    if (FEATURES.screenShake && !reduced && lines >= 2) {
      setBoardShake(lines >= 3 ? 3 : 2);
      if (lines >= 3) { setBoardFlash(true); window.setTimeout(() => setBoardFlash(false), 320); }
      window.setTimeout(() => setBoardShake(0), lines >= 3 ? 300 : 180);
    }
  }, [gameState.clearingRows, gameState.clearingCols, gameState.score]);

  const handleSelectPiece = useCallback((pieceId: string | null) => {
    setSelectedPieceId((current) => (current === pieceId ? null : pieceId));
  }, []);

  const handleBoardTap = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPaused || isClearing) return;
      if (selectedPieceId == null || !boardRef.current) return;
      const piece = gameState.pieces.find((p): p is BlockPiece => p !== null && p.id === selectedPieceId);
      if (!piece) return;

      const m = getBoardMetrics();
      if (!m) return;
      const clientX = e.clientX;
      const clientY = e.clientY;

      // Anchor at the visual center of the piece's bounding shape
      const anchorRow = Math.floor((piece.shape.length - 1) / 2);
      const anchorCol = Math.floor(((piece.shape[0]?.length ?? 1) - 1) / 2);

      const col = Math.floor((clientX - m.left) / m.pitch) - anchorCol;
      const row = Math.floor((clientY - m.top) / m.pitch) - anchorRow;
      const pos = { row, col };

      const snapped = snapToValid(gridRef.current, piece.shape, pos);
      if (snapped) {
        actions.placePiece(piece, snapped);
        setSelectedPieceId(null);
      }
    },
    [selectedPieceId, gameState.pieces, actions, isPaused, isClearing, getBoardMetrics],
  );

  const handleDragStart = useCallback(
    (piece: BlockPiece, anchorRow: number, anchorCol: number, clientX: number, clientY: number, pointerId: number) => {
      if (isPaused || isClearing) return;
      // Jari pertama yang menang; jari kedua diabaikan sampai drag selesai.
      if (isDraggingRef.current && dragPointerIdRef.current !== null
          && dragPointerIdRef.current !== pointerId) return;
      // Clear any tap selection when user starts dragging
      setSelectedPieceId(null);

      // Cancel any pending RAF from previous drag
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (boardRef.current) {
        // FIX: Save metrics ke ref biar handleDragMove bisa pakai
        boardMetricsRef.current = measureBoard(boardRef.current);
        boardCellSizeRef.current = boardMetricsRef.current.cell;
      }
      isDraggingRef.current = true;
      dragPointerIdRef.current = pointerId;
      dragPieceRef.current = piece;
      grabOffsetRef.current = { row: anchorRow, col: anchorCol };
      const m = boardMetricsRef.current;
      const cell = m ? m.cell : boardCellSizeRef.current;
      const grab = grabOffsetRef.current;
      setDragState({
        piece,
        pos: {
          x: clientX - grab.col * (cell + 1) - cell / 2,
          y: clientY - grab.row * (cell + 1) - cell / 2,
        },
        ghost: null,
        ghostValid: false,
      });
    },
    [isPaused, isClearing],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number, pointerId: number) => {
      if (isPaused || isClearing) return;
      if (dragPointerIdRef.current !== pointerId) return;
      if (!isDraggingRef.current || !dragPieceRef.current || !boardMetricsRef.current) return;

      // Pointermove bisa menembak 120x/detik di HP. Versi lama memanggil
      // setDragState di SETIAP event, jadi React me-render ulang seluruh
      // layar puluhan kali per frame — itu sumber patah-patahnya.
      // Sekarang posisi terakhir disimpan di ref dan diproses maksimal
      // sekali per frame animasi.
      pendingPointerRef.current = { x: clientX, y: clientY };
      if (rafRef.current !== null) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pointer = pendingPointerRef.current;
        const piece = dragPieceRef.current;
        const m = boardMetricsRef.current;
        if (!pointer || !piece || !m || !isDraggingRef.current) return;

        const grab = grabOffsetRef.current;
        const rawCol = Math.floor((pointer.x - m.left) / m.pitch) - grab.col;
        const rawRow = Math.floor((pointer.y - m.top) / m.pitch) - grab.row;

        // Bayangan menampilkan posisi hasil snap, bukan posisi mentah —
        // jadi yang dilihat pemain persis sama dengan yang akan terjadi
        // saat jari dilepas.
        const snapped = FEATURES.snapTolerance
          ? nearestCenterSnap(gridRef.current, piece.shape, { row: rawRow, col: rawCol }, m.cell, m.pitch)
          : snapToValid(gridRef.current, piece.shape, { row: rawRow, col: rawCol });
        const ghost = snapped ?? { row: rawRow, col: rawCol };
        if (FEATURES.rowColHighlight && snapped) {
          const sim = gridRef.current.map((row) => row.slice());
          for (let rr = 0; rr < piece.shape.length; rr++)
            for (let cc = 0; cc < piece.shape[rr].length; cc++)
              if (piece.shape[rr][cc]) sim[snapped.row + rr][snapped.col + cc] = 'red';
          const cells: Position[] = [];
          for (let r2 = 0; r2 < 8; r2++) if (sim[r2].every((c) => c !== null)) for (let c2 = 0; c2 < 8; c2++) cells.push({ row: r2, col: c2 });
          for (let c2 = 0; c2 < 8; c2++) { let full = true; for (let r2 = 0; r2 < 8; r2++) if (sim[r2][c2] === null) { full = false; break; } if (full) for (let r2 = 0; r2 < 8; r2++) cells.push({ row: r2, col: c2 }); }
          setHighlightCells(cells.length ? cells : null);
        } else {
          setHighlightCells(null);
        }

        // pos yang disimpan adalah OFFSET translate3d (clientX dikurangi
        // anchor), bukan clientX mentah. Jadi bandingkan offset lawan
        // offset. Versi sebelumnya membandingkan offset lawan clientX:
        // guard tidak pernah kena saat jari diam (jadi render tetap jalan
        // tiap frame) dan malah kena saat jari geser ke kiri (jadi satu
        // frame membeku) — kebalikan dari yang dimaksud.
        const next = {
          x: pointer.x - grab.col * (m.cell + 1) - m.cell / 2,
          y: pointer.y - grab.row * (m.cell + 1) - m.cell / 2,
        };

        setDragState((prev) => {
          const samePos = prev.ghost && prev.ghost.row === ghost.row && prev.ghost.col === ghost.col;
          if (samePos && prev.ghostValid === Boolean(snapped) && prev.pos
              && Math.abs(prev.pos.x - next.x) < 0.5
              && Math.abs(prev.pos.y - next.y) < 0.5) {
            return prev; // tidak ada perubahan berarti — lewati render
          }
          return { ...prev, pos: next, ghost, ghostValid: Boolean(snapped) };
        });
      });
    },
    [isPaused, isClearing],
  );


  const handleDragEnd = useCallback(
    (clientX: number, clientY: number, pointerId: number) => {
      if (isPaused || isClearing) return;
      // Jari yang bukan pemilik tidak boleh menaruh keping MAUPUN
      // membatalkan drag yang sedang berjalan.
      if (dragPointerIdRef.current !== pointerId) return;
      // FIX: Cleanup drag state FIRST sebelum placePiece biar ga freeze
      const wasDragging = isDraggingRef.current;
      const piece = dragPieceRef.current;
      const grab = grabOffsetRef.current;

      isDraggingRef.current = false;
      dragPointerIdRef.current = null;
      dragPieceRef.current = null;
      grabOffsetRef.current = { row: 0, col: 0 };
      pendingPointerRef.current = null;
      
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Clear drag visual immediately
      setDragState({ piece: null, pos: null, ghost: null, ghostValid: false });
      setHighlightCells(null);

      if (wasDragging && piece) {
        const m = getBoardMetrics();
        if (!m) return;

        const col = Math.floor((clientX - m.left) / m.pitch) - grab.col;
        const row = Math.floor((clientY - m.top) / m.pitch) - grab.row;

        const snapped = FEATURES.snapTolerance
          ? nearestCenterSnap(gridRef.current, piece.shape, { row, col }, m.cell, m.pitch)
          : snapToValid(gridRef.current, piece.shape, { row, col });
        if (snapped) {
          actions.placePiece(piece, snapped);
        } else if (FEATURES.invalidFeedback) {
          sfxDenied();
          haptic.denied();
        }
      }
    },
    [actions, isPaused, isClearing, getBoardMetrics],
  );


  const handleStartGame = useCallback((mode: 0 | 1) => {
    actions.startGame(mode);
    finalReset();
    setPhase("playing");
    setIsPaused(false);
    setShowSettings(false);
  }, [actions, finalReset]);

  const handleSubmitScore = useCallback(() => {
    txReset();
    submitScore(gameState.mode, gameState.score, gameState.level);
  }, [txReset, submitScore, gameState.mode, gameState.score, gameState.level]);

  const handleSubmitFinalScore = useCallback(() => {
    submitFinalScore(gameState.mode, gameState.score, gameState.level);
  }, [submitFinalScore, gameState.mode, gameState.score, gameState.level]);

  const handlePlayAgain = useCallback(() => {
    actions.resetGame();
    txReset();
    finalReset();
    setGameOverReason('no-moves');
    setPhase("wallet");
    setIsPaused(false);
    setShowSettings(false);
  }, [actions, txReset, finalReset]);

  const handlePause = useCallback(() => {
    setIsPaused((p) => !p);
    setShowSettings(false);
  }, []);

  const handleExitGame = useCallback(() => {
    setIsPaused(false);
    setShowSettings(false);
    txReset();
    finalReset();
    actions.resetGame();
    setPhase("wallet");
  }, [actions, txReset, finalReset]);

  const ambientBackground = (
    <>
      <div className="ambient-grid" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="floating-blocks" aria-hidden="true">
        <div className="float-block cyan" />
        <div className="float-block blue" />
        <div className="float-block green" />
        <div className="float-block purple" />
        <div className="float-block tiny" />
      </div>
    </>
  );

  if (showLeaderboard) {
    return (
      <>
        {ambientBackground}
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      </>
    );
  }

  if (phase === "wallet") {
    return (
      <>
        {ambientBackground}
        <WalletGate
          onReady={handleStartGame}
          onViewLeaderboard={() => setShowLeaderboard(true)}
        />
      </>
    );
  }

  if (phase === "over") {
    return (
      <>
        {ambientBackground}
        <GameOverModal
          score={gameState.score}
          bestScore={gameState.bestAtStart}
          mode={gameState.mode}
          level={gameState.level}
          streak={gameState.streak}
          reason={gameOverReason}
          onPlayAgain={handlePlayAgain}
          onViewLeaderboard={() => setShowLeaderboard(true)}
          onSubmitScore={handleSubmitFinalScore}
          submitStatus={finalStatus}
          submitError={finalError}
        />
      </>
    );
  }

  return (
    <>
      {ambientBackground}
      <div className="game-screen">
        <div className="game-header">
          {/* Judul memakai lebar penuh dan tombol gear di-absolute, jadi
              "BASE BLOCK" benar-benar di tengah layar. Sebelumnya judul
              hanya di tengah ruang SISA di kiri gear, sehingga tampak
              meleset ke kiri. Subtitle "ON BASE NETWORK" dihapus dari
              layar main — sudah ada di landing, dan di sini cuma memakan
              tinggi yang dibutuhkan papan dan tray. */}
          <div className="game-header-title">BASE BLOCK</div>
          <button
            className="icon-btn settings-btn"
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Settings"
          >
            ⚙️
          </button>

          {showSettings && (
            <div className="settings-dropdown">
              <button className="settings-item" onClick={handlePause}>
                {isPaused ? '▶️ RESUME' : '⏸️ PAUSE'}
              </button>
              {FEATURES.undo && (
                <button
                  className="settings-item"
                  onClick={handleUndo}
                  disabled={gameState.undoCharges <= 0}
                  style={gameState.undoCharges <= 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                >
                  ↩️ UNDO {gameState.undoCharges}/1
                </button>
              )}
              {FEATURES.hint && (
                <button
                  className="settings-item"
                  onClick={handleHint}
                  disabled={gameState.hintCharges <= 0}
                  style={gameState.hintCharges <= 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                >
                  💡 HINT {gameState.hintCharges}/3
                </button>
              )}
              {FEATURES.soundToggle && (
                <button className="settings-item" onClick={toggleSfx}>
                  {sfxOn ? '🔊 SFX: ON' : '🔇 SFX: OFF'}
                </button>
              )}
              {FEATURES.soundToggle && (
                <button className="settings-item" onClick={toggleMusic}>
                  {musicOn ? '🎵 MUSIC: ON' : '🎵 MUSIC: OFF'}
                </button>
              )}
              <button className="settings-item exit" onClick={handleExitGame}>
                🚪 EXIT GAME
              </button>
            </div>
          )}
        </div>

        {isPaused && (
          <div className="pause-overlay" onClick={handlePause}>
            <div className="pause-content" onClick={(e) => e.stopPropagation()}>
              <div className="pause-icon">⏸️</div>
              <div className="pause-text">PAUSED</div>
              <div className="pause-menu">
                <button className="primary" onClick={handlePause}>▶️ RESUME</button>
                <button className="secondary" onClick={() => handleStartGame(gameState.mode)}>🔄 RESTART</button>
                {FEATURES.soundToggle && (
                  <button className="secondary" onClick={toggleSfx}>{sfxOn ? '🔊 SFX: ON' : '🔇 SFX: OFF'}</button>
                )}
                <button className="secondary" onClick={handleExitGame}>🚪 QUIT</button>
              </div>
              <div className="pause-hint">Esc / Space to resume</div>
            </div>
          </div>
        )}

        <ScoreBoard
          score={gameState.score}
          bestScore={gameState.bestScore}
          combo={gameState.combo}
          streak={gameState.streak}
          mode={gameState.mode}
          level={gameState.level}
          targetScore={gameState.targetScore}
          timeLeft={gameState.timeLeft}
        />

        <div className="board-juice-wrap" style={{ position: 'relative', width: 'var(--board-size, min(92vw, 420px))', margin: '0 auto' }}>
          <GameBoard
            grid={gameState.grid}
            ghostPiece={dragState.piece}
            ghostPos={dragState.ghost}
            isGhostValid={dragState.ghostValid}
            clearingRows={gameState.clearingRows}
            clearingCols={gameState.clearingCols}
            lastPlacedCells={gameState.lastPlacedCells}
            hintCells={hintCells}
            highlightCells={highlightCells}
            shake={boardShake}
            flash={boardFlash}
            boardRef={boardRef}
            onPointerDown={handleBoardTap}
          />
          <FloatingScore items={floatItems} />
          <Particles particles={particleItems} />
        </div>

        <ComboEffect combo={gameState.combo} />

        {gameState.mode === 0 && gameState.score > 0 && (
          <div className="classic-submit">
            <button
              className="primary classic-submit-btn"
              onClick={handleSubmitScore}
              disabled={txStatus === 'pending' || txStatus === 'confirming'}
            >
              {txStatus === 'pending' || txStatus === 'confirming'
                ? '⏳ SUBMITTING...'
                : txStatus === 'success'
                  ? '✅ SUBMITTED · SUBMIT AGAIN?'
                  : '📤 SUBMIT SCORE'}
            </button>
            {txStatus === 'error' && txError && (
              <span className="classic-submit-error">
                {txError.message}
              </span>
            )}
          </div>
        )}

        <BlockTray
          pieces={gameState.pieces}
          draggedPieceId={dragState.piece?.id ?? null}
          selectedPieceId={selectedPieceId}
          dragPos={dragState.pos}
          cellSize={boardCellSizeRef.current}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onSelectPiece={handleSelectPiece}
        />

      </div>
    </>
  );
}
