import type { BlockPiece } from '../lib/game/types.js';
import BlockShape from './BlockShape.js';

interface Props {
  pieces: (BlockPiece | null)[];
  size?: number;
}

export default function NextTray({ pieces, size = 18 }: Props) {
  if (!pieces || pieces.length === 0) return null;
  const visible = pieces.filter((p): p is BlockPiece => p !== null);
  if (visible.length === 0) return null;

  return (
    <div className="next-tray" aria-label="Next pieces preview">
      <span className="next-tray-label">NEXT</span>
      <div className="next-tray-pieces">
        {visible.map((piece) => (
          <div key={piece.id} className="next-tray-piece">
            <BlockShape piece={piece} size={size} />
          </div>
        ))}
      </div>
    </div>
  );
}
