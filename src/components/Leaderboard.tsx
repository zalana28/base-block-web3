import { useReadContract } from 'wagmi';
import { base } from '../config/chain.js';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from '../config/contract.js';

interface Entry {
  player: string;
  score: number;
  level: number;
  mode: number;
  timestamp: number;
}

export default function Leaderboard({ onClose }: { onClose: () => void }) {
  // Read top scores via getTopScores — only works if contract has it
  // Fallback: we'll read from events
  const { data: topScores, isLoading, error } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getTopScores',
    args: [10],
    chainId: base.id,
    query: {
      staleTime: 60_000,
      retry: 1,
    },
  }) as { data: unknown[] | undefined; isLoading: boolean; error: Error | null };

  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

  // Try to parse getTopScores result (if contract has it)
  const entries: Entry[] = (() => {
    if (!topScores || !Array.isArray(topScores)) return [];
    return topScores
      .filter((e): e is Record<string, unknown> => {
        if (!e || typeof e !== 'object') return false;
        const obj = e as Record<string, unknown>;
        return (
          typeof obj.player === 'string' &&
          obj.player !== ZERO_ADDR &&
          (typeof obj.score === 'bigint' || typeof obj.score === 'number') &&
          Number(obj.score) > 0
        );
      })
      .map((e) => ({
        player: e.player as string,
        score: Number(e.score),
        level: Number(e.level ?? 0),
        mode: Number(e.mode ?? 0),
        timestamp: Number(e.timestamp ?? 0),
      }))
      .sort((a, b) => b.score - a.score);
  })();

  // Check if getTopScores failed (contract doesn't have this function)
  const hasReadError = !!error || (!isLoading && entries.length === 0);

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
          {isLoading && (
            <p className="leaderboard-empty">Loading scores...</p>
          )}
          {hasReadError && !isLoading && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <p className="leaderboard-empty" style={{ marginBottom: '0.5rem' }}>
                ⚠️ Could not read leaderboard from contract
              </p>
              <p style={{ fontSize: '0.5rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                The deployed contract may not have the getTopScores function.
                <br />
                Scores are still saved on-chain via GameCompleted events.
                <br />
                Check transactions on{' '}
                <a
                  href={`https://basescan.org/address/${GAME_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--base-cyan)' }}
                >
                  BaseScan
                </a>
              </p>
            </div>
          )}
          {!isLoading && entries.length === 0 && !hasReadError && (
            <p className="leaderboard-empty">No scores yet. Be the first!</p>
          )}
          {entries.map((entry, i) => (
            <div key={`${entry.player}-${i}`} className="leaderboard-row">
              <span className="leaderboard-rank">#{i + 1}</span>
              <span className="leaderboard-name">
                {entry.player.slice(0, 6)}...{entry.player.slice(-4)}
              </span>
              <span className="leaderboard-score">{entry.score.toLocaleString()}</span>
              {entry.level > 0 && (
                <span className="leaderboard-level">LV{entry.level}</span>
              )}
              {entry.mode === 1 && (
                <span className="leaderboard-level" style={{ color: 'var(--block-orange)' }}>ARC</span>
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
