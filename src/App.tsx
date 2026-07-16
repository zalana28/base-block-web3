import { useState, useRef, useCallback, useEffect } from "react";
import type { BlockPiece, Position } from "./lib/game/types.js";
import { canPlace } from "./lib/game/grid.js";
import { useGameState } from "./hooks/useGameState.js";
import { useGameContract } from "./hooks/useGameContract.js";
import GameBoard from "./components/GameBoard.js";
import BlockTray from "./components/BlockTray.js";
import ScoreBoard from "./components/ScoreBoard.js";
import GameOverModal from "./components/GameOverModal.js";
import WalletGate from "./components/WalletGate.js";
import Leaderboard from "./components/Leaderboard.js";
import ComboEffect from "./components/ComboEffect.js";

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

  const { submitScore, status: txStatus, error: txError, reset: txReset } = useGameContract();

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

  const [gameState, actions] = useGameState(isPaused);
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

      if (canPlace(gridRef.current, piece.shape, pos)) {
        actions.placePiece(piece, pos);
        setSelectedPieceId(null);
      }
    },
    [selectedPieceId, gameState.pieces, actions, isPaused, isClearing, getBoardMetrics],
  );

  const handleDragStart = useCallback(
    (piece: BlockPiece, anchorRow: number, anchorCol: number, clientX: number, clientY: number) => {
      if (isPaused || isClearing) return;
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
    (clientX: number, clientY: number) => {
      if (isPaused || isClearing) return;
      if (!isDraggingRef.current || !dragPieceRef.current || !boardMetricsRef.current) return;

      // FIX: Direct update tanpa RAF untuk responsiveness maksimal
      const piece = dragPieceRef.current;
      const grab = grabOffsetRef.current;
      const m = boardMetricsRef.current;

      const col = Math.floor((clientX - m.left) / m.pitch) - grab.col;
      const row = Math.floor((clientY - m.top) / m.pitch) - grab.row;
      const pos = { row, col };

      const dragPos = {
        x: clientX - grab.col * (m.cell + 1) - m.cell / 2,
        y: clientY - grab.row * (m.cell + 1) - m.cell / 2,
      };

      const isValid = canPlace(gridRef.current, piece.shape, pos);

      setDragState((prev) => ({
        ...prev,
        pos: dragPos,
        ghost: pos,
        ghostValid: isValid,
      }));
    },
    [isPaused, isClearing],
  );


  const handleDragEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (isPaused || isClearing) return;
      // FIX: Cleanup drag state FIRST sebelum placePiece biar ga freeze
      const wasDragging = isDraggingRef.current;
      const piece = dragPieceRef.current;
      const grab = grabOffsetRef.current;
      
      isDraggingRef.current = false;
      dragPieceRef.current = null;
      grabOffsetRef.current = { row: 0, col: 0 };
      
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      // Clear drag visual immediately
      setDragState({ piece: null, pos: null, ghost: null, ghostValid: false });

      if (wasDragging && piece) {
        const m = getBoardMetrics();
        if (!m) return;

        const col = Math.floor((clientX - m.left) / m.pitch) - grab.col;
        const row = Math.floor((clientY - m.top) / m.pitch) - grab.row;
        const pos = { row, col };

        // Pakai gridRef.current untuk consistency
        if (canPlace(gridRef.current, piece.shape, pos)) {
          actions.placePiece(piece, pos);
        }
      }
    },
    [actions, isPaused, isClearing, getBoardMetrics],
  );


  const handleStartGame = useCallback((mode: 0 | 1) => {
    actions.startGame(mode);
    setPhase("playing");
    setIsPaused(false);
    setShowSettings(false);
  }, [actions]);

  const handleSubmitScore = useCallback(() => {
    txReset();
    submitScore(gameState.mode, gameState.score, gameState.level);
  }, [txReset, submitScore, gameState.mode, gameState.score, gameState.level]);

  const handlePlayAgain = useCallback(() => {
    actions.resetGame();
    txReset();
    setGameOverReason('no-moves');
    setPhase("wallet");
    setIsPaused(false);
    setShowSettings(false);
  }, [actions, txReset]);

  const handlePause = useCallback(() => {
    setIsPaused((p) => !p);
    setShowSettings(false);
  }, []);

  const handleExitGame = useCallback(() => {
    setIsPaused(false);
    setShowSettings(false);
    txReset();
    actions.resetGame();
    setPhase("wallet");
  }, [actions, txReset]);

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
          bestScore={gameState.bestScore}
          mode={gameState.mode}
          level={gameState.level}
          reason={gameOverReason}
          onPlayAgain={handlePlayAgain}
          onViewLeaderboard={() => setShowLeaderboard(true)}
          onSubmitScore={handleSubmitScore}
          txStatus={txStatus}
          txError={txError}
        />
      </>
    );
  }

  return (
    <>
      {ambientBackground}
      <div className="game-screen">
        <div className="game-header">
          <div className="game-header-row">
            <div className="game-header-text">
              <div className="game-header-title">BASE BLOCK</div>
              <div className="game-header-subtitle">ON BASE NETWORK</div>
            </div>
            <div className="game-header-actions">
              <button
                className="icon-btn settings-btn"
                onClick={() => setShowSettings((s) => !s)}
                aria-label="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="settings-dropdown">
              <button className="settings-item" onClick={handlePause}>
                {isPaused ? '▶️ RESUME' : '⏸️ PAUSE'}
              </button>
              <button className="settings-item exit" onClick={handleExitGame}>
                🚪 EXIT GAME
              </button>
            </div>
          )}
        </div>

        {isPaused && (
          <div className="pause-overlay" onClick={handlePause}>
            <div className="pause-content">
              <div className="pause-icon">⏸️</div>
              <div className="pause-text">PAUSED</div>
              <div className="pause-hint">Tap to resume</div>
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

        <GameBoard
          grid={gameState.grid}
          ghostPiece={dragState.piece}
          ghostPos={dragState.ghost}
          isGhostValid={dragState.ghostValid}
          clearingRows={gameState.clearingRows}
          clearingCols={gameState.clearingCols}
          lastPlacedCells={gameState.lastPlacedCells}
          boardRef={boardRef}
          onPointerDown={handleBoardTap}
        />

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
