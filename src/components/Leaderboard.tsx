import type { Abi } from 'viem';
import { useReadContract } from 'wagmi';
import { base } from '../config/chain.js';
import { LEADERBOARD_ADDRESS } from '../config/wagmi.js';
import { useLeaderboard } from '../hooks/useLeaderboard.js';

const LEADERBOARD_ABI: Abi = [
  {
    inputs: [],
    name: 'getTopScores',
    outputs: [
      {
        components: [
          { name: 'player', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'score', type: 'uint256' },
          { name: 'level', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct ScoreEntry[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

type OnChainEntry = {
  player: string;
  name: string;
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
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: 'getTopScores',
    chainId: base.id,
    query: { staleTime: 60_000 },
  }) as { data: OnChainEntry[] | undefined };

  const localHook = useLeaderboard();

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
    return localHook.entries;
  })();

  const source = topScores ? 'Onchain + Local' : 'Local scores';

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="panel">
        <h1>LEADERBOARD</h1>
        <h2>🏆 TOP BLOCK STACKERS 🏆</h2>
        <ol style={{ textAlign: 'left', paddingLeft: '24px', margin: '16px 0' }}>
          {entries.length === 0 ? (
            <li style={{ fontSize: '10px', color: 'var(--text-dim)', listStyle: 'none', textAlign: 'center' }}>
              No scores yet — be the first!
            </li>
          ) : (
            entries.slice(0, 10).map((row, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(0,82,255,0.1)',
                  fontSize: '10px',
                }}
              >
                <span>
                  <span style={{ color: 'var(--base-bright)', marginRight: '8px' }}>#{i + 1}</span>
                  <span style={{ color: 'var(--text)' }}>{escapeHtml(row.name)}</span>
                  {row.level != null && (
                    <span style={{ color: 'var(--text-dim)', marginLeft: '4px' }}>L{row.level}</span>
                  )}
                </span>
                <span style={{ color: 'var(--frog)', fontFamily: 'monospace' }}>
                  {row.score.toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ol>
        <p style={{ fontSize: '8px', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '16px' }}>
          {source}
        </p>
        <button className="secondary" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  );
}