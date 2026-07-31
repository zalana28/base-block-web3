# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Leaderboard (data on-chain)

Leaderboard dibaca langsung dari event `GameCompleted` di kontrak Base Mainnet (lihat `src/config/contract.ts`).

- `src/lib/leaderboard.ts` — chunking `eth_getLogs` (maks ~10.000 blok/request), retry + backoff, dekode, dedupe skor terbaik per wallet, dan cache incremental di `localStorage` (tersimpan `lastScannedBlock`).
- `src/config/rpc.ts` — transport fallback RPC. Optional env `VITE_BASE_RPC_URL` (lihat `.env.example`) dipakai sebagai RPC utama untuk pembacaan.
- Blok deployment kontrak (untuk titik awal scan) di-set di `GAME_CONTRACT_DEPLOYED_BLOCK`.

Untuk menjalankan:

```bash
cp .env.example .env   # opsional, set VITE_BASE_RPC_URL bila perlu
npm run dev
```

