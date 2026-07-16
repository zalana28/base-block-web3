import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BlockPiece } from '../../lib/game/types.js';

// Deterministic tray: three 1x1 "dot" pieces so placements never depend on
// the random generator and the game-over check can never fire mid-test.
vi.mock('../useBlockGenerator.js', () => ({
  useBlockGenerator: () => ({
    pieces: [
      { id: 't1', name: 'dot', shape: [[true]], color: 'cyan' },
      { id: 't2', name: 'dot', shape: [[true]], color: 'cyan' },
      { id: 't3', name: 'dot', shape: [[true]], color: 'cyan' },
    ],
    nextPieces: [null, null, null],
    regenerate: vi.fn(),
    markUsed: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

import { useGameState } from '../useGameState.js';

const dot = (id: string): BlockPiece => ({
  id,
  name: 'dot',
  shape: [[true]],
  color: 'cyan',
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useGameState', () => {
  it('rejects placement while a clear animation is in flight (H2)', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGameState());
    act(() => {
      result.current[1].startGame(0);
    });

    // Fill row 0 except the last cell — no clears yet.
    for (let col = 0; col < 7; col++) {
      let ok = false;
      act(() => {
        ok = result.current[1].placePiece(dot(`a${col}`), { row: 0, col });
      });
      expect(ok).toBe(true);
    }

    // Completing the row starts the 320ms clear animation; grid update deferred.
    let ok = false;
    act(() => {
      ok = result.current[1].placePiece(dot('a7'), { row: 0, col: 7 });
    });
    expect(ok).toBe(true);
    expect(result.current[0].clearingRows).toContain(0);

    // A placement inside the clear window must be rejected (previously it was
    // validated against the stale grid, awarded points, then vanished).
    act(() => {
      ok = result.current[1].placePiece(dot('b0'), { row: 1, col: 0 });
    });
    expect(ok).toBe(false);

    // After the animation applies, the row is gone and placement works again.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current[0].clearingRows).toHaveLength(0);
    expect(result.current[0].grid[0].every((c) => c === null)).toBe(true);
    act(() => {
      ok = result.current[1].placePiece(dot('b1'), { row: 1, col: 0 });
    });
    expect(ok).toBe(true);
  });

  it('levels up on the scoring move that crosses the threshold (L1)', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGameState());
    act(() => {
      result.current[1].startGame(1); // arcade — level-ups live here
    });

    // Clear rows until score crosses the 500-point level threshold.
    let crossed = false;
    for (let row = 0; row < 8 && !crossed; row++) {
      for (let col = 0; col < 8; col++) {
        act(() => {
          result.current[1].placePiece(dot(`r${row}c${col}`), { row, col });
        });
        // Let the clear animation apply before the next placement.
        act(() => {
          vi.advanceTimersByTime(400);
        });
        if (result.current[0].score >= 500) {
          crossed = true;
          break;
        }
      }
    }

    expect(crossed).toBe(true);
    // Level 2 must be active immediately after the crossing move — the old
    // code read the pre-move score and only leveled on the FOLLOWING move.
    expect(result.current[0].level).toBe(2);
  });

  it('freezes the arcade countdown while paused (H3)', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) => useGameState(paused),
      { initialProps: { paused: false } },
    );
    act(() => {
      result.current[1].startGame(1);
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const afterFive = result.current[0].timeLeft;
    expect(afterFive).toBe(85);

    rerender({ paused: true });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current[0].timeLeft).toBe(afterFive);

    rerender({ paused: false });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current[0].timeLeft).toBe(afterFive - 3);
  });
});
