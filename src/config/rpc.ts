import { fallback, http, type Transport } from 'viem';
import { base } from './chain.js';

// Transport untuk pembacaan data publik (leaderboard). Prioritas RPC:
//   1. VITE_BASE_RPC_URL (env) bila di-set — dipakai sebagai RPC utama,
//      sisanya fallback.
//   2. RPC resmi Base Mainnet + fallback publik dari config chain.
// Tidak ada API key yang di-commit ke repository.
export function createLeaderboardTransport(): Transport {
  const envUrl = import.meta.env.VITE_BASE_RPC_URL;
  const fallbackUrls = [...base.rpcUrls.default.http];

  if (envUrl) {
    // Env di-set → jadikan primary dan matikan ranking agar urutan RPC
    // (env dulu, lalu fallback) dihormati.
    return fallback(
      [...new Set([envUrl, ...fallbackUrls])].map((url) =>
        http(url, { retryCount: 2, timeout: 15_000 }),
      ),
      { rank: false, retryCount: 2 },
    );
  }

  // Tanpa env → ranking aktif: cek latency tiap RPC dan preferensi otomatis,
  // dengan failover bila salah satu gagal.
  return fallback(
    [...new Set(fallbackUrls)].map((url) => http(url, { retryCount: 2, timeout: 15_000 })),
    { rank: true, retryCount: 2 },
  );
}
