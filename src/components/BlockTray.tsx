import type { BlockPiece } from '../lib/game/types.js';
import BlockShape from './BlockShape.js';

interface Props {
  pieces: (BlockPiece | null)[];
  draggedPieceId: string | null;
  selectedPieceId?: string | null;
  dragPos: { x: number; y: number } | null;
  cellSize?: number;
  onDragStart: (piece: BlockPiece, anchorRow: number, anchorCol: number, clientX: number, clientY: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
  onSelectPiece?: (pieceId: string | null) => void;
}

export default function BlockTray({
  pieces, draggedPieceId, selectedPieceId = null, dragPos, cellSize = 28,
  onDragStart, onDragMove, onDragEnd, onSelectPiece,
}: Props) {
  return (
    <div className="block-tray" aria-label="Block tray">
      {pieces.map((piece, i) => {
        if (!piece) return null;
        const isDragged = draggedPieceId === piece.id;
        const isSelected = selectedPieceId === piece.id;
        return (
          <BlockShape
            key={piece.id ?? `piece-${i}`}
            piece={piece}
            size={28}
            boardCellSize={isDragged ? cellSize : undefined}
            isDraggable
            isDragging={isDragged}
            isSelected={isSelected}
            dragPos={isDragged ? dragPos : null}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onSelectPiece={onSelectPiece}
          />
        );
      })}
    </div>
  );
}
