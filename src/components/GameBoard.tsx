import type { RefObject } from 'react';
import type { Grid, BlockPiece, Position } from '../lib/game/types.js';

interface Props {
  grid: Grid;
  ghostPiece?: BlockPiece | null;
  ghostPos?: Position | null;
  isGhostValid?: boolean;
  clearingRows?: number[];
  clearingCols?: number[];
  boardRef?: RefObject<HTMLDivElement | null>;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
}

const COLOR_MAP: Record<string, string> = {
  red: 'var(--block-red)', orange: 'var(--block-orange)',
  yellow: 'var(--block-yellow)', green: 'var(--block-green)',
  cyan: 'var(--block-cyan)', blue: 'var(--block-blue)',
  purple: 'var(--block-purple)', pink: 'var(--block-pink)',
};

export default function GameBoard({
  grid, ghostPiece, ghostPos, isGhostValid,
  clearingRows = [], clearingCols = [], boardRef, onPointerDown,
}: Props) {
  const isClearingCell = (row: number, col: number) =>
    clearingRows.includes(row) || clearingCols.includes(col);

  const isGhostCell = (row: number, col: number) => {
    if (!ghostPiece || !ghostPos) return false;
    const pr = row - ghostPos.row;
    const pc = col - ghostPos.col;
    return (
      pr >= 0 && pr < ghostPiece.shape.length &&
      pc >= 0 && pc < (ghostPiece.shape[0]?.length ?? 0) &&
      ghostPiece.shape[pr][pc]
    );
  };

  return (
    <div
      ref={boardRef}
      className="game-board"
      aria-label="Game board"
      onPointerDown={onPointerDown}
    >
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const color = grid[row][col];
          const isClearing = isClearingCell(row, col);
          const isGhost = isGhostCell(row, col);
          const ghostClass = isGhost ? (isGhostValid ? 'ghost-valid' : 'ghost-invalid') : '';
          const cellClass = [
            'cell',
            color ? 'filled' : '',
            ghostClass,
            isClearing ? 'clearing' : '',
          ].filter(Boolean).join(' ');

          const style: React.CSSProperties = {};
          if (color) style.background = COLOR_MAP[color] ?? 'transparent';

          return (
            <div
              key={`${row}-${col}`}
              className={cellClass}
              style={style}
              aria-label={
                color
                  ? `${color} cell at row ${row + 1} col ${col + 1}`
                  : `empty cell at row ${row + 1} col ${col + 1}`
              }
            />
          );
        }),
      )}
    </div>
  );
}
