import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildChunks,
  mapWithConcurrency,
  decodeLogs,
  dedupeBestScore,
  sortEntries,
  mergeAndRank,
  isRateLimitError,
  isRetryableError,
  withRetry,
  leaderboardCacheKey,
  readCache,
  writeCache,
  type ScoreEntry,
} from '../leaderboard.js';

const addr = (n: number) => `0x${n.toString(16).padStart(40, '0')}` as const;

function entry(partial: Partial<ScoreEntry> & Pick<ScoreEntry, 'player' | 'score'>): ScoreEntry {
  return {
    mode: 0,
    level: 1,
    timestamp: 0,
    blockNumber: 1,
    txHash: '0x0',
    ...partial,
  };
}

describe('buildChunks', () => {
  it('memecah range menjadi chunk berukuran sama', () => {
    expect(buildChunks(1n, 30n, 10n)).toEqual([
      { from: 1n, to: 10n },
      { from: 11n, to: 20n },
      { from: 21n, to: 30n },
    ]);
  });

  it('tidak boleh ada chunk lebih besar dari ukuran maksimum', () => {
    for (const c of buildChunks(0n, 25_000n, 10_000n)) {
      expect(c.to - c.from + 1n).toBeLessThanOrEqual(10_000n);
    }
  });

  it('menangani from === to (satu blok)', () => {
    expect(buildChunks(5n, 5n, 10_000n)).toEqual([{ from: 5n, to: 5n }]);
  });

  it('menangani from > to dengan hasil kosong', () => {
    expect(buildChunks(10n, 5n, 10n)).toEqual([]);
  });
});

describe('mapWithConcurrency', () => {
  it('memproses semua item dan menjaga urutan', async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });

  it('bekerja pada array kosong', async () => {
    const out = await mapWithConcurrency([], 4, async (n) => n);
    expect(out).toEqual([]);
  });

  it('tidak melebihi limit konkurensi', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 3, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 1));
      active--;
      return n;
    });
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('decodeLogs', () => {
  it('mengubah log mentah menjadi ScoreEntry', () => {
    const logs = [
      {
        args: { player: addr(1), mode: 1, score: 1200n, level: 7n, timestamp: 100n },
        blockNumber: 42n,
        transactionHash: '0xabc',
      },
    ];
    const decoded = decodeLogs(logs);
    expect(decoded).toHaveLength(1);
    expect(decoded[0]).toMatchObject({
      player: addr(1),
      mode: 1,
      score: 1200,
      level: 7,
      timestamp: 100,
      blockNumber: 42,
      txHash: '0xabc',
    });
  });

  it('melewati log tanpa player atau score tidak valid', () => {
    expect(
      decodeLogs([
        { args: {}, blockNumber: 1n },
        { args: { player: addr(1), score: 0n } },
        { args: { player: addr(2), score: -1n } },
        { args: { player: addr(3), score: 9007199254740993n } },
      ]),
    ).toHaveLength(0);
  });
});

describe('dedupeBestScore', () => {
  it('mengambil skor tertinggi per wallet per mode', () => {
    const entries = [
      entry({ player: addr(1), mode: 0, score: 100, blockNumber: 1 }),
      entry({ player: addr(1), mode: 0, score: 250, blockNumber: 2 }),
      entry({ player: addr(1), mode: 1, score: 500, blockNumber: 3 }),
    ];
    const out = dedupeBestScore(entries);
    expect(out).toHaveLength(2);
    expect(out.find((e) => e.mode === 0)?.score).toBe(250);
    expect(out.find((e) => e.mode === 1)?.score).toBe(500);
  });

  it('tie-break ke blok pertama yang tercatat', () => {
    const entries = [
      entry({ player: addr(1), mode: 0, score: 100, blockNumber: 10 }),
      entry({ player: addr(1), mode: 0, score: 100, blockNumber: 5 }),
    ];
    expect(dedupeBestScore(entries)[0].blockNumber).toBe(5);
  });

  it('case-insensitive terhadap alamat', () => {
    const a = entry({ player: addr(1), mode: 0, score: 100 });
    const b = entry({ player: addr(1).toLowerCase() as `0x${string}`, mode: 0, score: 200 });
    expect(dedupeBestScore([a, b])).toHaveLength(1);
  });
});

describe('sortEntries / mergeAndRank', () => {
  const rows = [
    entry({ player: addr(1), score: 100 }),
    entry({ player: addr(2), score: 900 }),
    entry({ player: addr(3), score: 400 }),
  ];

  it('mengurutkan score turun dan memotong limit', () => {
    expect(sortEntries(rows, 2).map((e) => e.score)).toEqual([900, 400]);
  });

  it('merge tanpa duplikat dan mempertahankan kapasitas', () => {
    const more = [entry({ player: addr(1), score: 300 })];
    const merged = mergeAndRank(rows, more, 3);
    expect(merged.map((e) => e.score)).toEqual([900, 400, 300]);
  });

  it('tie-break: blockNumber terkecil di depan saat skor sama', () => {
    const tied = [
      entry({ player: addr(1), score: 100, blockNumber: 9 }),
      entry({ player: addr(2), score: 100, blockNumber: 3 }),
    ];
    expect(sortEntries(tied, 10)[0].player).toBe(addr(2));
  });
});

describe('error classification & retry', () => {
  it('mengenali 429 sebagai rate limit', () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError(new Error('over rate limit'))).toBe(true);
    expect(isRateLimitError({ cause: { status: 429 } })).toBe(true);
  });

  it('tidak mengenali error biasa sebagai rate limit', () => {
    expect(isRateLimitError(new Error('boom'))).toBe(false);
  });

  it('mengenali error jaringan sebagai retryable', () => {
    expect(isRetryableError(new Error('request timeout'))).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
    expect(isRetryableError(new Error('invalid argument'))).toBe(false);
  });

  it('withRetry mengembalikan hasil bila akhirnya sukses', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce('ok');
    await expect(withRetry(fn, 3)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('withRetry menyerah setelah maxRetries dan melempar error asli', async () => {
    const err = { status: 503, message: 'service unavailable' };
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, 2)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('withRetry langsung melempar error non-retryable', async () => {
    const err = new Error('boom');
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, 3)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('localStorage cache', () => {
  const key = leaderboardCacheKey(8453, '0xEC8FB28Ec5D1F2be0d00b2293d6BF10B533fA49E');

  function createStorageShim() {
    const store = new Map<string, string>();
    return {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    };
  }

  beforeEach(() => {
    // jsdom di Node 22 kadang tidak mengekspos localStorage global;
    // pasang shim in-memory agar readCache/writeCache teruji nyata.
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorageShim(),
      configurable: true,
      writable: true,
    });
  });

  it('menulis dan membaca kembali cache', () => {
    const data = { lastScannedBlock: '49233635', entries: [entry({ player: addr(1), score: 10 })] };
    writeCache(key, data);
    expect(readCache(key)).toEqual(data);
  });

  it('mengembalikan null untuk data korup', () => {
    localStorage.setItem(key, 'not json');
    expect(readCache(key)).toBeNull();
  });

  it('mengembalikan null untuk bentuk yang salah', () => {
    localStorage.setItem(key, JSON.stringify({ lastScannedBlock: 123 }));
    expect(readCache(key)).toBeNull();
  });

  it('kunci cache berbeda per chain / kontrak', () => {
    expect(leaderboardCacheKey(1, '0xA')).not.toBe(leaderboardCacheKey(8453, '0xA'));
    expect(leaderboardCacheKey(8453, '0xA')).not.toBe(leaderboardCacheKey(8453, '0xB'));
  });
});
