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

type AppPhase = "wallet" | "playing" | "over";
type GameOverReason = 'no-moves' | 'time-up';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("wallet");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [gameMode, setGameMode] = useState<0 | 1>(0);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('no-moves');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { submitScore, status: txStatus, error: txError, reset: txReset } = useGameContract();
  const [manualSubmitted, setManualSubmitted] = useState(false);

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
  const boardRectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  // (clearing animation, opsional — bisa di-wire kemudian)
  const [clearingRows] = useState<number[]>([]);
  const [clearingCols] = useState<number[]>([]);

  const [gameState, actions] = useGameState();
  const boardRef = useRef<HTMLDivElement>(null);

  // Ref untuk grid — hindari stale closure di RAF
  const gridRef = useRef(gameState.grid);
  useEffect(() => {
    gridRef.current = gameState.grid;
  }, [gameState.grid]);

  // Auto-submit score on game over
  useEffect(() => {
    if (gameState.phase === "over") {
      setPhase("over");
      if (gameState.timeLeft <= 0 && gameState.mode === 1) {
        setGameOverReason('time-up');
      } else {
        setGameOverReason('no-moves');
      }
      if (!scoreSubmitted) {
        submitScore(gameMode, gameState.score, gameState.level);
        setScoreSubmitted(true);
      }
    }
  }, [gameState.phase, gameState.score, gameState.level, gameState.timeLeft, gameState.mode, scoreSubmitted, submitScore, gameMode]);

  // Invalidate cached board rect on resize biar cell size tetap akurat
  useEffect(() => {
    function onResize() {
      boardRectRef.current = null;
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
      if (isPaused) return;
      if (selectedPieceId == null || !boardRef.current) return;
      const piece = gameState.pieces.find((p): p is BlockPiece => p !== null && p.id === selectedPieceId);
      if (!piece) return;

      let rect = boardRectRef.current;
      if (!rect) {
        rect = boardRef.current.getBoundingClientRect();
        boardRectRef.current = rect;
        boardCellSizeRef.current = rect.width / 8;
      }
      const cellSize = boardCellSizeRef.current;
      const clientX = e.clientX;
      const clientY = e.clientY;

      // Anchor at the visual center of the piece's bounding shape
      const anchorRow = Math.floor((piece.shape.length - 1) / 2);
      const anchorCol = Math.floor(((piece.shape[0]?.length ?? 1) - 1) / 2);

      const col = Math.floor((clientX - rect.left) / cellSize) - anchorCol;
      const row = Math.floor((clientY - rect.top) / cellSize) - anchorRow;
      const pos = { row, col };

      if (canPlace(gridRef.current, piece.shape, pos)) {
        actions.placePiece(piece, pos);
        setSelectedPieceId(null);
      }
    },
    [selectedPieceId, gameState.pieces, actions, isPaused],
  );

  const handleDragStart = useCallback(
    (piece: BlockPiece, anchorRow: number, anchorCol: number, clientX: number, clientY: number) => {
      if (isPaused) return;
      // Clear any tap selection when user starts dragging
      setSelectedPieceId(null);

      // Cancel any pending RAF from previous drag
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        boardCellSizeRef.current = rect.width / 8;
        // FIX: Save rect ke ref biar handleDragMove bisa pakai
        boardRectRef.current = rect;
      }
      isDraggingRef.current = true;
      dragPieceRef.current = piece;
      grabOffsetRef.current = { row: anchorRow, col: anchorCol };
      const cellSize = boardCellSizeRef.current;
      const grab = grabOffsetRef.current;
      setDragState({
        piece,
        pos: {
          x: clientX - grab.col * cellSize - cellSize / 2,
          y: clientY - grab.row * cellSize - cellSize / 2,
        },
        ghost: null,
        ghostValid: false,
      });
    },
    [isPaused],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (isPaused) return;
      if (!isDraggingRef.current || !dragPieceRef.current || !boardRectRef.current) return;
      
      // FIX: Direct update tanpa RAF untuk responsiveness maksimal
      const piece = dragPieceRef.current;
      const grab = grabOffsetRef.current;
      const rect = boardRectRef.current;
      const cellSize = boardCellSizeRef.current;

      const col = Math.floor((clientX - rect.left) / cellSize) - grab.col;
      const row = Math.floor((clientY - rect.top) / cellSize) - grab.row;
      const pos = { row, col };

      const dragPos = {
        x: clientX - grab.col * cellSize - cellSize / 2,
        y: clientY - grab.row * cellSize - cellSize / 2,
      };

      const isValid = canPlace(gridRef.current, piece.shape, pos);

      setDragState((prev) => ({
        ...prev,
        pos: dragPos,
        ghost: pos,
        ghostValid: isValid,
      }));
    },
    [isPaused],
  );


  const handleDragEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (isPaused) return;
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
        let rect = boardRectRef.current;
        if (!rect) {
          // Fallback: recalculate rect kalau null (edge case resize)
          if (boardRef.current) {
            rect = boardRef.current.getBoundingClientRect();
            boardRectRef.current = rect;
          } else {
            return;
          }
        }
        
        const cellSize = boardCellSizeRef.current;
        const col = Math.floor((clientX - rect.left) / cellSize) - grab.col;
        const row = Math.floor((clientY - rect.top) / cellSize) - grab.row;
        const pos = { row, col };

        // Pakai gridRef.current untuk consistency
        if (canPlace(gridRef.current, piece.shape, pos)) {
          actions.placePiece(piece, pos);
        }
      }
    },
    [actions, isPaused],
  );


  const handleStartGame = useCallback((mode: 0 | 1) => {
    setGameMode(mode);
    actions.startGame(mode);
    setPhase("playing");
    setIsPaused(false);
    setShowSettings(false);
  }, [actions]);

  const handleManualSubmit = useCallback(() => {
    txReset();
    submitScore(gameState.mode, gameState.score, gameState.level);
    setManualSubmitted(true);
  }, [txReset, submitScore, gameState.mode, gameState.score, gameState.level]);

  const handlePlayAgain = useCallback(() => {
    actions.resetGame();
    setScoreSubmitted(false);
    setManualSubmitted(false);
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
    setScoreSubmitted(false);
    setManualSubmitted(false);
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
          clearingRows={clearingRows}
          clearingCols={clearingCols}
          boardRef={boardRef}
          onPointerDown={handleBoardTap}
        />

        {gameState.mode === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, margin: '8px 0' }}>
            <button
              className="primary"
              onClick={handleManualSubmit}
              disabled={txStatus === 'pending' || txStatus === 'confirming'}
              style={{ fontSize: 12, padding: '8px 20px' }}
            >
              {txStatus === 'pending' || txStatus === 'confirming'
                ? '⏳ SUBMITTING...'
                : txStatus === 'success' || manualSubmitted
                  ? '✅ SCORE SUBMITTED'
                  : '📤 SUBMIT SCORE'}
            </button>
            {txStatus === 'error' && txError && (
              <span style={{ fontSize: 10, color: 'var(--danger)' }}>
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
