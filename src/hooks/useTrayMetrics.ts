import { useState, useEffect } from 'react';

/**
 * Geometri tray dihitung sekali di sini, bukan ditebak per-komponen.
 *
 * Dua masalah yang diperbaiki hook ini:
 *  1. Blok saling berdempetan — dulu ukuran sel tray dihitung dari
 *     window.innerWidth / 12, tanpa memperhitungkan bahwa TIGA keping
 *     harus muat berdampingan. Di layar 393px hasilnya 32px/sel, jadi
 *     tiga keping selebar 4-5 sel butuh ~400px di ruang 361px → mepet.
 *  2. Keping panjang (1x5 vertikal) terpotong di bawah layar — tray
 *     tidak pernah memesan tinggi untuk keping tertinggi.
 *
 * Solusinya: pesan satu "slot" berukuran tetap untuk tiap keping, lalu
 * biarkan tiap keping menyesuaikan diri ke dalam slotnya (lihat
 * BlockShape). Keping kecil tetap besar; hanya keping 5-panjang yang
 * mengecil — persis seperti perilaku game block-puzzle pada umumnya.
 */

// Keping terpanjang di SHAPE_LIBRARY adalah 1x5 (horizontal & vertikal).
export const MAX_PIECE_SPAN = 5;
export const TRAY_SLOTS = 3;
export const PIECE_GAP = 2;
/** Padding vertikal .block-tray (0.25rem atas + 0.25rem bawah). */
export const TRAY_PAD_Y = 8;

const TRAY_MAX_WIDTH = 420;
const CELL_MIN = 14;
const CELL_MAX = 30;

export interface TrayMetrics {
  /** Lebar area yang dijatah untuk satu keping. */
  slotW: number;
  /** Tinggi area yang dijatah untuk satu keping (muat 5 sel). */
  slotH: number;
  /** Batas atas ukuran sel; keping kecil memakai ini apa adanya. */
  maxCell: number;
  /** Jarak antar slot. */
  gap: number;
  /** Tinggi border-box yang dipesan tray (slotH + padding vertikal). */
  trayH: number;
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function compute(): TrayMetrics {
  if (typeof window === 'undefined') {
    return { slotW: 100, slotH: 150, maxCell: 28, gap: 12, trayH: 150 + TRAY_PAD_Y };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Selaras dengan .block-tray di CSS: max-width min(92vw, 420px).
  const trayW = Math.min(vw * 0.92, TRAY_MAX_WIDTH);
  const gap = clamp(10, vw * 0.035, 20);
  const padding = 8;

  const slotW = (trayW - padding - gap * (TRAY_SLOTS - 1)) / TRAY_SLOTS;

  // Tray boleh memakai ~18% tinggi layar. Sel dibatasi supaya keping
  // 5-sel vertikal utuh masuk ke jatah itu tanpa perlu di-scroll.
  const cellByHeight = (vh * 0.18 - PIECE_GAP * (MAX_PIECE_SPAN - 1)) / MAX_PIECE_SPAN;
  const maxCell = Math.floor(clamp(CELL_MIN, Math.min(CELL_MAX, cellByHeight), CELL_MAX));
  const slotH = maxCell * MAX_PIECE_SPAN + PIECE_GAP * (MAX_PIECE_SPAN - 1);

  return { slotW, slotH, maxCell, gap, trayH: slotH + TRAY_PAD_Y };
}

export function useTrayMetrics(): TrayMetrics {
  const [metrics, setMetrics] = useState<TrayMetrics>(compute);

  useEffect(() => {
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setMetrics(compute()));
    }
    // Versi lama hanya menghitung saat render, jadi rotasi layar atau
    // munculnya address bar tidak pernah menyesuaikan ukuran keping.
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Beri tahu CSS berapa tinggi yang benar-benar dipesan tray, supaya
  // budget --chrome-h di .game-screen ikut akurat dan papan tidak
  // pernah mendorong tray keluar layar. Angkanya HARUS sama dengan
  // minHeight yang dipasang BlockTray — kalau beda, kotak tray ikut
  // membesar tiap keping 1x5 muncul dan papan melompat tiap giliran.
  useEffect(() => {
    document.documentElement.style.setProperty('--tray-h', `${metrics.trayH}px`);
  }, [metrics.trayH]);

  return metrics;
}
