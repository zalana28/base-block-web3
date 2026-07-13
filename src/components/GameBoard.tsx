import { memo } from 'react';
import type { Grid, BlockPiece, Position } from '../lib/game/types.js';

interface Props {
  grid: Grid;
  ghostPiece?: BlockPiece | null;
  ghostPos?: Position | null;
  isGhostValid?: boolean;
  clearingRows?: number[];
  clearingCols?: number[];
  lastPlacedCells?: Position[];
  boardRef?: React.Ref<HTMLDivElement>;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
}

const COLOR_MAP: Record<string, string> = {
  red: 'var(--block-red)',
  orange: 'var(--block-orange)',
  yellow: 'var(--block-yellow)',
  green: 'var(--block-green)',
  cyan: 'var(--block-cyan)',
  blue: 'var(--block-blue)',
  purple: 'var(--block-purple)',
  pink: 'var(--block-pink)',
};

// Sub-component Cell di-memoize agar hanya re-render jika propertinya benar-benar berubah
interface CellProps {
  filled: boolean;
  color?: string;
  isGhost: boolean;
  isGhostValid: boolean;
  isClearing: boolean;
  isJustPlaced: boolean;
}

const Cell = memo(function Cell({
  filled,
  color,
  isGhost,
  isGhostValid,
  isClearing,
  isJustPlaced
}: CellProps) {
  let bg = 'transparent';
  if (filled && color) {
    bg = COLOR_MAP[color] || color;
  } else if (isGhost) {
    bg = isGhostValid ? 'rgba(0, 229, 255, 0.35)' : 'rgba(239, 68, 68, 0.3)';
  }

  const classes = [
    'w-full h-full rounded-[4px] transition-all duration-100',
    filled ? 'shadow-[inset_0_1px_3px_rgba(255,255,255,0.2)]' : 'bg-slate-900/30 border border-slate-800/40',
    isClearing ? 'row--clearing' : '',
    isJustPlaced ? 'block--dropping' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={classes} 
      style={{ 
        background: bg,
        boxShadow: filled && color ? `0 0 10px ${COLOR_MAP[color] || color}44` : undefined
      }} 
    />
  );
});

function GameBoard({
  grid,
  ghostPiece,
  ghostPos,
  isGhostValid = true,
  clearingRows = [],
  clearingCols = [],
  lastPlacedCells = [],
  boardRef,
  onPointerDown,
}: Props) {
  const isClearingCell = (row: number, col: number) =>
    clearingRows.includes(row) || clearingCols.includes(col);

  const isJustPlaced = (row: number, col: number) =>
    lastPlacedCells.some(c => c.row === row && c.col === col);

  const isGhostCell = (row: number, col: number) => {
    if (!ghostPiece || !ghostPos) return false;
    const pr = row - ghostPos.row;
    const pc = col - ghostPos.col;
    if (pr >= 0 && pr < ghostPiece.shape.length) {
      if (pc >= 0 && pc < ghostPiece.shape[pr].length) {
        return !!ghostPiece.shape[pr][pc];
      }
    }
    return false;
  };

  return (
    <div
      ref={boardRef}
      onPointerDown={onPointerDown}
      className="game-board relative grid grid-cols-10 grid-rows-10 gap-[3px] p-2 bg-slate-950/80 border border-slate-800 rounded-2xl w-full aspect-square max-w-[400px] shadow-2xl shadow-cyan-500/5 select-none"
    >
      {grid.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          const filled = cell.filled;
          const ghost = isGhostCell(rIdx, cIdx);
          const clearing = isClearingCell(rIdx, cIdx);
          const justPlaced = isJustPlaced(rIdx, cIdx);

          return (
            <Cell
              key={`${rIdx}-${cIdx}`}
              filled={filled}
              color={cell.color}
              isGhost={ghost}
              isGhostValid={isGhostValid}
              isClearing={clearing}
              isJustPlaced={justPlaced}
            />
          );
        })
      )}
    </div>
  );
}

// Ekspor komponen GameBoard yang sudah dibungkus memo secara penuh
export default memo(GameBoard);
