import { useState, useRef, useCallback, useEffect } from "react";
import type { BlockPiece, Position } from "./lib/game/types.js";
import { canPlace } from "./lib/game/grid.js";
import { canPlaceAnyOfPieces } from "./lib/game/validator.js";
import { useGameState } from "./hooks/useGameState.js";
import {
  sfxPlace,
  sfxClear,
  sfxCombo,
  sfxGameOver,
  sfxSelect,
  setMuted
} from "./lib/audio.js";
import { useGameContract } from "./hooks/useGameContract.js";
import GameBoard from "./components/GameBoard.js";
import BlockTray from "./components/BlockTray.js";
import ScoreBoard from "./components/ScoreBoard.js";
import GameOverModal from "./components/GameOverModal.js";
import WalletGate from "./components/WalletGate.js";
import Leaderboard from "./components/Leaderboard.js";
import ComboEffect from "./components/ComboEffect.js";
import { haptic } from "./lib/haptics.js";

// Font loading hook
function useFontReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setReady(true));
    } else {
      // Fallback: assume ready after 2s
      const t = setTimeout(() => setReady(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);
  return ready;
}

type AppPhase = "wallet" | "playing" | "over";
type GameOverReason = 'no-moves' | 'time-up';

interface DragState {
  piece: BlockPiece | null;
  pos: { x: number; y: number } | null;
  ghost: Position | null;
}

export default function App() {
  const fontReady = useFontReady();
  const { address, isConnected, startGameOnChain, submitScoreOnChain } = useGameContract();
  
  const [phase, setPhase] = useState<AppPhase>("wallet");
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('no-moves');
  const [shake, setShake] = useState(false);
  const [scoreBumping, setScoreBumping] = useState(false);

  // Core Game State
  const {
    grid,
    score,
    combo,
    highScore,
    trayPieces,
    placePiece,
    clearLines,
    resetGame,
    refillTray,
    setScore,
    setCombo
  } = useGameState();

  const [dragState, setDragState] = useState<DragState>({
    piece: null,
    pos: null,
    ghost: null
  });

  const [txPending, setTxPending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync wallet state with game phases
  useEffect(() => {
    if (!isConnected) {
      setPhase("wallet");
    } else if (phase === "wallet") {
      setPhase("playing");
    }
  }, [isConnected]);

  // Audio settings sync
  useEffect(() => {
    setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Handle Game Over Check
  useEffect(() => {
    if (phase !== "playing") return;

    const activePieces = trayPieces.filter(p => !p.placed);
    if (activePieces.length > 0) {
      const hasMoves = canPlaceAnyOfPieces(grid, activePieces.map(p => p.piece));
      if (!hasMoves) {
        sfxGameOver();
        haptic.gameOver();
        setPhase("over");
        setGameOverReason('no-moves');
        handleGameOverSubmission();
      }
    }
  }, [grid, trayPieces, phase]);

  const handleGameOverSubmission = async () => {
    if (score > 0) {
      try {
        setTxPending(true);
        await submitScoreOnChain(BigInt(score));
      } catch (err) {
        console.error("Failed to submit score:", err);
      } finally {
        setTxPending(false);
      }
    }
  };

  const handleStartGame = async () => {
    try {
      setTxPending(true);
      await startGameOnChain();
      resetGame();
      setPhase("playing");
    } catch (err) {
      console.error("Failed to start game:", err);
      // Fallback start offline if tx fails/rejected
      resetGame();
      setPhase("playing");
    } finally {
      setTxPending(false);
    }
  };

  const handleDragStart = useCallback((piece: BlockPiece, clientX: number, clientY: number) => {
    sfxSelect();
    setDragState({
      piece,
      pos: { x: clientX, y: clientY },
      ghost: null
    });
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number, gridX: number | null, gridY: number | null) => {
    if (!dragState.piece) return;

    let ghost: Position | null = null;
    if (gridX !== null && gridY !== null) {
      const canBePlaced = canPlace(grid, dragState.piece, gridX, gridY);
      if (canBePlaced) {
        ghost = { x: gridX, y: gridY };
      }
    }

    setDragState(prev => ({
      ...prev,
      pos: { x: clientX, y: clientY },
      ghost
    }));
  }, [dragState.piece, grid]);

  const handleDragEnd = useCallback((trayIndex: number) => {
    const { piece, ghost } = dragState;
    if (piece && ghost) {
      // 1. Place piece
      placePiece(ghost.x, ghost.y, piece, trayIndex);
      sfxPlace();
      haptic.place();

      // 2. Clear lines & count combos
      const cleared = clearLines();
      if (cleared > 0) {
        sfxClear();
        haptic.clear();
        setScoreBumping(true);
        setTimeout(() => setScoreBumping(false), 300);

        const newCombo = combo + 1;
        setCombo(newCombo);
        
        if (newCombo >= 2) {
          sfxCombo();
          haptic.combo(newCombo);
          setShake(true);
          setTimeout(() => setShake(false), 300);
        }
      } else {
        setCombo(0);
      }

      // 3. Auto refill tray if all used
      const remaining = trayPieces.filter((p, idx) => idx !== trayIndex ? !p.placed : false);
      if (remaining.length === 0) {
        refillTray();
      }
    }

    setDragState({ piece: null, pos: null, ghost: null });
  }, [dragState, placePiece, clearLines, trayPieces, refillTray, combo, setCombo]);

  if (!fontReady) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-400 font-mono text-xl animate-pulse">
          LOADING SYSTEM...
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black ${shake ? 'shake' : ''}`}>
      {/* Background Matrix/Grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_95%,rgba(6,182,212,0.05)_95%),linear-gradient(to_right,rgba(0,0,0,0)_95%,rgba(6,182,212,0.05)_95%)] bg-[size:30px_30px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="font-black text-black text-lg">B</span>
          </div>
          <div>
            <h1 className="font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-lg leading-none">
              BASE BLOCK
            </h1>
            <span className="text-[10px] font-mono text-cyan-500/80 tracking-widest uppercase">
              Web3 Edition
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white transition-colors"
            title={soundEnabled ? "Mute Sound" : "Unmute Sound"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
          <WalletGate />
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 p-4 max-w-6xl mx-auto w-full relative z-10">
        
        {phase === "wallet" ? (
          <div className="text-center py-12 px-6 max-w-md bg-slate-950/60 border border-slate-800 rounded-2xl backdrop-blur-md">
            <h2 className="text-2xl font-black mb-2 text-cyan-400">CONNECT WALLET TO PLAY</h2>
            <p className="text-slate-400 mb-6 text-sm">
              Please connect your Coinbase or Web3 wallet to start scoring blocks and claiming onchain achievements on Base.
            </p>
            <div className="flex justify-center">
              <WalletGate />
            </div>
          </div>
        ) : (
          <>
            {/* Left side: Game and Controls */}
            <div className="flex flex-col items-center gap-6 w-full max-w-[420px]">
              <ScoreBoard score={score} highScore={highScore} isBumping={scoreBumping} />

              <GameBoard
                grid={grid}
                dragState={dragState}
                onDragMove={handleDragMove}
              />

              <BlockTray
                trayPieces={trayPieces}
                dragState={dragState}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            </div>

            {/* Right side: Leaderboard / Live Stats */}
            <div className="w-full md:w-80 h-[500px] bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col backdrop-blur-md">
              <Leaderboard />
            </div>
          </>
        )}
      </main>import { useState, useRef, useCallback, useEffect } from "react";
import type { BlockPiece, Position } from "./lib/game/types.js";
import { canPlace } from "./lib/game/grid.js";
import { canPlaceAnyOfPieces } from "./lib/game/validator.js";
import { useGameState } from "./hooks/useGameState.js";
import {
  sfxPlace,
  sfxClear,
  sfxCombo,
  sfxGameOver,
  sfxSelect,
  setMuted
} from "./lib/audio.js";
import { useGameContract } from "./hooks/useGameContract.js";
import GameBoard from "./components/GameBoard.js";
import BlockTray from "./components/BlockTray.js";
import ScoreBoard from "./components/ScoreBoard.js";
import GameOverModal from "./components/GameOverModal.js";
import WalletGate from "./components/WalletGate.js";
import Leaderboard from "./components/Leaderboard.js";
import ComboEffect from "./components/ComboEffect.js";
import { haptic } from "./lib/haptics.js";

function useFontReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => setReady(true));
    } else {
      const t = setTimeout(() => setReady(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);
  return ready;
}

type AppPhase = "wallet" | "playing" | "over";
type GameOverReason = 'no-moves' | 'time-up';

interface DragState {
  piece: BlockPiece | null;
  pos: { x: number; y: number } | null;
  ghost: Position | null;
}

export default function App() {
  const fontReady = useFontReady();
  const [phase, setPhase] = useState<AppPhase>("wallet");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shake, setShake] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>('no-moves');
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const {
    grid,
    trayPieces,
    setTrayPieces,
    placePieceOnGrid,
    clearCompleteLines,
    regenerateTrayIfEmpty,
    resetGame: resetGameState
  } = useGameState();

  const {
    isRegistered,
    isRegistering,
    registerPlayer,
    submitScore,
    txPending
  } = useGameContract();

  const [dragState, setDragState] = useState<DragState>({
    piece: null,
    pos: null,
    ghost: null
  });

  const checkGameOver = useCallback((currentTray: (BlockPiece | null)[]) => {
    const activePieces = currentTray.filter((p): p is BlockPiece => p !== null);
    if (activePieces.length === 0) return;

    const hasMoves = canPlaceAnyOfPieces(grid, activePieces);
    if (!hasMoves) {
      sfxGameOver();
      haptic.gameOver();
      setGameOverReason('no-moves');
      setPhase("over");
      submitScore(score).catch((err) => {
        console.error("Failed to auto-submit score:", err);
      });
    }
  }, [grid, score, submitScore]);

  const handleDragStart = useCallback((piece: BlockPiece, clientX: number, clientY: number) => {
    sfxSelect();
    setDragState({
      piece,
      pos: { x: clientX, y: clientY },
      ghost: null
    });
  }, []);

  const handleDragEnd = useCallback((gridX: number, gridY: number) => {
    const { piece } = dragState;
    if (!piece) return;

    if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && canPlace(grid, piece, gridX, gridY)) {
      placePieceOnGrid(piece, gridX, gridY);
      sfxPlace();
      haptic.place();

      const linesCleared = clearCompleteLines();
      let nextScore = score + (piece.shape.filter(row => row.filter(Boolean).length > 0).length * 10);

      if (linesCleared > 0) {
        sfxClear();
        haptic.clear();
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        
        if (nextCombo >= 2) {
          sfxCombo();
          haptic.combo(nextCombo);
          setShake(true);
          setTimeout(() => setShake(false), 300);
        }

        const comboBonus = linesCleared * 100 * nextCombo;
        nextScore += comboBonus;
      } else {
        setCombo(0);
      }

      setScore(nextScore);

      const updatedTray = trayPieces.map(p => p?.id === piece.id ? null : p);
      setTrayPieces(updatedTray);

      const nextTray = regenerateTrayIfEmpty(updatedTray);
      checkGameOver(nextTray);
    }

    setDragState({ piece: null, pos: null, ghost: null });
  }, [dragState, grid, score, combo, trayPieces, placePieceOnGrid, clearCompleteLines, setTrayPieces, regenerateTrayIfEmpty, checkGameOver]);

  const handleStartGame = useCallback(() => {
    resetGameState();
    setScore(0);
    setCombo(0);
    setPhase("playing");
  }, [resetGameState]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    setMuted(nextMuted);
  }, [isAudioMuted]);

  if (!fontReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-cyan-400 font-mono">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent mx-auto"></div>
          <p className="text-sm tracking-widest animate-pulse">LOADING CODES...</p>
        </div>
      </div>
    );
  }

  if (phase === "wallet") {
    return (
      <WalletGate
        onStartGame={handleStartGame}
        isRegistered={isRegistered}
        isRegistering={isRegistering}
        onRegister={registerPlayer}
      />
    );
  }

  return (
    <main className={`relative flex min-h-screen w-screen flex-col items-center justify-center bg-slate-950 px-4 py-6 md:py-12 select-none overflow-x-hidden ${shake ? 'shake' : ''}`}>
      <div className="relative flex w-full max-w-5xl flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
        
        {/* Left/Middle side: Game Area */}
        <div className="flex flex-col items-center gap-6">
          <ScoreBoard
            score={score}
            isMuted={isAudioMuted}
            onToggleMute={toggleMute}
          />

          <GameBoard
            grid={grid}
            dragState={dragState}
            setDragState={setDragState}
            onDragEnd={handleDragEnd}
          />

          <BlockTray
            trayPieces={trayPieces}
            dragState={dragState}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </div>

        {/* Right side: Leaderboard */}
        <div className="w-full md:w-80 h-[500px] bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col backdrop-blur-md">
          <Leaderboard />
        </div>
      </div>

      {/* Overlays / Modals */}
      {phase === "over" && (
        <GameOverModal
          score={score}
          reason={gameOverReason}
          txPending={txPending}
          onRestart={handleStartGame}
        />
      )}

      {/* Floating Combo Alerts */}
      <ComboEffect combo={combo} />
    </main>
  );
}


      {/* Overlays / Modals */}
      {phase === "over" && (
        <GameOverModal
          score={score}
          reason={gameOverReason}
          txPending={txPending}
          onRestart={handleStartGame}
        />
      )}

      {/* Floating Combo Alerts */}
      <ComboEffect combo={combo} />
    </div>
  );
}
