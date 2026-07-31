import { GAME_CONTRACT_ABI } from '../config/contract.js';

export interface ScoreEntry {
  player: string;
  mode: number;
  score: number;
  level: number;
  timestamp: number;
  blockNumber: number;
  txHash: string;
}

export interface Chunk {
  from: bigint;
  to: bigint;
}

const GAME_COMPLETED_EVENT = GAME_CONTRACT_ABI.find(
  (item) => item.type === 'event' && item.name === 'GameCompleted',
)!;

// Batas range eth_getLogs public Base RPC: ~10.000 blok (dikonfirmasi via
// error -32614 "eth_getLogs is limited to a 10,000 range").
export const DEFAULT_CHUNK_SIZE = 10_000n;
export const MIN_CHUNK_SIZE = 2_000n;

// ── Chunking ──────────────────────────────────────────────────────
export function buildChunks(fromBlock: bigint, toBlock: bigint, chunkSize: bigint): Chunk[] {
  const chunks: Chunk[] = [];
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = start + chunkSize - 1n > toBlock ? toBlock : start + chunkSize - 1n;
    chunks.push({ from: start, to: end });
  }
  return chunks;
}

export function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const concurrency = Math.min(Math.max(limit, 1), Math.max(items.length, 1));
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  return Promise.all(workers).then(() => results);
}

// ── Error classification ──────────────────────────────────────────
function getStatus(err: unknown): number | undefined {
  const e = err as { status?: number; cause?: { status?: number } };
  if (typeof e?.status === 'number') return e.status;
  if (typeof e?.cause?.status === 'number') return e.cause.status;
  return undefined;
}

function messageOf(err: unknown): string {
  const e = err as { shortMessage?: string; message?: string; details?: string };
  return [e?.shortMessage, e?.message, e?.details].filter(Boolean).join(' ');
}

export function isRateLimitError(err: unknown): boolean {
  if (getStatus(err) === 429) return true;
  return /rate limit|over rate limit|too many request|throttl|429/i.test(messageOf(err));
}

export function isRangeTooBigError(err: unknown): boolean {
  return /limited to a|block range|range.*too|too.*range|exceed|oversized|too large|too big|span/i.test(
    messageOf(err),
  );
}

export function isRetryableError(err: unknown): boolean {
  const status = getStatus(err);
  if (status === 429 || (status !== undefined && status >= 500)) return true;
  return /timeout|temporar|overload|fetch failed|network error|ECONN|ENETUNREACH|ERR_NETWORK|abort/i.test(
    messageOf(err),
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry terbatas dengan exponential backoff (maxRetries kali), tanpa infinite
// loop. Hanya me-retry error sementara (429 / 5xx / timeout / network).
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryableError(err) && !isRateLimitError(err)) throw err;
      if (attempt >= maxRetries) throw err;
      const delay = 500 * 2 ** attempt + Math.random() * 250;
      await sleep(delay);
      attempt++;
    }
  }
}

// ── Fetch + decode ────────────────────────────────────────────────
type LogLike = {
  args?: {
    player?: string;
    mode?: number | bigint;
    score?: bigint;
    level?: bigint;
    timestamp?: bigint;
  };
  blockNumber?: bigint;
  transactionHash?: string;
};

export function decodeLogs(logs: readonly LogLike[]): ScoreEntry[] {
  const out: ScoreEntry[] = [];
  for (const log of logs) {
    const args = log?.args;
    if (!args?.player || args.score === undefined) continue;
    const score = Number(args.score);
    if (!Number.isSafeInteger(score) || score <= 0) continue;
    out.push({
      player: args.player,
      mode: Number(args.mode ?? 0),
      score,
      level: Number(args.level ?? 0),
      timestamp: Number(args.timestamp ?? 0),
      blockNumber: Number(log.blockNumber ?? 0),
      txHash: log.transactionHash ?? '',
    });
  }
  return out;
}

interface GetLogsClient {
  getLogs: (params: {
    address: `0x${string}`;
    event: typeof GAME_COMPLETED_EVENT;
    fromBlock: bigint;
    toBlock: bigint;
  }) => Promise<LogLike[]>;
}

async function fetchChunk(
  client: GetLogsClient,
  address: `0x${string}`,
  from: bigint,
  to: bigint,
  chunkSize: bigint,
  minChunkSize: bigint,
  retries: number,
): Promise<LogLike[]> {
  try {
    return await withRetry(
      () => client.getLogs({ address, event: GAME_COMPLETED_EVENT, fromBlock: from, toBlock: to }),
      retries,
    );
  } catch (err) {
    // Provider menolak range → perkecil chunk otomatis (split dua) dan ulangi.
    if (!isRangeTooBigError(err) || chunkSize <= minChunkSize) throw err;
    const half = chunkSize / 2n >= minChunkSize ? chunkSize / 2n : minChunkSize;
    const mid = from + (to - from) / 2n;
    const left = await fetchChunk(client, address, from, mid, half, minChunkSize, retries);
    const right = await fetchChunk(client, address, mid + 1n, to, half, minChunkSize, retries);
    return [...left, ...right];
  }
}

export interface FetchLogsOptions {
  fromBlock: bigint;
  toBlock: bigint;
  chunkSize?: bigint;
  minChunkSize?: bigint;
  retries?: number;
  concurrency?: number;
}

export async function fetchLeaderboardLogs(
  client: GetLogsClient,
  address: `0x${string}`,
  { fromBlock, toBlock, chunkSize = DEFAULT_CHUNK_SIZE, minChunkSize = MIN_CHUNK_SIZE, retries = 3, concurrency = 4 }: FetchLogsOptions,
): Promise<ScoreEntry[]> {
  const chunks = buildChunks(fromBlock, toBlock, chunkSize);
  const decoded = await mapWithConcurrency(chunks, concurrency, (chunk) =>
    fetchChunk(client, address, chunk.from, chunk.to, chunkSize, minChunkSize, retries),
  );
  return decoded.flatMap(decodeLogs);
}

// ── Ranking / dedupe ──────────────────────────────────────────────
export function keyOf(entry: ScoreEntry): string {
  return `${entry.player.toLowerCase()}-${entry.mode}`;
}

// Satu wallet memakai skor tertingginya per mode (personal best). Tie-break:
// yang tercatat lebih dulu (blockNumber terkecil) menang.
export function dedupeBestScore(entries: readonly ScoreEntry[]): ScoreEntry[] {
  const best = new Map<string, ScoreEntry>();
  for (const e of entries) {
    const key = keyOf(e);
    const cur = best.get(key);
    if (
      !cur ||
      e.score > cur.score ||
      (e.score === cur.score && e.blockNumber < cur.blockNumber)
    ) {
      best.set(key, e);
    }
  }
  return [...best.values()];
}

// Urutkan score terbesar → terkecil; tie-break: tercatat lebih dulu.
export function sortEntries(entries: readonly ScoreEntry[], limit: number): ScoreEntry[] {
  return [...entries]
    .sort((a, b) => b.score - a.score || a.blockNumber - b.blockNumber)
    .slice(0, limit);
}

export function mergeAndRank(
  prev: readonly ScoreEntry[],
  next: readonly ScoreEntry[],
  cap: number,
): ScoreEntry[] {
  return sortEntries(dedupeBestScore([...prev, ...next]), cap);
}

// ── Cache incremental (localStorage, dipisah per chainId + contract) ──
export interface LeaderboardCache {
  lastScannedBlock: string; // decimal string (bigint aman disimpan sebagai string)
  entries: ScoreEntry[];
}

export function leaderboardCacheKey(chainId: number, address: string): string {
  return `bb:leaderboard:v1:${chainId}:${address.toLowerCase()}`;
}

export function readCache(key: string): LeaderboardCache | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeaderboardCache;
    if (
      !parsed ||
      typeof parsed.lastScannedBlock !== 'string' ||
      !Array.isArray(parsed.entries)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache(key: string, data: LeaderboardCache): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage penuh / private mode — cache tidak wajib, abaikan
  }
}
