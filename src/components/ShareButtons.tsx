// Base Block — score share buttons (X + Farcaster). Pure overlay; never affects layout.
// Area 3.5.
import { useCallback } from 'react';

interface Props {
  score: number;
  streak?: number;
  compact?: boolean;
}

const SITE_URL = 'https://base-block.biz.id';

export default function ShareButtons({ score, streak = 0, compact = false }: Props) {
  const buildShare = useCallback(() => {
    const text = `I scored ${score} in BASE BLOCK \u{1F9F1} / Streak ${streak}x on Base`;
    const url = SITE_URL;
    return { text, url, og: `${SITE_URL}/api/og?score=${score}&streak=${streak}` };
  }, [score, streak]);

  const onX = useCallback(() => {
    const { text, url } = buildShare();
    const u = new URL('https://x.com/intent/post');
    u.searchParams.set('text', text);
    u.searchParams.set('url', url);
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  }, [buildShare]);

  const onFarcaster = useCallback(() => {
    const { text, og } = buildShare();
    const u = new URL('https://warpcast.com/~/compose');
    u.searchParams.set('text', text);
    u.searchParams.set('embeds[]', og);
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  }, [buildShare]);

  const btnClass = compact ? 'secondary share-btn compact' : 'secondary share-btn';

  return (
    <div className="share-row" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
      <button className={btnClass} onClick={onX} aria-label="Share score on X">
        <span>𝕏</span> <span>{compact ? 'X' : 'Share on X'}</span>
      </button>
      <button className={btnClass} onClick={onFarcaster} aria-label="Share score on Farcaster">
        <span>🔵</span> <span>{compact ? 'Warpcast' : 'Share on Farcaster'}</span>
      </button>
    </div>
  );
}
