import type { BlockPiece } from '../lib/game/types.js';
import BlockShape from './BlockShape.js';

interface Props {
  pieces: (BlockPiece | null)[];
  size?: number;
}

export default function NextTray({ pieces, size = 18 }: Props) {
  const visible = pieces.filter((p): p is BlockPiece => p !== null);
  if (visible.length === 0) return null;

  return (
    <div className="next-tray" aria-label="Next pieces preview">
      <span
        style={{
          fontSize: 9,
          color: 'var(--text-dim)',
          letterSpacing: 1,
          marginBottom: 4,
          display: 'block',
          textAlign: 'center',
        }}
      >
        NEXT
      </span>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          opacity: 0.55,
        }}
      >
        {visible.map((piece) => (
          <div key={piece.id} style={{ pointerEvents: 'none' }}>
            <BlockShape piece={piece} size={size} />
          </div>
        ))}
      </div>
    </div>
  );
}
