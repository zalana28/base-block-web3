import { useState, useEffect } from 'react';
import { useConnect, useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { useGameContract } from '../hooks/useGameContract.js';
import { base } from '../config/chain.js';

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
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain, error: switchError } = useSwitchChain();
  const { startGame, status, error } = useGameContract();

  // Game hanya berjalan di Base (8453). Setelah wallet connect, auto-switch
  // ke Base bila wallet masih di jaringan lain (mis. MetaMask di Ethereum
  // mainnet) supaya tx tidak ditolak karena chainId tidak cocok.
  const isOffBase = isConnected && typeof chainId === 'number' && chainId !== base.id;
  const canStart = !isOffBase && !isSwitchingChain;

  useEffect(() => {
    if (isOffBase) {
      switchChain({ chainId: base.id });
    }
  }, [isOffBase, switchChain]);

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
        {/* Dua frasa dibungkus span (inline-block) supaya baris hanya boleh
            patah di antara keduanya — tanpa ini "Base." menggantung sendirian
            di baris kedua begitu subtitle tidak muat. */}
        <p className="landing-subtitle">
          <span>Stack. Blast.</span> <span>Compete on Base.</span>
        </p>

        {isConnected && address ? (
          <div className="landing-menu">
            <div className="wallet-pill">
              <span className="dot" />
              CONNECTED
            </div>
            <p className="wallet-address">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>

            {isOffBase && (
              <div className="tx-status" style={{ display: 'block', marginBottom: '0.75rem' }}>
                {isSwitchingChain ? (
                  <>
                    <span className="dot pending" /> Switching to Base Network...
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--warning)' }}>⚠️ Wrong network</span>
                    <button
                      className="secondary"
                      style={{ display: 'block', width: '100%', marginTop: '0.5rem' }}
                      onClick={() => switchChain({ chainId: base.id })}
                    >
                      SWITCH TO BASE NETWORK
                    </button>
                  </>
                )}
                {switchError && (
                  <div style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>
                    {'shortMessage' in switchError
                      ? switchError.shortMessage
                      : switchError.message || 'Failed to switch network'}
                  </div>
                )}
              </div>
            )}

            <div className="mode-selector-label">SELECT MODE</div>

            <div className="mode-grid">
              <button
                className="mode-card classic"
                onClick={() => handleSelectMode(0)}
                disabled={!canStart || status === 'pending' || status === 'confirming'}
                aria-label="Start Classic mode"
              >
                <div className="mode-card-title">CLASSIC</div>
                {selectedMode === 0 && (status === 'pending' || status === 'confirming') && (
                  <div className="tx-status">
                    <span className="dot pending" /> Starting...
                  </div>
                )}
              </button>

              <button
                className="mode-card arcade"
                onClick={() => handleSelectMode(1)}
                disabled={!canStart || status === 'pending' || status === 'confirming'}
                aria-label="Start Arcade mode"
              >
                <div className="mode-card-title">ARCADE</div>
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
              <button className="secondary disconnect-btn" onClick={() => disconnect()}>
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
