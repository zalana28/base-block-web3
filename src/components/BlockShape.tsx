import { useRef } from 'react';
import type { BlockPiece } from '../lib/game/types.js';

interface Props {
  piece: BlockPiece;
  size?: number;
  boardCellSize?: number;
  isDraggable?: boolean;
  isDragging?: boolean;
  dragPos?: { x: number; y: number } | null;
  onDragStart?: (piece: BlockPiece, anchorRow: number, anchorCol: number, clientX: number, clientY: number) => void;
  onDragMove?: (clientX: number, clientY: number) => void;
  onDragEnd?: (clientX: number, clientY: number) => void;
}

const COLOR_MAP: Record<string, string> = {
  red: 'var(--block-red)', orange: 'var(--block-orange)',
  yellow: 'var(--block-yellow)', green: 'var(--block-green)',
  cyan: 'var(--block-cyan)', blue: 'var(--block-blue)',
  purple: 'var(--block-purple)', pink: 'var(--block-pink)',
};

const GLOW_MAP: Record<string, string> = {
  red: 'rgba(255, 56, 96, 0.45)', orange: 'rgba(255, 140, 0, 0.45)',
  yellow: 'rgba(255, 212, 0, 0.5)', green: 'rgba(0, 230, 118, 0.45)',
  cyan: 'rgba(0, 224, 255, 0.45)', blue: 'rgba(0, 82, 255, 0.45)',
  purple: 'rgba(168, 85, 247, 0.45)', pink: 'rgba(255, 79, 216, 0.45)',
};

export default function BlockShape({
  piece, size = 28, boardCellSize, isDraggable = false, isDragging = false,
  dragPos, onDragStart, onDragMove, onDragEnd,
}: Props) {
  const isPointerDown = useRef(false);
  const rows = piece.shape.length;
  const cols = piece.shape[0]?.length ?? 0;

  const getGridStyle = (sz: number): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${sz}px)`,
    gridTemplateRows: `repeat(${rows}, ${sz}px)`,
    gap: '1px',
    touchAction: 'none',
  });

  const trayStyle = getGridStyle(size);

  // Captured element: stays in tray, keeps pointer capture, never switches layout mode
  const captureStyle: React.CSSProperties = {
    ...trayStyle,
    opacity: isDragging && dragPos ? 0 : undefined,
    pointerEvents: isDragging && dragPos ? 'auto' : undefined,
  };

  // Floating clone: follows cursor, no pointer events (visual only)
  const floatStyle: React.CSSProperties | undefined =
    isDragging && dragPos
      ? {
          ...getGridStyle(boardCellSize ?? size),
          position: 'fixed',
          left: dragPos.x,
          top: dragPos.y,
          pointerEvents: 'none',
          zIndex: 100,
          willChange: 'transform',
        }
      : undefined;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable) return;
    e.preventDefault();
    isPointerDown.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Hindari getBoundingClientRect() yang bisa trigger layout flush
    const anchorCol = Math.floor((e.nativeEvent as PointerEvent).offsetX / size);
    const anchorRow = Math.floor((e.nativeEvent as PointerEvent).offsetY / size);
    const ac = Math.max(0, Math.min(cols - 1, anchorCol));
    const ar = Math.max(0, Math.min(rows - 1, anchorRow));
    onDragStart?.(piece, ar, ac, e.clientX, e.clientY);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable || !isPointerDown.current) return;
    onDragMove?.(e.clientX, e.clientY);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable || !isPointerDown.current) return;
    isPointerDown.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    onDragEnd?.(e.clientX, e.clientY);
  }

  const glow = GLOW_MAP[piece.color] ?? 'rgba(255,255,255,0.2)';
  const bg = COLOR_MAP[piece.color] ?? 'transparent';

  const cells = piece.shape.map((row, r) =>
    row.map((filled, c) => {
      const sz = boardCellSize ?? size;
      return (
        <div
          key={`${r}-${c}`}
          className={`block-shape-cell${filled ? ' filled' : ''}`}
          style={{
            width: sz, height: sz,
            background: filled ? bg : 'transparent',
            borderRadius: 4,
            boxShadow: filled ? `0 0 8px ${glow}, 0 2px 6px rgba(0,0,0,0.35)` : undefined,
          }}
        />
      );
    }),
  );

  // Render captured element + floating clone separately
  // Captured element stays in tray DOM tree (preserves pointer capture)
  // Clone is a new element that follows cursor (no pointer events)
  return (
    <>
      <div
        className="block-shape"
        style={captureStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {cells}
      </div>

      {floatStyle && (
        <div className="block-shape" style={floatStyle}>
          {cells}
        </div>
      )}
    </>
  );
}
