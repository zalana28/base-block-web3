// Base Block — cheap particle burst on line clear (Area 1.5).
// Small absolutely-positioned divs translated outward on random vectors,
// fading over ~500ms, then removed by the parent. Hard cap ~80 simultaneous.
import { useMemo } from 'react';

export interface ParticleItem {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface Props {
  particles: ParticleItem[];
}

// Deterministic-ish vectors from a seed so each particle flies a different way.
function vec(seed: number) {
  const ang = (seed * 137.508) % 360;
  const dist = 24 + (seed * 13) % 30; // 24-54px
  const rad = (ang * Math.PI) / 180;
  return { dx: Math.cos(rad) * dist, dy: Math.sin(rad) * dist };
}

export default function Particles({ particles }: Props) {
  const styled = useMemo(
    () => particles.map((p, i) => ({ ...p, ...vec(i + p.id) })),
    [particles],
  );
  return (
    <div className="particle-layer" aria-hidden="true">
      {styled.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: p.x,
            top: p.y,
            background: p.color,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
