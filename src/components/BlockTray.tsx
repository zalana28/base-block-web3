import type { BlockPiece } from "../lib/game/types.js";
import BlockShape from "./BlockShape.js";

interface Props {
  pieces: (BlockPiece | null)[];
  draggedPieceId: string | null;
  dragPos: { x: number; y: number } | null;
  cellSize?: number;
  onDragStart: (piece: BlockPiece, anchorRow: number, anchorCol: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
}

export default function BlockTray({
  pieces,
  draggedPieceId,
  dragPos,
  cellSize = 28,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  return (
    <div className="block-tray" aria-label="Block tray">
      {pieces.map((piece, i) => {
        const isDragged = draggedPieceId === piece?.id;
        const pieceDragPos = isDragged ? dragPos ?? undefined : undefined;
        return (
          <div
            key={i}
            className={`tray-slot${piece ? " filled" : ""}`}
            aria-label={piece ? `Piece ${i + 1}: ${piece.name}` : `Empty slot ${i + 1}`}
          >
            {piece ? (
              <BlockShape
                piece={piece}
                size={isDragged ? cellSize : 28}
                isDraggable
                isDragging={isDragged}
                dragPos={pieceDragPos}
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
