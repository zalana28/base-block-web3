import { useState, useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { useGameContract } from '../hooks/useGameContract.js';

const CONNECTOR_ICONS: Record<string, string> = {
  'Base Account': '🔗',
  MetaMask: '🦊',
  Coinbase: '💼',
  WalletConnect: '🔷',
  'Base Wallet': '🔵',
};

function getConnectorIcon(name: string): string {
  return CONNECTOR_ICONS[name] ?? '👛';
}

interface Props {
  onReady: (mode: 0 | 1) => void;
  onViewLeaderboard?: () => void;
}

export default function WalletGate({ onReady, onViewLeaderboard }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<0 | 1 | null>(null);
  const { connectors, connect, isPending } = useConnect();
  const { address, isConnected } = useAccount();
  const { startGame, status, error } = useGameContract();

  function handleConnectWallet() {
    setShowModal(true);
  }

  function handleConnectorClick(connector: (typeof connectors)[0]) {
    connect({ connector });
  }

  function handleSelectMode(mode: 0 | 1) {
    setSelectedMode(mode);
    startGame(mode);
  }

  // Auto-transition on tx success
  useEffect(() => {
    if (status === 'success' && isConnected && selectedMode !== null) {
      onReady(selectedMode);
    }
  }, [status, isConnected, selectedMode, onReady]);

  return (
    <div className="landing-shell">
      <div className="landing-content">
        <div className="landing-badge">
          <span className="dot" />
          ON BASE NETWORK
        </div>

        <h1 className="landing-title">BASE BLOCK</h1>
        <p className="landing-subtitle">Stack. Blast. Compete on Base.</p>

        {isConnected && address ? (
          <div className="landing-menu">
            <div className="wallet-pill">
              <span className="dot" />
              CONNECTED
            </div>
            <p className="wallet-address">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>

            <div className="mode-selector-label">SELECT MODE</div>

            <div className="mode-grid">
              <button
                className="mode-card classic"
                onClick={() => handleSelectMode(0)}
                disabled={status === 'pending' || status === 'confirming'}
                aria-label="Start Classic mode"
              >
                <div className="mode-card-icon">🧩</div>
                <div className="mode-card-title">CLASSIC</div>
                <div className="mode-card-desc">
                  Endless stacking. Clear lines. No time limit.
                </div>
                {selectedMode === 0 && (status === 'pending' || status === 'confirming') && (
                  <div className="tx-status">
                    <span className="dot pending" /> Starting...
                  </div>
                )}
              </button>

              <button
                className="mode-card arcade"
                onClick={() => handleSelectMode(1)}
                disabled={status === 'pending' || status === 'confirming'}
                aria-label="Start Arcade mode"
              >
                <div className="mode-card-icon">⚡</div>
                <div className="mode-card-title">ARCADE</div>
                <div className="mode-card-desc">
                  Race the clock. Hit targets. Climb ranks.
                </div>
                {selectedMode === 1 && (status === 'pending' || status === 'confirming') && (
                  <div className="tx-status">
                    <span className="dot pending" /> Starting...
                  </div>
                )}
              </button>
            </div>

            <div className="landing-footer-actions">
              {onViewLeaderboard && (
                <button className="secondary leaderboard-btn" onClick={onViewLeaderboard}>
                  🏆 LEADERBOARD
                </button>
              )}
              <button className="secondary disconnect-btn" onClick={() => setShowModal(true)}>
                DISCONNECT
              </button>
            </div>
          </div>
        ) : (
          <div className="landing-actions">
            <button className="primary" onClick={handleConnectWallet}>
              <span className="btn-icon">👛</span>
              CONNECT WALLET
            </button>

            {onViewLeaderboard && (
              <button className="secondary" onClick={onViewLeaderboard}>
                <span className="btn-icon">🏆</span>
                LEADERBOARD
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="wallet-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <h3>SELECT WALLET</h3>
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                className="connector-btn"
                onClick={() => {
                  handleConnectorClick(connector);
                  if (!isPending) setShowModal(false);
                }}
                disabled={isPending}
              >
                <span className="connector-icon">{getConnectorIcon(connector.name)}</span>
                <span>{connector.name}</span>
              </button>
            ))}

            {isPending && (
              <div className="tx-status">
                <span className="dot pending" /> Connecting...
              </div>
            )}

            {status === 'error' && error && (
              <div className="tx-status" style={{ color: 'var(--danger)' }}>
                {error.message}
              </div>
            )}

            <button className="close-btn" onClick={() => setShowModal(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
