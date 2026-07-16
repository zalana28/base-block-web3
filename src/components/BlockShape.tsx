import { useRef, memo } from 'react';
import { createPortal } from 'react-dom';
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

const TAP_THRESHOLD_PX = 4;
const LIFT_OFFSET_Y_RATIO = 0.8; // Lift block above finger by 0.8x cellSize

function BlockShape({
  piece, size = 28, boardCellSize, isDraggable = false, isDragging = false,
  isSelected = false, dragPos, onDragStart, onDragMove, onDragEnd, onSelectPiece,
}: Props) {
  const isPointerDown = useRef(false);
  const hasDragged = useRef(false);
  const startClientPos = useRef<{ x: number; y: number } | null>(null);
  const startOffset = useRef<{ x: number; y: number } | null>(null);
  const rows = piece.shape.length;
  const cols = piece.shape[0]?.length ?? 0;

  // Responsive cell size for TRAY — derived from BOTH viewport width and
  // height so the tray stays inside short desktop viewports too.
  const trayCellSize = typeof window !== 'undefined'
    ? Math.max(20, Math.min(32, Math.floor(Math.min(window.innerWidth / 12, window.innerHeight / 22))))
    : size;

  const getGridStyle = (sz: number): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${sz}px)`,
    gridTemplateRows: `repeat(${rows}, ${sz}px)`,
    gap: '1px',
    touchAction: 'none',
  });

  const trayStyle = getGridStyle(trayCellSize);

  // Tray element: hides when dragging (opacity 0) but keeps pointer capture
  const captureStyle: React.CSSProperties = {
    ...trayStyle,
    opacity: isDragging && dragPos ? 0 : undefined,
    pointerEvents: isDragging && dragPos ? 'auto' : undefined,
  };

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
        if (startOffset.current) {
          const anchorCol = Math.floor(startOffset.current.x / trayCellSize);
          const anchorRow = Math.floor(startOffset.current.y / trayCellSize);
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
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    if (hasDragged.current) {
      onDragEnd?.(e.clientX, e.clientY);
    } else {
      onSelectPiece?.(piece.id);
    }
    hasDragged.current = false;
    startClientPos.current = null;
    startOffset.current = null;
  }

  const glow = GLOW_MAP[piece.color] ?? 'rgba(255,255,255,0.2)';
  const bg = COLOR_MAP[piece.color] ?? 'transparent';

  // Tray cells — same HD beveled look as the board via .hd-block + --c
  const trayCells = piece.shape.map((row, r) =>
    row.map((filled, c) => (
      <div
        key={`${r}-${c}`}
        className={`block-shape-cell${filled ? ' hd-block' : ''}`}
        style={{
          width: trayCellSize,
          height: trayCellSize,
          ...(filled ? ({ '--c': bg } as React.CSSProperties) : {}),
        }}
      />
    )),
  );

  // Selection halo
  const selectionStyle: React.CSSProperties = isSelected && !isDragging
    ? { filter: `drop-shadow(0 0 8px ${glow}) drop-shadow(0 0 16px ${glow})` }
    : {};

  // Floating clone — rendered via Portal to document.body
  // Uses transform: translate3d for smooth GPU positioning
  const floatCellSize = boardCellSize ?? trayCellSize;
  const liftY = floatCellSize * LIFT_OFFSET_Y_RATIO;

  const floatingElement = (isDragging && dragPos && boardCellSize) ? (
    <div
      className="floating-drag-piece"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        willChange: 'transform',
        transform: `translate3d(${dragPos.x}px, ${dragPos.y - liftY}px, 0)`,
        ...getGridStyle(boardCellSize),
        opacity: 0.9,
        filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.6)) drop-shadow(0 0 12px rgba(0,229,255,0.3))',
        transition: 'none',
      }}
    >
      {piece.shape.map((row, r) =>
        row.map((filled, c) => (
          <div
            key={`${r}-${c}`}
            className={`block-shape-cell${filled ? ' hd-block' : ''}`}
            style={{
              width: boardCellSize,
              height: boardCellSize,
              ...(filled ? ({ '--c': bg } as React.CSSProperties) : {}),
            }}
          />
        )),
      )}
    </div>
  ) : null;

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
        {trayCells}
      </div>

      {/* Portal floating piece to body — bypasses all parent transforms/overflow */}
      {floatingElement && createPortal(floatingElement, document.body)}
    </>
  );
}

export default memo(BlockShape);
