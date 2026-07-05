import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { base } from '../config/chain.js';

interface Entry {
  player: string;
  score: number;
  level: number;
  mode: number;
}

// The deployed contract's "GameCompleted" equivalent event topic
// Discovered from on-chain analysis of the actual deployed bytecode
const GAME_COMPLETED_TOPIC =
  '0x17f04e4e5fcf9d0da7e8d721dc95ea4e190310edd790a4b0513d1c8207257c1f' as const;

const BLOCK_CHUNK = 5_000;     // per RPC query chunk
const LOOKBACK_BLOCKS = 500_000; // ~3 days on Base (~2 blocks/sec)
const MAX_TOP = 20;

const client = createPublicClient({
  chain: base,
  transport: http(),
});

function decodeLog(log: { topics: string[]; data: string }): Entry | null {
  try {
    const { topics, data } = log;
    if (!topics || topics.length < 2 || !data || data === '0x') return null;

    // topic1 = indexed player address
    const player = '0x' + topics[1].slice(-40);

    // data = abi.encode(mode, score, level, timestamp)
    const hex = data.slice(2);
    if (hex.length < 64 * 3) return null;

    const values: bigint[] = [];
    for (let i = 0; i < hex.length; i += 64) {
      values.push(BigInt('0x' + hex.slice(i, i + 64)));
    }

    return {
      player,
      mode: Number(values[0]),
      score: Number(values[1]),
      level: Number(values[2]),
    };
  } catch {
    return null;
  }
}

export function useContractEvents({
  address,
  chainId,
}: {
  address: string;
  chainId: number;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentBlock = await client.getBlockNumber();
      const fromBlock = currentBlock > BigInt(LOOKBACK_BLOCKS)
        ? currentBlock - BigInt(LOOKBACK_BLOCKS)
        : 0n;

      const allLogs: { topics: string[]; data: string }[] = [];

      // Fetch in chunks to respect RPC limits
      for (
        let start = fromBlock;
        start <= currentBlock;
        start += BigInt(BLOCK_CHUNK)
      ) {
        const end = start + BigInt(BLOCK_CHUNK) > currentBlock
          ? currentBlock
          : start + BigInt(BLOCK_CHUNK);

        const logs = await client.getLogs({
          address: address as `0x${string}`,
          event: {
            type: 'event',
            name: 'GameCompleted',
            inputs: [
              { type: 'address', name: 'player', indexed: true },
              { type: 'uint8', name: 'mode', indexed: false },
              { type: 'uint256', name: 'score', indexed: false },
              { type: 'uint256', name: 'level', indexed: false },
              { type: 'uint256', name: 'timestamp', indexed: false },
            ],
          },
          fromBlock: start,
          toBlock: end,
        });

        for (const log of logs) {
          // Filter by our known topic0 (the deployed contract's actual topic)
          if (
            log.topics.length > 0 &&
            log.topics[0].toLowerCase() === GAME_COMPLETED_TOPIC
          ) {
            allLogs.push({ topics: log.topics as string[], data: log.data });
          }
        }
      }

      // Decode logs
      const decoded = allLogs.map(decodeLog).filter((e): e is Entry => e !== null && e.score > 0);

      // Keep best score per (player, mode) pair
      const best = new Map<string, Entry>();
      for (const entry of decoded) {
        const key = `${entry.player}-${entry.mode}`;
        const existing = best.get(key);
        if (!existing || entry.score > existing.score) {
          best.set(key, entry);
        }
      }

      // Sort by score desc, take top N
      const sorted = Array.from(best.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_TOP);

      setEntries(sorted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, isLoading, error, refetch: fetchLeaderboard };
}
