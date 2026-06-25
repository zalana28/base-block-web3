import { useState, useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import type { Address, Abi } from 'viem';
import { useBuilderCodeTransaction } from '../hooks/useBuilderCodeTransaction.js';

const GAME_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const GAME_ABI: Abi = [
  {
    inputs: [
      { name: 'score', type: 'uint256' },
      { name: 'level', type: 'uint256' },
    ],
    name: 'recordPlay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

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
  onReady: () => void;
  onViewLeaderboard?: () => void;
}

export default function WalletGate({ onReady, onViewLeaderboard }: Props) {
  const [showModal, setShowModal] = useState(false);
  const { connectors, connect, isPending } = useConnect();
  const { address, isConnected } = useAccount();

  const { send, status, error } = useBuilderCodeTransaction({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_ABI,
    chainId: 8453, // base chain id
  });

  function handleConnectWallet() {
    setShowModal(true);
  }

  function handleConnectorClick(connector: (typeof connectors)[0]) {
    connect({ connector });
  }

  function handleEnterGame() {
    send('recordPlay', [BigInt(0), BigInt(1)]);
  }

  // Auto-transition on tx success
  useEffect(() => {
    if (status === 'success' && isConnected) {
      onReady();
    }
  }, [status, isConnected, onReady]);

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
            <button className="warn" onClick={handleEnterGame}>
              ENTER GAME &amp; PLAY
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
                {error.shortMessage ?? error.message}
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