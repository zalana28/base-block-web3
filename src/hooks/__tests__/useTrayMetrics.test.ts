import { renderHook } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import {
  useTrayMetrics,
  MAX_PIECE_SPAN,
  TRAY_SLOTS,
  PIECE_GAP,
  TRAY_PAD_Y,
} from '../useTrayMetrics.js';

/** Ukuran layar HP yang umum, termasuk yang sempit dan yang pendek. */
const VIEWPORTS = [
  { name: 'iPhone SE', w: 375, h: 667 },
  { name: 'Pixel / iPhone 14', w: 393, h: 852 },
  { name: 'Android sempit', w: 360, h: 640 },
  { name: 'Layar pendek (landscape)', w: 740, h: 360 },
  { name: 'Desktop', w: 1440, h: 900 },
];

function setViewport(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}

/** Ukuran sel yang dipakai BlockShape untuk satu keping di dalam slotnya. */
function cellFor(
  rows: number,
  cols: number,
  m: { slotW: number; slotH: number; maxCell: number },
): number {
  const fitW = (m.slotW - PIECE_GAP * (cols - 1)) / cols;
  const fitH = (m.slotH - PIECE_GAP * (rows - 1)) / rows;
  return Math.max(12, Math.floor(Math.min(m.maxCell, fitW, fitH)));
}

afterEach(() => {
  setViewport(1024, 768);
});

describe('useTrayMetrics', () => {
  it.each(VIEWPORTS)(
    'tiga slot + jarak selalu muat di lebar tray ($name)',
    ({ w, h }) => {
      setViewport(w, h);
      const { result } = renderHook(() => useTrayMetrics());
      const m = result.current;

      const trayWidth = Math.min(w * 0.92, 420);
      const used = m.slotW * TRAY_SLOTS + m.gap * (TRAY_SLOTS - 1) + 8;

      // Inilah akar masalah "blok rapet banget": dulu ukuran sel dihitung
      // tanpa tahu tiga keping harus berbagi lebar yang sama.
      expect(used).toBeLessThanOrEqual(trayWidth + 0.01);
      expect(m.slotW).toBeGreaterThan(0);
    },
  );

  it.each(VIEWPORTS)(
    'keping terpanjang tidak pernah keluar dari slotnya ($name)',
    ({ w, h }) => {
      setViewport(w, h);
      const { result } = renderHook(() => useTrayMetrics());
      const m = result.current;

      // 1x5 horizontal — kasus yang dulu bikin keping berdempetan.
      const hCell = cellFor(1, MAX_PIECE_SPAN, m);
      const hWidth = hCell * MAX_PIECE_SPAN + PIECE_GAP * (MAX_PIECE_SPAN - 1);
      expect(hWidth).toBeLessThanOrEqual(m.slotW + 0.01);

      // 1x5 vertikal — kasus yang dulu terpotong di bawah layar.
      const vCell = cellFor(MAX_PIECE_SPAN, 1, m);
      const vHeight = vCell * MAX_PIECE_SPAN + PIECE_GAP * (MAX_PIECE_SPAN - 1);
      expect(vHeight).toBeLessThanOrEqual(m.slotH + 0.01);

      // 3x3 — keping besar tapi bukan yang terpanjang.
      const bigCell = cellFor(3, 3, m);
      expect(bigCell * 3 + PIECE_GAP * 2).toBeLessThanOrEqual(m.slotW + 0.01);
    },
  );

  it('keping kecil tetap memakai ukuran penuh, tidak ikut mengecil', () => {
    setViewport(393, 852);
    const { result } = renderHook(() => useTrayMetrics());
    const m = result.current;

    // Yang mengecil hanya keping yang benar-benar tidak muat. 1x1 dan 2x2
    // harus tetap di ukuran maksimum supaya tray tidak terlihat kerdil.
    expect(cellFor(1, 1, m)).toBe(m.maxCell);
    expect(cellFor(2, 2, m)).toBe(m.maxCell);
    expect(cellFor(1, MAX_PIECE_SPAN, m)).toBeLessThan(m.maxCell);
  });

  it('menulis tinggi tray yang dipesan ke CSS supaya papan ikut menyesuaikan', () => {
    setViewport(393, 852);
    const { result } = renderHook(() => useTrayMetrics());
    const reserved = document.documentElement.style.getPropertyValue('--tray-h');
    expect(reserved).toBe(`${result.current.trayH}px`);
  });

  it.each(VIEWPORTS)(
    'trayH = slotH + padding, jadi keping tertinggi tidak pernah membesarkan kotak tray ($name)',
    ({ w, h }) => {
      setViewport(w, h);
      const { result } = renderHook(() => useTrayMetrics());
      const m = result.current;

      // minHeight inline di BlockTray dan --tray-h harus angka border-box
      // yang SAMA. Kalau tidak, tray membesar tiap keping 1x5 vertikal
      // muncul, .game-screen re-center, dan papan melompat tiap giliran.
      expect(m.trayH).toBe(m.slotH + TRAY_PAD_Y);

      const vCell = cellFor(MAX_PIECE_SPAN, 1, m);
      const vHeight = vCell * MAX_PIECE_SPAN + PIECE_GAP * (MAX_PIECE_SPAN - 1);
      expect(vHeight + TRAY_PAD_Y).toBeLessThanOrEqual(m.trayH + 0.01);
    },
  );
});
