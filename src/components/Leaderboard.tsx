import { useContractEvents } from '../hooks/useContractEvents.js';
import { GAME_CONTRACT_ADDRESS } from '../config/contract.js';

export default function Leaderboard({ onClose }: { onClose: () => void }) {
  const { entries, isLoading, error, refetch } = useContractEvents({
    address: GAME_CONTRACT_ADDRESS,
  });

  const showStale = error === 'refresh-failed';
  const showEmpty = !isLoading && entries.length === 0 && !error;
  const showFailed = error === 'failed' && !isLoading;

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#00e5ff', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', lineHeight: 1 }}>←</button>
          <div className="landing-badge" style={{ margin: 0 }}>
            <span className="dot" />
            LEADERBOARD
          </div>
        </div>
        <h1 style={{ marginBottom: '0.25rem' }}>TOP STACKERS</h1>
        <h2>🏆 ON BASE NETWORK</h2>
        <div className="unverified-badge">
          ⚠️ UNVERIFIED — scores are self-reported
        </div>

        <div className="leaderboard-list">
          {isLoading && (
            <p className="leaderboard-empty">Loading scores...</p>
          )}

          {showFailed && (
            <p className="leaderboard-empty">
              ⚠️ Failed to load leaderboard. Check your connection and try again.
            </p>
          )}

          {showEmpty && (
            <p className="leaderboard-empty">No scores yet. Be the first!</p>
          )}

          {entries.map((entry, i) => (
            <div key={`${entry.player}-${entry.mode}-${i}`} className="leaderboard-item">
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

          {showStale && (
            <p className="leaderboard-empty">
              Showing last cached scores - could not refresh.
            </p>
          )}
        </div>

        <div className="landing-actions" style={{ marginTop: '1rem' }}>
          {(showFailed || showStale) && (
            <button
              className="secondary"
              style={{ display: 'block', width: '100%', marginBottom: '0.5rem' }}
              onClick={refetch}
            >
              ↻ RETRY
            </button>
          )}
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
