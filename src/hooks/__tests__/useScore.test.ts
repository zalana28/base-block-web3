import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useScore } from '../useScore.js';

// jsdom di setup ini tidak menyediakan localStorage, dan useScore menelan
// kegagalannya lewat try/catch — jadi tanpa stub semua assertion penyimpanan
// akan lolos secara palsu. Stub in-memory ini yang membuat tes ini berarti.
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

const keyOf = (scope: string) => `base-block-best:${scope}`;

beforeEach(() => {
  localStorage.clear();
});

describe('useScore — rekor dipisah per wallet dan per mode', () => {
  it('menyimpan rekor ke key milik scope-nya sendiri', () => {
    const { result } = renderHook(() => useScore('0xA:0'));

    act(() => result.current.addScore(1200));

    expect(localStorage.getItem(keyOf('0xA:0'))).toBe('1200');
    expect(result.current.bestScore).toBe(1200);
  });

  it('ganti wallet di tengah run tidak mewariskan skor ke wallet baru', () => {
    // Ini regresi yang sebenarnya: effect persist memakai `scope` yang BARU
    // tapi membandingkan dengan `bestScore` milik scope LAMA, jadi commit
    // berikutnya menulis skor wallet A ke key wallet B.
    const { result, rerender } = renderHook(({ scope }) => useScore(scope), {
      initialProps: { scope: '0xA:0' },
    });

    act(() => result.current.addScore(5000));
    expect(localStorage.getItem(keyOf('0xA:0'))).toBe('5000');

    rerender({ scope: '0xB:0' });

    expect(localStorage.getItem(keyOf('0xB:0'))).toBeNull();
    expect(localStorage.getItem(keyOf('0xA:0'))).toBe('5000');
    expect(result.current.bestScore).toBe(0);
    expect(result.current.score).toBe(0);
  });

  it('rekor wallet lama utuh saat balik lagi ke wallet itu', () => {
    const { result, rerender } = renderHook(({ scope }) => useScore(scope), {
      initialProps: { scope: '0xA:0' },
    });

    act(() => result.current.addScore(5000));
    rerender({ scope: '0xB:0' });
    act(() => result.current.addScore(300));

    expect(localStorage.getItem(keyOf('0xB:0'))).toBe('300');

    rerender({ scope: '0xA:0' });
    expect(result.current.bestScore).toBe(5000);
    expect(result.current.bestAtStart).toBe(5000);
  });

  it('rekor Classic tidak bocor ke Arcade', () => {
    const { result, rerender } = renderHook(({ scope }) => useScore(scope), {
      initialProps: { scope: '0xA:0' },
    });

    act(() => result.current.addScore(900));
    rerender({ scope: '0xA:1' }); // wallet sama, mode Arcade

    expect(result.current.bestScore).toBe(0);
    expect(localStorage.getItem(keyOf('0xA:1'))).toBeNull();
  });
});

describe('useScore — bestAtStart membuat "NEW BEST!" jujur', () => {
  it('bestAtStart tetap rekor SEBELUM run, walau bestScore sudah naik', () => {
    const { result } = renderHook(() => useScore('0xA:0'));

    act(() => result.current.addScore(700));

    // Tanpa snapshot ini, layar game over membandingkan score dengan
    // bestScore yang sudah ikut naik ke 700 — jadi selalu "NEW BEST!".
    expect(result.current.bestScore).toBe(700);
    expect(result.current.bestAtStart).toBe(0);
  });

  it('reset() mengambil snapshot rekor baru untuk run berikutnya', () => {
    const { result } = renderHook(() => useScore('0xA:0'));

    act(() => result.current.addScore(700));
    act(() => result.current.reset());

    expect(result.current.score).toBe(0);
    expect(result.current.bestAtStart).toBe(700);

    // Run kedua dengan skor lebih rendah bukan rekor baru.
    act(() => result.current.addScore(400));
    expect(result.current.score).toBeLessThan(result.current.bestAtStart);
    expect(result.current.bestScore).toBe(700);
  });
});
