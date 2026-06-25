import type { BlockPiece } from '../lib/game/types.js';
import BlockShape from './BlockShape.js';

interface Props {
  pieces: (BlockPiece | null)[];
  draggedPieceId: string | null;
  dragPos: { x: number; y: number } | null;
  cellSize?: number;
  onDragStart: (piece: BlockPiece, anchorRow: number, anchorCol: number, clientX: number, clientY: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
}

export default function BlockTray({
  pieces, draggedPieceId, dragPos, cellSize = 28,
  onDragStart, onDragMove, onDragEnd,
}: Props) {
  return (
    <div className="block-tray" aria-label="Block tray">
      {pieces.map((piece, i) => {
        const isDragged = piece ? draggedPieceId === piece.id : false;
        return (
          <div
            key={`slot-${i}`}
            className={`tray-slot${piece ? ' filled' : ''}${isDragged ? ' dragging' : ''}`}
            aria-label={piece ? `Piece ${i + 1}: ${piece.name}` : `Empty slot ${i + 1}`}
          >
            {piece ? (
              <BlockShape
                piece={piece}
                size={28}
                boardCellSize={isDragged ? cellSize : undefined}
                isDraggable
                isDragging={isDragged}
                dragPos={isDragged ? dragPos : null}
                onDragStart={onDragStart}
                onDragMove={onDragMove}
                onDragEnd={onDragEnd}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
