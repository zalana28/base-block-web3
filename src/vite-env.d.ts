/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override untuk RPC Base Mainnet yang dipakai membaca data on-chain. */
  readonly VITE_BASE_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
