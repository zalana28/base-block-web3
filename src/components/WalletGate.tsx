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
    <div className="overlay">
      <div className="panel">
        <div className="hero-mascot">🧱</div>
        <h1 className="hero-title">BASE BLOCK</h1>
        <p className="hero-subtitle">ON BASE NETWORK</p>
        <p className="blink">— TAP TO START —</p>

        {isConnected && address ? (
          <>
            <div className="wallet-status">
              <span className="dot connected" />
              <span>CONNECTED</span>
            </div>
            <p className="address">{address.slice(0, 6)}...{address.slice(-4)}</p>
            <p className="blink" style={{ margin: '12px 0' }}>SELECT MODE</p>
            <button
              className="primary"
              onClick={() => handleSelectMode(0)}
              disabled={status === 'pending' || status === 'confirming'}
              style={{ marginBottom: 8 }}
            >
              {selectedMode === 0 && (status === 'pending' || status === 'confirming')
                ? 'STARTING CLASSIC...'
                : 'CLASSIC MODE'}
            </button>
            <button
              className="warn"
              onClick={() => handleSelectMode(1)}
              disabled={status === 'pending' || status === 'confirming'}
              style={{ marginBottom: 8 }}
            >
              {selectedMode === 1 && (status === 'pending' || status === 'confirming')
                ? 'STARTING ARCADE...'
                : 'ARCADE MODE'}
            </button>
            <button className="secondary" onClick={() => setShowModal(true)}>
              DISCONNECT
            </button>
          </>
        ) : (
          <button className="primary" onClick={handleConnectWallet}>
            CONNECT WALLET
          </button>
        )}

        {onViewLeaderboard && (
          <button className="secondary" onClick={onViewLeaderboard} style={{ marginTop: 8 }}>
            LEADERBOARD
          </button>
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