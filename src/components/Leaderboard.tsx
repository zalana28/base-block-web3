import { useReadContract } from 'wagmi';
import { base } from '../config/chain.js';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from '../config/contract.js';

type OnChainEntry = {
  player: string;
  name: string;
  mode: number;
  score: bigint;
  level: number;
  timestamp: bigint;
};

interface Entry {
  name: string;
  score: number;
  level: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
    if (topScores && Array.isArray(topScores)) {
      const valid = topScores.filter(
        (e) => e.player !== '0x0000000000000000000000000000000000000000' && e.score > 0n,
      );
      return valid
        .map((e) => ({
          name: e.name || e.player.slice(0, 8) + '...',
          score: Number(e.score),
          level: e.level,
        }))
        .sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          return b.score - a.score;
        });
    }
    return [];
  })();

  const source = 'Onchain';

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="panel">
        <div className="landing-badge" style={{ margin: '0 auto 0.75rem' }}>
          <span className="dot" />
          LEADERBOARD
        </div>
        <h1 style={{ marginBottom: '0.25rem' }}>TOP STACKERS</h1>
        <h2>🏆 ON BASE NETWORK 🏆</h2>

        <ol className="leaderboard-list">
          {entries.length === 0 ? (
            <li className="leaderboard-empty">
              No scores yet — be the first!
            </li>
          ) : (
            entries.slice(0, 10).map((row, i) => (
              <li key={i} className="leaderboard-item">
                <span>
                  <span className="leaderboard-rank">#{i + 1}</span>
                  <span className="leaderboard-name">{escapeHtml(row.name)}</span>
                  {row.level != null && (
                    <span className="leaderboard-level">L{row.level}</span>
                  )}
                </span>
                <span className="leaderboard-score">
                  {row.score.toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ol>

        <p className="leaderboard-source">
          {source} • {entries.length} entries
        </p>
        <button className="secondary" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  );
}
