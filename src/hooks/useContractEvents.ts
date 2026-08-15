import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient } from 'viem';
import { base } from '../config/chain.js';
import { GAME_CONTRACT_DEPLOYED_BLOCK } from '../config/contract.js';
import { createLeaderboardTransport } from '../config/rpc.js';
import {
  fetchLeaderboardLogs,
  mergeAndRank,
  leaderboardCacheKey,
  readCache,
  writeCache,
  type ScoreEntry,
} from '../lib/leaderboard.js';

// Client dibuat SEKALI di level modul — tidak dibuat ulang per render.
// Transport memakai fallback RPC (env var VITE_BASE_RPC_URL + RPC publik Base).
const client = createPublicClient({
  chain: base,
  transport: createLeaderboardTransport(),
});

const MAX_TOP = 20;
const CACHE_CAP = 200;

export type LeaderboardError = 'failed' | 'refresh-failed' | null;

export const LEADERBOARD_INVALIDATE_EVENT = 'leaderboard:invalidate';

/**
 * Invalidate in-memory/localStorage leaderboard cache and notify all listeners to refresh
 */
export function invalidateLeaderboardCache(address?: string): void {
  try {
    if (typeof window !== 'undefined') {
      if (address) {
        localStorage.removeItem(leaderboardCacheKey(base.id, address));
      }
      window.dispatchEvent(new CustomEvent(LEADERBOARD_INVALIDATE_EVENT));
    }
  } catch {
    // Ignore storage errors
  }
}

// Membaca leaderboard dari event GameCompleted di Base Mainnet.
// - Query dimulai dari blok deployment kontrak, bukan block 0.
// - eth_getLogs di-chunk (≤10k blok/request) dengan retry + backoff.
// - Cache incremental di localStorage: simpan lastScannedBlock, request
//   berikutnya hanya scan blok baru sampai latest.
// - Membaca data publik — TIDAK butuh wallet connected.
export function useContractEvents({ address }: { address: string }) {
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LeaderboardError>(null);
  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      // Cegah request ganda (mis. buka modal cepat / RETRY berulang).
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const chainId = base.id;
      const cacheKey = leaderboardCacheKey(chainId, address);
      const cached = readCache(cacheKey);

      setIsLoading(true);
      setError(null);

      try {
        const currentBlock = await client.getBlockNumber();

        // Mulai scan dari blok deployment kecuali sudah punya cache valid
        // (maka cukup lanjut dari lastScannedBlock + 1).
        let fromScan = GAME_CONTRACT_DEPLOYED_BLOCK;
        if (!force && cached && cached.lastScannedBlock) {
          const last = BigInt(cached.lastScannedBlock);
          fromScan = last + 1n;
        }

        let scanned: ScoreEntry[] = [];
        if (fromScan <= currentBlock) {
          scanned = await fetchLeaderboardLogs(client, address as `0x${string}`, {
            fromBlock: fromScan,
            toBlock: currentBlock,
          });
        }

        const merged = mergeAndRank(cached?.entries ?? [], scanned, CACHE_CAP);
        writeCache(cacheKey, {
          lastScannedBlock: currentBlock.toString(),
          entries: merged,
        });

        if (aliveRef.current) {
          setEntries(merged.slice(0, MAX_TOP));
          setError(null);
        }
      } catch {
        if (aliveRef.current) {
          if (cached && cached.entries.length > 0) {
            // Data on-chain terakhir yang valid tetap ditampilkan (stale).
            setEntries(cached.entries.slice(0, MAX_TOP));
            setError('refresh-failed');
          } else {
            setEntries([]);
            setError('failed');
          }
        }
      } finally {
        inFlightRef.current = false;
        if (aliveRef.current) setIsLoading(false);
      }
    },
    [address],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function handleInvalidate() {
      load({ force: true });
    }

    window.addEventListener(LEADERBOARD_INVALIDATE_EVENT, handleInvalidate);
    return () => {
      window.removeEventListener(LEADERBOARD_INVALIDATE_EVENT, handleInvalidate);
    };
  }, [load]);

  return {
    entries,
    isLoading,
    error,
    refetch: () => load({ force: true }),
  };
}
