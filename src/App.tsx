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

  // State yang perlu trigger render
  const [dragPiece, setDragPiece] = useState<BlockPiece | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [ghostPos, setGhostPos] = useState<Position | null>(null);
  const [isGhostValid, setIsGhostValid] = useState(false);

  // Refs untuk drag state internal (tidak trigger render)
  const isDraggingRef = useRef(false);
  const dragPieceRef = useRef<BlockPiece | null>(null);
  const grabOffsetRef = useRef<{ row: number; col: number }>({ row: 0, col: 0 });
  const boardCellSizeRef = useRef(28);
  const rafRef = useRef<number | null>(null);

  // (clearing animation, opsional — bisa di-wire kemudian)
  const [clearingRows] = useState<number[]>([]);
  const [clearingCols] = useState<number[]>([]);

  const [gameState, actions] = useGameState();
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState.phase === "over") setPhase("over");
  }, [gameState.phase]);

  const handleDragStart = useCallback(
    (piece: BlockPiece, anchorRow: number, anchorCol: number) => {
      if (boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect();
        boardCellSizeRef.current = rect.width / 8;
      }
      isDraggingRef.current = true;
      dragPieceRef.current = piece;
      grabOffsetRef.current = { row: anchorRow, col: anchorCol };
      setDragPiece(piece);
      setDragPos(null);
      setGhostPos(null);
      setIsGhostValid(false);
    },
    [],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current || !dragPieceRef.current || !boardRef.current) return;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!isDraggingRef.current || !dragPieceRef.current || !boardRef.current) return;
        const piece = dragPieceRef.current;
        const grab = grabOffsetRef.current;
        const rect = boardRef.current.getBoundingClientRect();
        const cellSize = boardCellSizeRef.current;

        const col = Math.floor((clientX - rect.left) / cellSize) - grab.col;
        const row = Math.floor((clientY - rect.top) / cellSize) - grab.row;
        const pos = { row, col };

        setGhostPos(pos);
        setIsGhostValid(canPlace(gameState.grid, piece.shape, pos));
        setDragPos({
          x: clientX - grab.col * cellSize - cellSize / 2,
          y: clientY - grab.row * cellSize - cellSize / 2,
        });
      });
    },
    [gameState.grid],
  );

  const handleDragEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (isDraggingRef.current && dragPieceRef.current && boardRef.current) {
        const piece = dragPieceRef.current;
        const grab = grabOffsetRef.current;
        const rect = boardRef.current.getBoundingClientRect();
        const cellSize = boardCellSizeRef.current;
        const col = Math.floor((clientX - rect.left) / cellSize) - grab.col;
        const row = Math.floor((clientY - rect.top) / cellSize) - grab.row;
        const pos = { row, col };

        if (canPlace(gameState.grid, piece.shape, pos)) {
          actions.placePiece(piece, pos);
        }
      }

      isDraggingRef.current = false;
      dragPieceRef.current = null;
      grabOffsetRef.current = { row: 0, col: 0 };
      setDragPiece(null);
      setDragPos(null);
      setGhostPos(null);
      setIsGhostValid(false);
    },
    [gameState.grid, actions],
  );

  const handleStartGame = useCallback(() => {
    actions.startGame();
    setPhase("playing");
  }, [actions]);

  const handlePlayAgain = useCallback(() => {
    actions.resetGame();
    setPhase("wallet");
  }, [actions]);

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

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="game-header-title">BASE BLOCK</div>
        <div className="game-header-subtitle">ON BASE NETWORK</div>
      </div>

      <ScoreBoard
        score={gameState.score}
        bestScore={gameState.bestScore}
        combo={gameState.combo}
        streak={gameState.streak}
      />

      <GameBoard
        grid={gameState.grid}
        ghostPiece={dragPiece}
        ghostPos={ghostPos}
        isGhostValid={isGhostValid}
        clearingRows={clearingRows}
        clearingCols={clearingCols}
        boardRef={boardRef}
      />

      <BlockTray
        pieces={gameState.pieces}
        draggedPieceId={dragPiece?.id ?? null}
        dragPos={dragPos}
        cellSize={boardCellSizeRef.current}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />

      <button className="btn-small" onClick={() => setShowLeaderboard(true)}>
        🏆 LEADERBOARD
      </button>
    </div>
  );
}
