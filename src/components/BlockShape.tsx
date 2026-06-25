import type { BlockPiece } from '../lib/game/types.js';

interface Props {
  piece: BlockPiece;
  size?: number;
  isDraggable?: boolean;
  isDragging?: boolean;
  dragPos?: { x: number; y: number };
  onDragStart?: (piece: BlockPiece) => void;
  onDragMove?: (clientX: number, clientY: number) => void;
  onDragEnd?: (clientX: number, clientY: number) => void;
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

export default function BlockShape({
  piece,
  size = 28,
  isDraggable = false,
  isDragging = false,
  dragPos,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const rows = piece.shape.length;
  const cols = piece.shape[0]?.length ?? 0;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${size}px)`,
    gridTemplateRows: `repeat(${rows}, ${size}px)`,
    gap: '1px',
  };

  const draggingStyle: React.CSSProperties | undefined = isDragging && dragPos
    ? {
        position: 'fixed' as const,
        left: dragPos.x,
        top: dragPos.y,
        pointerEvents: 'none' as const,
        zIndex: 100,
      }
    : undefined;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onDragStart?.(piece);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable || !isDragging) return;
    onDragMove?.(e.clientX, e.clientY);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    onDragEnd?.(e.clientX, e.clientY);
  }

  return (
    <div
      className="block-shape"
      style={draggingStyle ?? gridStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {piece.shape.map((row, r) =>
        row.map((filled, c) => {
          const bg = filled ? COLOR_MAP[piece.color ?? ''] ?? 'transparent' : 'transparent';
          return (
            <div
              key={`${r}-${c}`}
              className={`block-shape-cell${filled ? ' filled' : ''}`}
              style={{
                width: size,
                height: size,
                background: bg,
                borderRadius: 2,
              }}
            />
          );
        }),
      )}
    </div>
  );
}