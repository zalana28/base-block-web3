import { useState, useRef, useCallback, useEffect } from 'react';
import type { BlockPiece, Position } from './lib/game/types.js';
import { canPlace } from './lib/game/grid.js';
import { useGameState } from './hooks/useGameState.js';
import GameBoard from './components/GameBoard.js';
import BlockTray from './components/BlockTray.js';
import ScoreBoard from './components/ScoreBoard.js';
import GameOverModal from './components/GameOverModal.js';
import WalletGate from './components/WalletGate.js';
import Leaderboard from './components/Leaderboard.js';

type AppPhase = 'wallet' | 'playing' | 'over';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('wallet');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Drag state
  const [dragPiece, setDragPiece] = useState<BlockPiece | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [ghostPos, setGhostPos] = useState<Position | null>(null);
  const [isGhostValid, setIsGhostValid] = useState(false);

  // Clearing animation state
  const [clearingRows] = useState<number[]>([]);
  const [clearingCols] = useState<number[]>([]);

  const [gameState, actions] = useGameState();
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState.phase === 'over') {
      setPhase('over');
    }
  }, [gameState.phase]);

  const handleDragStart = useCallback((piece: BlockPiece) => {
    setDragPiece(piece);
    setIsDragging(true);
    setDragPos(null);
    setGhostPos(null);
    setIsGhostValid(false);
  }, []);

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || !dragPiece || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const cellSize = rect.width / 8;
      const col = Math.floor((clientX - rect.left) / cellSize);
      const row = Math.floor((clientY - rect.top) / cellSize);
      const clampedRow = Math.max(0, Math.min(7, row));
      const clampedCol = Math.max(0, Math.min(7, col));
      const pos = { row: clampedRow, col: clampedCol };
      setGhostPos(pos);
      setIsGhostValid(canPlace(gameState.grid, dragPiece.shape, pos));
      setDragPos({
        x: clientX - (dragPiece.shape[0]?.length ?? 0) * 14,
        y: clientY - dragPiece.shape.length * 14,
      });
    },
    [isDragging, dragPiece, gameState.grid],
  );

  const handleDragEnd = useCallback(
    (_clientX: number, _clientY: number) => {
      if (!isDragging || !dragPiece) {
        setIsDragging(false);
        setDragPiece(null);
        setGhostPos(null);
        return;
      }
      if (isGhostValid && ghostPos) {
        actions.placePiece(dragPiece, ghostPos);
      }
      setIsDragging(false);
      setDragPiece(null);
      setDragPos(null);
      setGhostPos(null);
      setIsGhostValid(false);
    },
    [isDragging, dragPiece, isGhostValid, ghostPos, actions],
  );

  const handleStartGame = useCallback(() => {
    actions.startGame();
    setPhase('playing');
  }, [actions]);

  const handlePlayAgain = useCallback(() => {
    actions.resetGame();
    setPhase('wallet');
  }, [actions]);

  if (showLeaderboard) {
    return <Leaderboard onClose={() => setShowLeaderboard(false)} />;
  }

  if (phase === 'wallet') {
    return (
      <WalletGate
        onReady={handleStartGame}
        onViewLeaderboard={() => setShowLeaderboard(true)}
      />
    );
  }

  if (phase === 'over') {
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0px',
        padding: '8px',
        width: '100%',
        position: 'relative',
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

      {/* Game board */}
      <div ref={boardRef}>
        <GameBoard
          grid={gameState.grid}
          ghostPiece={isDragging ? dragPiece : null}
          ghostPos={ghostPos}
          isGhostValid={isGhostValid}
          clearingRows={clearingRows}
          clearingCols={clearingCols}
        />
      </div>

      {/* Block tray */}
      <BlockTray
        pieces={gameState.pieces}
        draggedPieceId={dragPiece?.id ?? null}
        dragPos={dragPos}
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
