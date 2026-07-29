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
  hintCells?: Position[] | null;
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
  isHint: boolean;
}

const Cell = memo(function Cell({
  filled,
  color,
  isGhost,
  isGhostValid,
  isClearing,
  isJustPlaced,
  isHint
}: CellProps) {
  // Filled cells use the shared .hd-block treatment driven by --c.
  const colorVar = filled && color ? COLOR_MAP[color] || color : undefined;

  const classes = [
    'board-cell',
    colorVar ? 'hd-block' : '',
    !colorVar && isGhost ? (isGhostValid ? 'ghost-valid' : 'ghost-invalid') : '',
    isClearing ? 'row--clearing' : '',
    isJustPlaced ? 'block--dropping' : '',
    isHint ? 'hint-cell' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={colorVar ? ({ '--c': colorVar } as React.CSSProperties) : undefined}
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
  hintCells = null,
  boardRef,
  onPointerDown,
}: Props) {
  const isClearingCell = (row: number, col: number) =>
    clearingRows.includes(row) || clearingCols.includes(col);

  const isJustPlaced = (row: number, col: number) =>
    lastPlacedCells.some(c => c.row === row && c.col === col);

  const isHintCell = (row: number, col: number) =>
    !!hintCells && hintCells.some(c => c.row === row && c.col === col);

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
      className="game-board relative grid grid-cols-8 grid-rows-8 gap-[3px] p-2 bg-slate-950/80 border border-slate-800 rounded-2xl w-full aspect-square max-w-[400px] shadow-2xl shadow-cyan-500/5 select-none"
    >
      {grid.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          // A cell is `CellColor | null`: null = empty, a color string = filled.
          const filled = cell !== null;
          const ghost = isGhostCell(rIdx, cIdx);
          const clearing = isClearingCell(rIdx, cIdx);
          const justPlaced = isJustPlaced(rIdx, cIdx);
          const hint = isHintCell(rIdx, cIdx);

          return (
            <Cell
              key={`${rIdx}-${cIdx}`}
              filled={filled}
              color={cell ?? undefined}
              isGhost={ghost}
              isGhostValid={isGhostValid}
              isClearing={clearing}
              isJustPlaced={justPlaced}
              isHint={hint}
            />
          );
        })
      )}
    </div>
  );
}

// Ekspor komponen GameBoard yang sudah dibungkus memo secara penuh
export default memo(GameBoard);
