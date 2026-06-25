import { useState, useRef, useCallback, useEffect } from "react";
import type { BlockPiece, Position } from "./lib/game/types.js";
import { canPlace } from "./lib/game/grid.js";
import { useGameState } from "./hooks/useGameState.js";
import GameBoard from "./components/GameBoard.js";
import BlockTray from "./components/BlockTray.js";
import ScoreBoard from "./components/ScoreBoard.js";
import GameOverModal from "./components/GameOverModal.js";
import WalletGate from "./components/WalletGate.js";
import Leaderboard from "./components/Leaderboard.js";

type AppPhase = "wallet" | "playing" | "over";

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("wallet");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Drag state
  const [dragPiece, setDragPiece] = useState<BlockPiece | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [ghostPos, setGhostPos] = useState<Position | null>(null);
  const [isGhostValid, setIsGhostValid] = useState(false);
  const grabOffsetRef = useRef<{ row: number; col: number }>({ row: 0, col: 0 });
  const rafRef = useRef<number | null>(null);

  // Clearing animation state
  const [clearingRows] = useState<number[]>([]);
  const [clearingCols] = useState<number[]>([]);

  const [gameState, actions] = useGameState();
  const boardRef = useRef<HTMLDivElement>(null);

  // Sync isDragging state -> ref so callbacks always see the latest value
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    if (gameState.phase === "over") {
      setPhase("over");
    }
  }, [gameState.phase]);

  const handleDragStart = useCallback((piece: BlockPiece, anchorRow: number, anchorCol: number) => {
    setDragPiece(piece);
    setIsDragging(true);
    setDragPos(null);
    setGhostPos(null);
    setIsGhostValid(false);
    grabOffsetRef.current = { row: anchorRow, col: anchorCol };
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      boardCellSizeRef.current = rect.width / 8;
    }
  }, []);

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current || !dragPiece || !boardRef.current) return;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!boardRef.current) return;
        const rect = boardRef.current.getBoundingClientRect();
        const cellSize = boardCellSizeRef.current;
        const col = Math.floor((clientX - rect.left) / cellSize) - grabOffsetRef.current.col;
        const row = Math.floor((clientY - rect.top) / cellSize) - grabOffsetRef.current.row;
        const pos = { row, col };
        setGhostPos(pos);
        setIsGhostValid(canPlace(gameState.grid, dragPiece.shape, pos));
        // Floating piece follows pointer with grab-cell-centered offset
        setDragPos({
          x: clientX - grabOffsetRef.current.col * cellSize - cellSize / 2,
          y: clientY - grabOffsetRef.current.row * cellSize - cellSize / 2,
        });
      });
    },
    [dragPiece, gameState.grid],
  );

  const handleDragEnd = useCallback(
    (_clientX: number, _clientY: number) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (isDraggingRef.current && dragPiece && boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        const cellSize = boardCellSizeRef.current;
        const col = Math.floor((_clientX - rect.left) / cellSize) - grabOffsetRef.current.col;
        const row = Math.floor((_clientY - rect.top) / cellSize) - grabOffsetRef.current.row;
        const pos = { row, col };
        if (canPlace(gameState.grid, dragPiece.shape, pos)) {
          actions.placePiece(dragPiece, pos);
        }
      }
      setIsDragging(false);
      setDragPiece(null);
      setDragPos(null);
      setGhostPos(null);
      setIsGhostValid(false);
      grabOffsetRef.current = { row: 0, col: 0 };
    },
    [dragPiece, gameState.grid, actions],
  );

  const handleStartGame = useCallback(() => {
    actions.startGame();
    setPhase("playing");
  }, [actions]);

  const handlePlayAgain = useCallback(() => {
    actions.resetGame();
    setPhase("wallet");
  }, [actions]);

  // Board cellSize captured at drag start so tray floating piece matches grid without re-renders
  const boardCellSizeRef = useRef(28);

  if (showLeaderboard) {
    return <Leaderboard onClose={() => setShowLeaderboard(false)} />;
  }

  if (phase === "wallet") {
    return (
      <WalletGate
        onReady={handleStartGame}
        onViewLeaderboard={() => setShowLeaderboard(true)}
      />
    );
  }

  if (phase === "over") {
    return (
      <GameOverModal
        score={gameState.score}
        bestScore={gameState.bestScore}
        onPlayAgain={handlePlayAgain}
        onViewLeaderboard={() => setShowLeaderboard(true)}
      />
    );
  }

  // Playing screen
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0px",
        padding: "8px",
        width: "100%",
        position: "relative",
      }}
    >
      {/* Header */}
      <div className="game-header">
        <div className="game-header-title">BASE BLOCK</div>
        <div className="game-header-subtitle">ON BASE NETWORK</div>
      </div>

      {/* Score board outside grid */}
      <ScoreBoard
        score={gameState.score}
        bestScore={gameState.bestScore}
        combo={gameState.combo}
        streak={gameState.streak}
      />

      {/* Game board — boardRef passed directly to GameBoard */}
      <GameBoard
        grid={gameState.grid}
        ghostPiece={isDragging ? dragPiece : null}
        ghostPos={ghostPos}
        isGhostValid={isGhostValid}
        clearingRows={clearingRows}
        clearingCols={clearingCols}
        boardRef={boardRef}
      />

      {/* Block tray */}
      <BlockTray
        pieces={gameState.pieces}
        draggedPieceId={dragPiece?.id ?? null}
        dragPos={dragPos}
        cellSize={boardCellSizeRef.current}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />

      {/* Leaderboard button */}
      <button
        className="btn-small"
        onClick={() => setShowLeaderboard(true)}
      >
        🏆 LEADERBOARD
      </button>
    </div>
  );
}