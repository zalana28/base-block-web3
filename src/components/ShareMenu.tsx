import { useCallback, useEffect, useRef, useState } from 'react';
import ShareIcon from './icons/ShareIcon.js';
import XIcon from './icons/XIcon.js';
import FarcasterIcon from './icons/FarcasterIcon.js';

interface Props {
  score: number;
  streak?: number;
}

const SITE_URL = 'https://base-block.biz.id';
const POPOVER_GAP = 8;
// Dimensi popover sesuai CSS: 2 item @40px + gap 6px + padding 12px.
const POPOVER_W = 98;
const POPOVER_H = 52;

interface Position {
  top: number;
  left: number;
}

// Base Block — satu tombol Share yang membuka popover kecil berisi pilihan
// platform (X + Farcaster), icon-only. Membuka menu TIDAK menyentuh state
// submit score / blockchain. Popover diposisikan fixed (dihitung dari posisi
// tombol) supaya tidak ter-clip overlay/panel dan tidak keluar viewport.
export default function ShareMenu({ score, streak = 0 }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const buildShare = useCallback(() => {
    const text = `I scored ${score} in BASE BLOCK 🧱 / Streak ${streak}x on Base`;
    const url = SITE_URL;
    return { text, url, og: `${SITE_URL}/api/og?score=${score}&streak=${streak}` };
  }, [score, streak]);

  const shareToX = useCallback(() => {
    const { text, url } = buildShare();
    const u = new URL('https://x.com/intent/post');
    u.searchParams.set('text', text);
    u.searchParams.set('url', url);
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  }, [buildShare]);

  const shareToFarcaster = useCallback(() => {
    const { text, og } = buildShare();
    const u = new URL('https://warpcast.com/~/compose');
    u.searchParams.set('text', text);
    u.searchParams.set('embeds[]', og);
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  }, [buildShare]);

  const close = useCallback(() => {
    setIsOpen(false);
    setPos(null);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((open) => {
      if (open) {
        setPos(null);
        return false;
      }
      const root = rootRef.current;
      if (!root) return true;
      const trigger = root.querySelector<HTMLElement>('.share-menu-trigger') ?? root;
      const tr = trigger.getBoundingClientRect();
      const gap = POPOVER_GAP;
      let top = tr.bottom + gap;
      let left = tr.left + tr.width / 2 - POPOVER_W / 2;
      // Ruang bawah sempit → popover muncul di atas tombol.
      if (top + POPOVER_H > window.innerHeight - gap) {
        top = tr.top - gap - POPOVER_H;
      }
      // Jangan keluar viewport horizontal.
      if (left < gap) left = gap;
      if (left + POPOVER_W > window.innerWidth - gap) left = window.innerWidth - gap - POPOVER_W;
      setPos({ top, left });
      return true;
    });
  }, []);

  // Tutup: Escape, klik di luar, scroll/resize (posisi fixed jadi basi).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onDismiss = () => close();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
  }, [isOpen, close]);

  const onX = useCallback(() => {
    shareToX();
    close();
  }, [shareToX, close]);

  const onFarcaster = useCallback(() => {
    shareToFarcaster();
    close();
  }, [shareToFarcaster, close]);

  return (
    <div className="share-menu" ref={rootRef}>
      <button
        type="button"
        className="share-menu-trigger"
        aria-label="Share score"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Share"
        onClick={toggle}
      >
        <ShareIcon />
      </button>

      {isOpen && pos && (
        <div
          className="share-menu-popover"
          role="menu"
          aria-label="Share score"
          style={{ top: pos.top, left: pos.left }}
        >
          <button
            type="button"
            className="share-menu-item share-menu-x"
            role="menuitem"
            aria-label="Share to X"
            title="Share to X"
            onClick={onX}
          >
            <XIcon />
          </button>
          <button
            type="button"
            className="share-menu-item share-menu-farcaster"
            role="menuitem"
            aria-label="Share to Farcaster"
            title="Share to Farcaster"
            onClick={onFarcaster}
          >
            <FarcasterIcon />
          </button>
        </div>
      )}
    </div>
  );
}

