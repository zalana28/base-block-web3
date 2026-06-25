import { useRef } from 'react';
import type { BlockPiece } from '../lib/game/types.js';

interface Props {
  piece: BlockPiece;
  size?: number;
  isDraggable?: boolean;
  isDragging?: boolean;
  dragPos?: { x: number; y: number };
  onDragStart?: (piece: BlockPiece, anchorRow: number, anchorCol: number) => void;
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

const GLOW_MAP: Record<string, string> = {
  red: 'rgba(255, 56, 96, 0.45)',
  orange: 'rgba(255, 140, 0, 0.45)',
  yellow: 'rgba(255, 212, 0, 0.5)',
  green: 'rgba(0, 230, 118, 0.45)',
  cyan: 'rgba(0, 224, 255, 0.45)',
  blue: 'rgba(0, 82, 255, 0.45)',
  purple: 'rgba(168, 85, 247, 0.45)',
  pink: 'rgba(255, 79, 216, 0.45)',
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
  const isPointerDown = useRef(false);
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
        ...gridStyle,
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
    isPointerDown.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Compute which cell within the piece the user grabbed
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const anchorCol = Math.floor((e.clientX - rect.left) / size);
    const anchorRow = Math.floor((e.clientY - rect.top) / size);
    const clampedAnchorCol = Math.max(0, Math.min(cols - 1, anchorCol));
    const clampedAnchorRow = Math.max(0, Math.min(rows - 1, anchorRow));

    onDragStart?.(piece, clampedAnchorRow, clampedAnchorCol);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable || !isPointerDown.current) return;
    onDragMove?.(e.clientX, e.clientY);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable || !isPointerDown.current) return;
    isPointerDown.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    onDragEnd?.(e.clientX, e.clientY);
  }

  const glowColor = GLOW_MAP[piece.color ?? ""] ?? 'rgba(255,255,255,0.2)';

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
          const bg = filled ? COLOR_MAP[piece.color ?? ""] ?? 'transparent' : 'transparent';
          return (
            <div
              key={`${r}-${c}`}
              className={`block-shape-cell${filled ? ' filled' : ''}`}
              style={{
                width: size,
                height: size,
                background: bg,
                borderRadius: 2,
                boxShadow: filled ? `0 0 8px ${glowColor}, 0 2px 6px rgba(0,0,0,0.35)` : undefined,
              }}
            />
          );
        }),
      )}
    </div>
  );
}
