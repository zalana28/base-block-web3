import { base as wagmiBase } from 'wagmi/chains';

// Definisi chain Base kustom dengan RPC fallback resmi dan konfigurasi gas minimal yang aman
export const base = {
  ...wagmiBase,
  rpcUrls: {
    default: {
      http: [
        'https://mainnet.base.org', // RPC Resmi Utama Base
        'https://developer-access-mainnet.base.org', // Fallback RPC Developer
        'https://rpc.ankr.com/base', // Public Fallback 1
        'https://1rpc.io/base' // Public Fallback 2
      ],
    },
    public: {
      http: [
        'https://mainnet.base.org',
        'https://developer-access-mainnet.base.org',
        'https://rpc.ankr.com/base'
      ],
    },
  },
  // Mengunci konfigurasi base fee minimum jaringan Base (5.000.000 wei / 0.005 gwei) agar tidak error saat jaringan padat
  fees: {
    ...wagmiBase.fees,
    defaultMinGasPrice: 5000000n, // 5M wei
  }
};
