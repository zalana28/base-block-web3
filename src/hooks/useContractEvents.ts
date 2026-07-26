import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http } from 'viem';
import { base } from '../config/chain.js';
import { GAME_CONTRACT_ABI } from '../config/contract.js';

interface Entry {
  player: string;
  score: number;
  level: number;
  mode: number;
}

// Base RPC publik menerima rentang 10k blok per eth_getLogs.
const BLOCK_CHUNK = 10_000n;
// Base ~2 detik/blok → 0,5 blok/detik. 500.000 blok ≈ 11,6 hari.
// JANGAN dikecilkan: angka ini menentukan ISI papan peringkat, bukan biaya
// RPC. Mengecilkannya ke 200.000 menghapus entri pemain yang masih valid.
// Efisiensi sudah didapat dari BLOCK_CHUNK 10k + CONCURRENCY + cache.
const LOOKBACK_BLOCKS = 500_000n;
// Batasi request paralel supaya tidak kena rate limit.
const CONCURRENCY = 5;
const MAX_TOP = 20;
const CACHE_TTL_MS = 60_000;

const client = createPublicClient({
  chain: base,
  transport: http(),
});

const GAME_COMPLETED_EVENT = GAME_CONTRACT_ABI.find(
  (item) => item.type === 'event' && item.name === 'GameCompleted',
)!;

let cache: { key: string; at: number; entries: Entry[] } | null = null;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export function useContractEvents({ address }: { address: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const fetchLeaderboard = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!force && cache && cache.key === address && Date.now() - cache.at < CACHE_TTL_MS) {
        setEntries(cache.entries);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const currentBlock = await client.getBlockNumber();
        const fromBlock =
          currentBlock > LOOKBACK_BLOCKS ? currentBlock - LOOKBACK_BLOCKS : 0n;

        // Bangun daftar rentang dulu, lalu ambil paralel. Versi lama
        // menembak ~100 request berurutan tiap leaderboard dibuka.
        const ranges: { from: bigint; to: bigint }[] = [];
        for (let start = fromBlock; start <= currentBlock; start += BLOCK_CHUNK) {
          const end = start + BLOCK_CHUNK - 1n > currentBlock ? currentBlock : start + BLOCK_CHUNK - 1n;
          ranges.push({ from: start, to: end });
        }

        const chunks = await mapWithConcurrency(ranges, CONCURRENCY, (range) =>
          client.getLogs({
            address: address as `0x${string}`,
            event: GAME_COMPLETED_EVENT,
            fromBlock: range.from,
            toBlock: range.to,
          }),
        );

        // viem sudah mendekode args dari ABI — tidak perlu parsing hex manual
        // maupun filter topic0 tangan (viem memfilternya server-side).
        const decoded: Entry[] = [];
        for (const logs of chunks) {
          for (const log of logs) {
            const args = log.args as {
              player?: string;
              mode?: number;
              score?: bigint;
              level?: bigint;
            };
            if (!args?.player || args.score === undefined) continue;
            const score = Number(args.score);
            if (!Number.isFinite(score) || score <= 0) continue;
            decoded.push({
              player: args.player,
              mode: Number(args.mode ?? 0),
              score,
              level: Number(args.level ?? 0),
            });
          }
        }

        const best = new Map<string, Entry>();
        for (const entry of decoded) {
          const key = `${entry.player.toLowerCase()}-${entry.mode}`;
          const existing = best.get(key);
          if (!existing || entry.score > existing.score) best.set(key, entry);
        }

        const sorted = Array.from(best.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_TOP);

        cache = { key: address, at: Date.now(), entries: sorted };
        if (aliveRef.current) setEntries(sorted);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (aliveRef.current) setError(msg);
      } finally {
        if (aliveRef.current) setIsLoading(false);
      }
    },
    [address],
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    entries,
    isLoading,
    error,
    refetch: () => fetchLeaderboard({ force: true }),
  };
}
