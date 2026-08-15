import { useContractEvents } from '../hooks/useContractEvents.js';
import { GAME_CONTRACT_ADDRESS } from '../config/contract.js';
import { useBasename } from '../hooks/useBasename.js';
import type { ScoreEntry } from '../lib/leaderboard.js';

function LeaderboardItem({ entry, rank }: { entry: ScoreEntry; rank: number }) {
  const { displayName, isBasename } = useBasename(entry.player);

  return (
    <div className="leaderboard-item">
      <span className="leaderboard-rank">#{rank}</span>
      <span
        className={`leaderboard-name ${isBasename ? 'is-basename' : ''}`}
        title={entry.player}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          maxWidth: '180px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayName}
        {isBasename && (
          <span
            className="basename-dot"
            title="Base Name"
            style={{ fontSize: '0.625rem', lineHeight: 1 }}
          >
            🔵
          </span>
        )}
      </span>
      <span className="leaderboard-score">{entry.score.toLocaleString()}</span>
      {entry.level > 0 && (
        <span className="leaderboard-level">LV{entry.level}</span>
      )}
      {entry.mode === 1 && (
        <span className="leaderboard-level" style={{ color: 'var(--block-orange)' }}>ARC</span>
      )}
    </div>
  );
}

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#00e5ff',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.25rem',
                lineHeight: 1,
              }}
              aria-label="Back"
            >
              ←
            </button>
            <div className="landing-badge" style={{ margin: 0 }}>
              <span className="dot" />
              LEADERBOARD
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-dim)',
              fontSize: '0.625rem',
              padding: '0.25rem 0.5rem',
              cursor: isLoading ? 'default' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
            title="Refresh Leaderboard"
          >
            {isLoading ? '⏳' : '🔄'}
          </button>
        </div>
        <h1 style={{ marginBottom: '0.25rem' }}>TOP STACKERS</h1>
        <h2>🏆 ON BASE NETWORK</h2>
        <div className="unverified-badge">
          ⚠️ UNVERIFIED — scores are self-reported
        </div>

        <div className="leaderboard-list">
          {isLoading && entries.length === 0 && (
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
            <LeaderboardItem
              key={`${entry.player}-${entry.mode}-${i}`}
              entry={entry}
              rank={i + 1}
            />
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
