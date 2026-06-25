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
  // const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ghostPos, setGhostPos] = useState<Position | null>(null);
  const [isGhostValid, setIsGhostValid] = useState(false);

  // Clearing animation state (from last clear)
  const [clearingRows] = useState<number[]>([]);
  const [clearingCols] = useState<number[]>([]);

  const [gameState, actions] = useGameState();
  const boardRef = useRef<HTMLDivElement>(null);

  // Transition to 'over' when game phase changes to 'over'
  useEffect(() => {
    if (gameState.phase === 'over') {
      setPhase('over');
    }
  }, [gameState.phase]);

  // Handle drag start
  const handleDragStart = useCallback((piece: BlockPiece) => {
    setDragPiece(piece);
    setIsDragging(true);
    setGhostPos(null);
    setIsGhostValid(false);
  }, []);

  // Handle drag move — update ghost preview on board
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

      /* drag visual position unused */
    },
    [isDragging, dragPiece, gameState.grid],
  );

  // Handle drag end — place piece if valid
  const handleDragEnd = useCallback(
    (_clientX: number, _clientY: number) => {
      if (!isDragging || !dragPiece) {
        setIsDragging(false);
        setDragPiece(null);
        setGhostPos(null);
        return;
      }

      if (isGhostValid && ghostPos) {
        const success = actions.placePiece(dragPiece, ghostPos);
        if (success) {
          // Trigger clearing animation
          // The grid update happens in gameState, we capture the clear from the state
          // For now, just reset drag
        }
      }

      setIsDragging(false);
      setDragPiece(null);
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

  // Show leaderboard overlay
  if (showLeaderboard) {
    return <Leaderboard onClose={() => setShowLeaderboard(false)} />;
  }

  // Wallet / start screen
  if (phase === 'wallet') {
    return (
      <WalletGate
        onReady={handleStartGame}
        onViewLeaderboard={() => setShowLeaderboard(true)}
      />
    );
  }

  // Game over screen
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
        gap: '8px',
        padding: '8px',
        width: '100%',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative' }}>
        <div
          ref={boardRef}
          onPointerMove={isDragging ? (e) => handleDragMove(e.clientX, e.clientY) : undefined}
          onPointerUp={isDragging ? (e) => handleDragEnd(e.clientX, e.clientY) : undefined}
        >
          <GameBoard
            grid={gameState.grid}
            ghostPiece={isDragging ? dragPiece : null}
            ghostPos={ghostPos}
            isGhostValid={isGhostValid}
            clearingRows={clearingRows}
            clearingCols={clearingCols}
          />
        </div>
        <ScoreBoard
          score={gameState.score}
          bestScore={gameState.bestScore}
          combo={gameState.combo}
          streak={gameState.streak}
        />
      </div>

      <BlockTray
        pieces={gameState.pieces}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />

      {/* Leaderboard button */}
      <button
        className="secondary"
        style={{ marginTop: '8px', fontSize: '8px', padding: '8px 16px', minWidth: 0 }}
        onClick={() => setShowLeaderboard(true)}
      >
        LEADERBOARD
      </button>
    </div>
  );
}