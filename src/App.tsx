import { useState, useRef, useCallback, useEffect } from "react";
import type { BlockPiece, Position } from "./lib/game/types.js";
import { canPlace } from "./lib/game/grid.js";
import { canPlaceAnyOfPieces } from "./lib/game/validator.js";
import { useGameState } from "./hooks/useGameState.js";
import { useGameContract } from "./hooks/useGameContract.js";
import GameBoard from "./components/GameBoard.js";
import BlockTray from "./components/BlockTray.js";
// NextTray import removed — hidden per user request
import ScoreBoard from "./components/ScoreBoard.js";
import GameOverModal from "./components/GameOverModal.js";
import WalletGate from "./components/WalletGate.js";
import Leaderboard from "./components/Leaderboard.js";

type AppPhase = "wallet" | "playing" | "over";
type GameOverReason = 'no-moves' | 'time-up';

interface DragState {
  piece: BlockPiece | null;
  pos: { x: number; y: number } | null;
  ghost: Position | null;
  ghostValid: boolean;
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("wallet");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [gameMode, setGameMode] = useState<0 | 1>(0);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('no-moves');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  const { submitScore, status: txStatus, error: txError, reset: txReset } = useGameContract();
  const [manualSubmitted, setManualSubmitted] = useState(false);

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

  // Score pop-up state
  const [scorePopup, setScorePopup] = useState<{ points: number; key: number } | null>(null);

  // Combo visual state
  const [comboPopup, setComboPopup] = useState<{ combo: number; key: number } | null>(null);

  // Screen shake state
  const [shaking, setShaking] = useState(false);

  // Game over warning — board pulsing red
  const [boardWarning, setBoardWarning] = useState(false);

  const [gameState, actions] = useGameState();
  const boardRef = useRef<HTMLDivElement>(null);

  // Settings menu
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return;
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [showSettings]);

  const handleQuitGame = useCallback(() => {
    setShowSettings(false);
    actions.resetGame();
    setScoreSubmitted(false);
    setManualSubmitted(false);
    txReset();
    setPhase("wallet");
  }, [actions, txReset]);

  const handleGameOver = useCallback(() => {
    setShowSettings(false);
    actions.endGame();
  }, [actions]);

  // Score popup trigger — shows EVERY block placement + score change
  const prevScoreRef = useRef(gameState.score);
  const prevPlacedLenRef = useRef(0);
  useEffect(() => {
    // Show popup on every new block placement
    const newPlacement = gameState.lastPlacedCells.length > 0 &&
      gameState.lastPlacedCells.length !== prevPlacedLenRef.current;
    const diff = gameState.score - prevScoreRef.current;

    if (gameState.phase === 'playing' && (newPlacement || diff > 0)) {
      const points = diff > 0 ? diff : 1; // Show +1 minimum on placement
      setScorePopup({ points, key: Date.now() });
      const t = setTimeout(() => setScorePopup(null), 900);
      prevPlacedLenRef.current = gameState.lastPlacedCells.length;
      prevScoreRef.current = gameState.score;
      return () => clearTimeout(t);
    }
    prevScoreRef.current = gameState.score;
    prevPlacedLenRef.current = gameState.lastPlacedCells.length;
  }, [gameState.score, gameState.phase, gameState.lastPlacedCells]);

  // Placement sparkle trigger — show on every block placement
  const [showSparkle, setShowSparkle] = useState(false);
  const sparkleKeyRef = useRef(0);
  const prevPlacedRef = useRef(gameState.lastPlacedCells);
  useEffect(() => {
    if (gameState.lastPlacedCells.length > 0 && gameState.lastPlacedCells !== prevPlacedRef.current) {
      sparkleKeyRef.current++;
      setShowSparkle(true);
      const t = setTimeout(() => setShowSparkle(false), 500);
      return () => clearTimeout(t);
    }
    prevPlacedRef.current = gameState.lastPlacedCells;
  }, [gameState.lastPlacedCells]);

  // Combo popup trigger
  const prevComboRef = useRef(gameState.combo);
  useEffect(() => {
    if (gameState.combo > prevComboRef.current && gameState.combo >= 2 && gameState.phase === 'playing') {
      setComboPopup({ combo: gameState.combo, key: Date.now() });

      // Screen shake for big combos
      if (gameState.combo >= 3) {
        setShaking(true);
        // Stronger haptic for combos
        try { navigator.vibrate?.([20, 30, 20]); } catch { /* ignore */ }
        const t = setTimeout(() => setShaking(false), 300);
        return () => {
          clearTimeout(t);
          setComboPopup(null);
        };
      }

      const t = setTimeout(() => setComboPopup(null), 1200);
      return () => clearTimeout(t);
    }
    prevComboRef.current = gameState.combo;
  }, [gameState.combo, gameState.phase]);

  // Board warning: pulse red when almost no moves left
  useEffect(() => {
    if (gameState.phase !== 'playing') {
      setBoardWarning(false);
      return;
    }
    const visible = gameState.pieces.filter((p): p is BlockPiece => p !== null);
    if (visible.length === 0) return;

    // Check if any piece can be placed
    const canPlaceAny = canPlaceAnyOfPieces(gameState.grid, visible);
    setBoardWarning(!canPlaceAny);
  }, [gameState.grid, gameState.pieces, gameState.phase]);

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
      if (!scoreSubmitted && gameState.score > 0) {
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

      const anchorRow = Math.floor((piece.shape.length - 1) / 2);
      const anchorCol = Math.floor(((piece.shape[0]?.length ?? 1) - 1) / 2);

      const col = Math.floor((clientX - rect.left) / cellSize) - anchorCol;
      const row = Math.floor((clientY - rect.top) / cellSize) - anchorRow;
      const pos = { row, col };

      if (canPlace(gridRef.current, piece.shape, pos)) {
        actions.placePiece(piece, pos);
        setSelectedPieceId(null);
        // Haptic feedback on mobile
        try { navigator.vibrate?.(15); } catch { /* ignore */ }
      }
    },
    [selectedPieceId, gameState.pieces, actions],
  );

  const handleDragStart = useCallback(
    (piece: BlockPiece, anchorRow: number, anchorCol: number, clientX: number, clientY: number) => {
      setSelectedPieceId(null);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        boardCellSizeRef.current = rect.width / 8;
        boardRectRef.current = rect;
      }
      isDraggingRef.current = true;
      dragPieceRef.current = piece;
      grabOffsetRef.current = { row: anchorRow, col: anchorCol };
      const cellSize = boardCellSizeRef.current;
      const grab = grabOffsetRef.current;
      // Position: top-left corner of the floating piece
      // Floating piece uses left:0,top:0 + transform:translate3d, so we compute
      // the raw x,y that represents the piece's top-left offset from viewport origin
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
    [],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current || !dragPieceRef.current || !boardRectRef.current) return;

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
    [],
  );

  const handleDragEnd = useCallback(
    (clientX: number, clientY: number) => {
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

      setDragState({ piece: null, pos: null, ghost: null, ghostValid: false });

      if (wasDragging && piece) {
        let rect = boardRectRef.current;
        if (!rect) {
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

        if (canPlace(gridRef.current, piece.shape, pos)) {
          actions.placePiece(piece, pos);
          // Haptic feedback on mobile
          try { navigator.vibrate?.(15); } catch { /* ignore */ }
        }
      }
    },
    [actions],
  );

  const handleStartGame = useCallback((mode: 0 | 1) => {
    setGameMode(mode);
    actions.startGame(mode);
    setPhase("playing");
  }, [actions]);

  const handleManualSubmit = useCallback(() => {
    if (gameState.score === 0) return;
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
          combo={gameState.maxCombo}
          totalCleared={gameState.totalCleared}
          totalMoves={gameState.totalMoves}
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
      <div className={`game-screen${shaking ? ' shake' : ''}${boardWarning ? ' board-warning' : ''}`}>
        <div className="game-header">
          <div className="game-header-row">
            <div>
              <div className="game-header-title">BASE BLOCK</div>
              <div className="game-header-subtitle">
                {gameState.mode === 0 ? 'CLASSIC' : `ARCADE — LVL ${gameState.level}`}
              </div>
            </div>
            <div className="settings-wrap" ref={settingsRef}>
              <button
                className="settings-btn"
                onClick={() => setShowSettings(s => !s)}
                aria-label="Settings"
                aria-expanded={showSettings}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              {showSettings && (
                <div className="settings-menu" role="menu">
                  <button className="settings-item" onClick={() => { setShowSettings(false); setShowLeaderboard(true); }}>
                    🏆 Leaderboard
                  </button>
                  {gameState.mode === 0 && gameState.score > 0 && (
                    <button className="settings-item" onClick={() => { setShowSettings(false); handleManualSubmit(); }}>
                      📤 Submit Score
                    </button>
                  )}
                  <button className="settings-item danger" onClick={handleGameOver}>
                    🏳️ End Game
                  </button>
                  <button className="settings-item danger" onClick={handleQuitGame}>
                    🚪 Quit to Menu
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

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

        <div className="board-wrapper" style={{ position: 'relative' }}>
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

          {scorePopup && (
            <div key={scorePopup.key} className="score-popup">
              +{scorePopup.points.toLocaleString()}
            </div>
          )}

          {comboPopup && (
            <div key={comboPopup.key} className={`combo-popup combo-${Math.min(comboPopup.combo, 5)}`}>
              {comboPopup.combo}x COMBO!
            </div>
          )}

          {/* Particle burst on line clear */}
          {gameState.clearingRows.length > 0 && (
            <div className="particle-burst" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className={`particle p${i}`} />
              ))}
            </div>
          )}

          {/* Placement sparkle — every block landing */}
          {showSparkle && (
            <div className="placement-sparkle" key={`sparkle-${sparkleKeyRef.current}`} aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const dist = 25 + (i % 3) * 12;
                const dx = Math.cos(angle) * dist;
                const dy = Math.sin(angle) * dist;
                const colors = ['#00e5ff', '#00e676', '#ffea00', '#4d8aff'];
                const sparkSize = Math.max(4, Math.min(7, Math.round(window.innerWidth / 80)));
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      width: sparkSize,
                      height: sparkSize,
                      borderRadius: '50%',
                      top: '50%',
                      left: '50%',
                      background: colors[i % colors.length],
                      willChange: 'transform, opacity',
                      animation: `sparkleBurst 0.5s ease-out ${i * 0.03}s forwards`,
                      '--tx': `${dx}px`,
                      '--ty': `${dy}px`,
                    } as React.CSSProperties}
                  />
                );
              })}
            </div>
          )}
        </div>

        {gameState.mode === 0 && (
          <div className="submit-score-section">
            <button
              className="primary submit-score-btn"
              onClick={handleManualSubmit}
              disabled={
                txStatus === 'pending' ||
                txStatus === 'confirming' ||
                gameState.score === 0
              }
            >
              {gameState.score === 0
                ? '🚫 SCORE 0 — MAIN DULU'
                : txStatus === 'pending' || txStatus === 'confirming'
                  ? '⏳ SUBMITTING...'
                  : txStatus === 'success' || manualSubmitted
                    ? '✅ SCORE SUBMITTED'
                    : '📤 SUBMIT SCORE'}
            </button>
            {txStatus === 'error' && txError && (
              <span className="submit-score-error">{txError.message}</span>
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
