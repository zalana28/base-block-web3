import { useReadContract } from 'wagmi';
import { base } from '../config/chain.js';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from '../config/contract.js';

interface OnChainEntry {
  player: string;
  name: string;
  mode: number;
  score: bigint;
  level: number;
  timestamp: bigint;
}

interface Entry {
  name: string;
  score: number;
  level: number;
}

function isValidEntry(e: unknown): e is OnChainEntry {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj.player === 'string' &&
    typeof obj.mode === 'number' &&
    (typeof obj.score === 'bigint' || typeof obj.score === 'number') &&
    typeof obj.level === 'number'
  );
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

export default function Leaderboard({ onClose }: { onClose: () => void }) {
  const { data: topScores } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getTopScores',
    args: [10],
    chainId: base.id,
    query: { staleTime: 60_000 },
  }) as { data: OnChainEntry[] | undefined };

  const entries: Entry[] = (() => {
    if (!topScores || !Array.isArray(topScores)) return [];
    return topScores
      .filter(isValidEntry)
      .filter((e) => e.player !== ZERO_ADDR && e.score > 0n)
      .map((e) => ({
        name: e.name || e.player.slice(0, 8) + '...',
        score: Number(e.score),
        level: e.level,
      }))
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.score - a.score;
      });
  })();

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="panel">
        <div className="landing-badge" style={{ margin: '0 auto 0.75rem' }}>
          <span className="dot" />
          LEADERBOARD
        </div>
        <h1 style={{ marginBottom: '0.25rem' }}>TOP STACKERS</h1>
        <h2>🏆 ON BASE NETWORK</h2>

        <div className="leaderboard-list">
          {entries.length === 0 && (
            <p className="leaderboard-empty">No scores yet. Be the first!</p>
          )}
          {entries.map((entry, i) => (
            <div key={`${entry.name}-${i}`} className="leaderboard-row">
              <span className="leaderboard-rank">#{i + 1}</span>
              <span className="leaderboard-name">{entry.name}</span>
              <span className="leaderboard-score">{entry.score.toLocaleString()}</span>
              {entry.level > 0 && (
                <span className="leaderboard-level">LV{entry.level}</span>
              )}
            </div>
          ))}
        </div>

        <div className="landing-actions" style={{ marginTop: '1rem' }}>
          <button className="primary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}
