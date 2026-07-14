import { memo } from 'react';
import type { Grid, BlockPiece, Position, CellColor } from '../lib/game/types.js';

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

// Sub-component Cell di-memoize agar hanya re-render jika propertinya benar-benar berubah
interface CellProps {
  color?: CellColor;
  isGhost: boolean;
  isGhostValid: boolean;
  isClearing: boolean;
  isJustPlaced: boolean;
}

const Cell = memo(function Cell({
  color,
  isGhost,
  isGhostValid,
  isClearing,
  isJustPlaced,
}: CellProps) {
  const filled = color != null;

  // Empty cell (with optional ghost preview overlay)
  if (!filled) {
    if (isGhost) {
      return (
        <div className="board-cell">
          <div className={isGhostValid ? 'cell-ghost' : 'cell-ghost-invalid'} />
        </div>
      );
    }
    return (
      <div className="board-cell">
        <div className="board-cell-empty" />
      </div>
    );
  }

  // Filled 3D voxel cell
  const cls = [
    'block-3d',
    `bc-${color}`,
    isClearing ? 'row--clearing' : '',
    isJustPlaced ? 'block--dropping' : '',
  ].filter(Boolean).join(' ');

  const style: React.CSSProperties | undefined =
    isJustPlaced ? { willChange: 'transform' } : undefined;

  return (
    <div className="board-cell">
      <div className={cls} style={style}>
        {isClearing && (
          <>
            <span className="clear-spark" />
            <span className="clear-spark s2" />
          </>
        )}
      </div>
    </div>
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
      className="game-board"
    >
      {grid.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          // A cell is `CellColor | null`: null = empty, a color string = filled.
          const color = cell ?? undefined;
          const ghost = isGhostCell(rIdx, cIdx);
          const clearing = isClearingCell(rIdx, cIdx);
          const justPlaced = isJustPlaced(rIdx, cIdx);

          return (
            <Cell
              key={`${rIdx}-${cIdx}`}
              color={color}
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
