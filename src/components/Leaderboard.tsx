import { useContractEvents } from '../hooks/useContractEvents.js';
import { GAME_CONTRACT_ADDRESS } from '../config/contract.js';

export default function Leaderboard({ onClose }: { onClose: () => void }) {
  const { entries, isLoading, error } = useContractEvents({
    address: GAME_CONTRACT_ADDRESS,
  });

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
          {error && !isLoading && (
            <p className="leaderboard-empty">
              ⚠️ Failed to load: {error}
            </p>
          )}
          {!isLoading && entries.length === 0 && !error && (
            <p className="leaderboard-empty">No scores yet. Be the first!</p>
          )}
          {entries.map((entry, i) => (
            <div key={`${entry.player}-${entry.mode}-${i}`} className="leaderboard-row">
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
          <a
            href={`https://basescan.org/address/${GAME_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="secondary"
            style={{ textDecoration: 'none', textAlign: 'center', display: 'block', marginBottom: '0.5rem', fontSize: '0.5rem' }}
          >
            VIEW ON BASESCAN ↗
          </a>
          <button className="primary" onClick={onClose}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}
