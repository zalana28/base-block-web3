import type { BlockPiece } from '../lib/game/types.js';
import BlockShape from './BlockShape.js';

interface Props {
  pieces: (BlockPiece | null)[];
  draggedPieceId: string | null;
  dragPos: { x: number; y: number } | null;
  onDragStart: (piece: BlockPiece) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
}

export default function BlockTray({
  pieces,
  draggedPieceId,
  dragPos,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  return (
    <div className="block-tray" aria-label="Block tray">
      {pieces.map((piece, i) => (
        <div
          key={i}
          className={`tray-slot${piece ? ' filled' : ''}`}
          aria-label={piece ? `Piece ${i + 1}: ${piece.name}` : `Empty slot ${i + 1}`}
        >
          {piece ? (
            <BlockShape
              piece={piece}
              isDraggable
              isDragging={draggedPieceId === piece.id}
              dragPos={draggedPieceId === piece.id ? dragPos ?? undefined : undefined}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}