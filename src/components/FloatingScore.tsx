// Base Block — floating "+N" score popup on line clear (Area 1.2).
// Absolutely positioned overlay; never affects layout. Unmounts after anim.
import { useEffect, useState } from 'react';

export interface FloatScoreItem {
  id: number;
  text: string;
  x: number; // px relative to board wrapper
  y: number; // px relative to board wrapper
  big?: boolean;
}

interface Props {
  items: FloatScoreItem[];
}

export default function FloatingScore({ items }: Props) {
  // Keep mounted items briefly so the exit animation can run; we just render
  // whatever the parent passes and let CSS handle the fade.
  const [, force] = useState(0);
  useEffect(() => { if (items.length) force((n) => n + 1); }, [items]);

  return (
    <div className="floating-score-layer" aria-hidden="true">
      {items.map((it) => (
        <div
          key={it.id}
          className={`floating-score${it.big ? ' big' : ''}`}
          style={{ left: it.x, top: it.y }}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}
