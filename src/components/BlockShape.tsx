import { useRef } from 'react';
import type { BlockPiece } from '../lib/game/types.js';

interface Props {
  piece: BlockPiece;
  size?: number;
  boardCellSize?: number;
  isDraggable?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
  dragPos?: { x: number; y: number } | null;
  onDragStart?: (piece: BlockPiece, anchorRow: number, anchorCol: number, clientX: number, clientY: number) => void;
  onDragMove?: (clientX: number, clientY: number) => void;
  onDragEnd?: (clientX: number, clientY: number) => void;
  onSelectPiece?: (pieceId: string | null) => void;
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

const TAP_THRESHOLD_PX = 6;

export default function BlockShape({
  piece, size = 28, boardCellSize, isDraggable = false, isDragging = false,
  isSelected = false, dragPos, onDragStart, onDragMove, onDragEnd, onSelectPiece,
}: Props) {
  const isPointerDown = useRef(false);
  const hasDragged = useRef(false);
  const startClientPos = useRef<{ x: number; y: number } | null>(null);
  const startOffset = useRef<{ x: number; y: number } | null>(null);
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
    hasDragged.current = false;
    startClientPos.current = { x: e.clientX, y: e.clientY };

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    startOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable || !isPointerDown.current) return;

    if (!hasDragged.current && startClientPos.current) {
      const dx = e.clientX - startClientPos.current.x;
      const dy = e.clientY - startClientPos.current.y;
      if (Math.hypot(dx, dy) > TAP_THRESHOLD_PX) {
        hasDragged.current = true;
        // Convert to drag start
        if (startOffset.current) {
          const anchorCol = Math.floor(startOffset.current.x / size);
          const anchorRow = Math.floor(startOffset.current.y / size);
          const ac = Math.max(0, Math.min(cols - 1, anchorCol));
          const ar = Math.max(0, Math.min(rows - 1, anchorRow));
          onDragStart?.(piece, ar, ac, e.clientX, e.clientY);
        }
      }
    }

    if (hasDragged.current) {
      onDragMove?.(e.clientX, e.clientY);
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggable || !isPointerDown.current) return;
    isPointerDown.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}

    if (hasDragged.current) {
      onDragEnd?.(e.clientX, e.clientY);
    } else {
      // Treat as tap: select/deselect piece
      onSelectPiece?.(piece.id);
    }
    hasDragged.current = false;
    startClientPos.current = null;
    startOffset.current = null;
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

  // Selection halo applied to the captured element
  const selectionStyle: React.CSSProperties = isSelected && !isDragging
    ? {
        filter: `drop-shadow(0 0 8px ${glow}) drop-shadow(0 0 16px ${glow})`,
      }
    : {};

  return (
    <>
      <div
        className={`block-shape${isSelected && !isDragging ? ' selected' : ''}`}
        style={{ ...captureStyle, ...selectionStyle }}
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
