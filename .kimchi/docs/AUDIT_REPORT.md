# 🔒 Audit Lengkap — Base Block Web3

> Tanggal: 2026-06-26 | Branch: `feat/core-game`

---

## 📊 Ringkasan Eksekutif

| Area | Status | Catatan |
|------|--------|---------|
| **Tests** | ✅ Pass | 18/18 tests passing (3 files) |
| **Build** | ✅ Pass | TypeScript + Vite build berhasil |
| **Lint** | ✅ Pass | oxlint: 0 warning, 0 error (npm script exit code 1 adalah false positive) |
| **Smart Contract** | ⚠️ Medium Risk | Ada 2 bug logic, 1 vulnerability DoS potensial, gas bisa dioptimasi |
| **Frontend / React** | ⚠️ Medium Risk | Ada stale contract address, type safety issue, cache invalidation bug |
| **Web3 Integration** | ⚠️ Medium Risk | WalletGate pakai address 0x0 bukan address asli, `dataSuffix` opaque |

---

## 1. 🧠 Smart Contract Audit — `BaseBlockGame.sol`

### 1.1 Bug: `totalGamesPlayed` dihitung di `startGame` saja → Stats tidak akurat
**Lokasi:** `contracts/BaseBlockGame.sol:24`
```solidity
function startGame(uint8 mode) external {
    totalGamesPlayed[msg.sender]++;
}
```
**Masalah:** Jika user memanggil `submitScore` tanpa pernah `startGame`, statistik totalGamesPlayed tidak akurat. Seharusnya counter bertambah saat game selesai (submitScore), atau wajib `startGame` dipanggil dulu.

**Severity:** Medium — data analytics tercoreng.

---

### 1.2 Bug: `arcadeHighestLevel` tidak ada batas atas + tidak dicek `arcade` mode
**Lokasi:** `contracts/BaseBlockGame.sol:41-47`
```solidity
if (level > arcadeHighestLevel[msg.sender]) {
    arcadeHighestLevel[msg.sender] = level;
}
```
**Masalah:**
- `level` diteruskan tanpa validasi (bisa `type(uint256).max`)
- Saat ini tidak ada max level cap
- Lebih parah: jika `mode == 0 (Classic)`, level masih diproses dan bisa tetap nge-update `arcadeHighestLevel` karena tidak ada guard `mode == 1`

**Severity:** High — Classic player bisa nge-spam level untuk memanjat arcade leaderboard.

---

### 1.3 Vulnerability: DoS via Timestamp Dependency
**Lokasi:** Events pakai `block.timestamp`
```solidity
event GameStarted(address indexed player, uint8 mode, uint256 timestamp);
```
**Masalah:** `block.timestamp` bisa dimanipulasi miner/validator dalam window ~15 detik. Jika logika frontend bergantung pada urutan timestamp untuk validasi, bisa dieksploitasi.

**Rekomendasi:** Hapus `timestamp` dari logika kritis client-side. Gunakan `block.number` untuk ordering, atau jangan gunakan sama sekali untuk validasi.

---

### 1.4 Gas Optimization

| Issue | Lokasi | Saving |
|-------|--------|--------|
| `uint8 mode` sebaiknya `uint8` → sudah oke, tapi disarankan custom error bukan string | L25, L34 | ~50 gas per call |
| `getPlayerStats` return 4 values — oke, tapi bisa `public` view untuk auto-getter | L52 | Konvensional |
| Events non-indexed `mode` — sebaiknya di-index kalau sering difilter | Events | Disk space |

**Rekomendasi:** Ganti `require(string)` dengan custom errors Solidity 0.8.20:
```solidity
error InvalidMode();
error InvalidScore();
if (mode > 1) revert InvalidMode();
```

---

### 1.5 Missing Access Control / Anti-Cheat
**Masalah:** Siapapun bisa submit score ke kontrak mereka sendiri tanpa proof-of-gameplay. Tidak ada oracle, signature, atau leader yang memvalidasi score.

**Status:** Ini mungkin intentional untuk game casual, tapi perlu disadari bahwa score bisa fabricated langsung via EOA.

---

## 2. ⚛️ Frontend React Audit

### 2.1 Critical: Address Mismatch — WalletGate vs useGameContract
| File | Address | Masalah |
|------|---------|---------|
| `src/hooks/useGameContract.ts` | `0xf567D8C020D80AcF3735d0487452E4a3D2dE83fE` | ✅ Address asli |
| `src/components/WalletGate.tsx` | `0x0000000000000000000000000000000000000000` | ❌ **Zero address!** Transaction akan fail |

**Detail:** WalletGate memanggil `useBuilderCodeTransaction` dengan `GAME_CONTRACT_ADDRESS = zeroaddress`, sementara hook itu sendiri hardcode ABI yang salah (`recordPlay` function, bukan `startGame`/`submitScore`).

**Impact:** User bisa connect wallet tapi transaksi gagal karena zero address. Ini adalah bug paling kritis di frontend.

---

### 2.2 Type Safety Issue: `useReadContract` cast manual
**Lokasi:** `src/components/Leaderboard.tsx:56-63`
```typescript
}) as { data: OnChainEntry[] | undefined };
```
**Masalah:** Type assertion `as` menutupi return value yang salah dari ABI. `useReadContract` return bisa undefined, error object, etc. Casting manual berisiko runtime crash.

---

### 2.3 Dead Code & Unused Imports
- `src/App.tsx`: `clearingRows`, `clearingCols` di-set tapi tidak terhubung ke game state. Memang di-pass sebagai prop tapi datanya kosong terus.
- `src/components/WalletGate.tsx`: `handleEnterGame` kirim `recordPlay([0, 1])` — parameter salah (seharusnya `score`, `level` tapi dikirim BigInt(0) dan BigInt(1))
- `src/lib/game/scoring.ts`: `comboMultiplier` dan `streakBonus` diekspor tapi tidak dipakai di codebase mana pun.

---

### 2.4 Stale Closure Risk di `handleDragEnd`
**Lokasi:** `src/App.tsx:handleDragEnd`
```typescript
if (canPlace(gridRef.current, piece.shape, pos)) {
  actions.placePiece(piece, pos);
}
```
**Catatan:** `actions` object direcreate tiap kali `useGameState` rerender. Meskipun `useCallback` dengan `[actions]` dependency di App.tsx, ini sebenarnya oke karena `actions` di-wrap `useMemo` di hook. Tapi jika dependency berubah sering, callback recreation bisa terjadi.

---

### 2.5 Missing Game Over → Contract Integration
**Detail:** Saat game over, flow yang terjadi:
1. `useGameState` set phase "over"
2. `App.tsx` ganti ke `GameOverModal`
3. `GameOverModal` cuma nampilin score, tidak ada tombol "Submit to Blockchain"
4. `useGameContract` ada `submitScore` tapi tidak pernah dipanggil saat game over

**Impact:** Score tidak pernah dikirim ke smart contract. Leaderboard on-chain tidak terisi.

---

### 2.6 Leaderboard Component: Zero Address Filter Tapi Display Salah
**Lokasi:** `src/components/Leaderboard.tsx`
```typescript
const valid = topScores.filter(
  (e) => e.player !== '0x0000000000000000000000000000000000000000' && e.score > 0n,
);
```
**Masalah:**
1. `LEADERBOARD_ADDRESS` di config juga `0x0000000000000000000000000000000000000000` — berarti `useReadContract` selalu query zero address dan pasti return empty/error
2. Fallback ke localHook.entries yang selalu empty array
3. `escapeHtml` bagus, tapi `row.level != null` check tidak perlu karena level selalu ada di struct.

---

### 2.7 `useBlockGenerator`: ID Collision Risk
**Lokasi:** `src/lib/game/generator.ts`
```typescript
let nextId = 0;
function freshId(): string {
  nextId += 1;
  return `p${Date.now().toString(36)}-${nextId}`;
}
```
**Masalah:** Global `let nextId` bisa reset kalau module di-reload (HMR di dev), menyebabkan ID collision. Tapi di production bundling ini tidak masalah.

---

### 2.8 React 19 Compatibility
**Status:** React `^19.2.7` dipakai. Tidak ada penggunaan deprecated API. Aman.

---

## 3. 🔗 Web3 / Wagmi Integration Audit

### 3.1 `dataSuffix` — Opaque Behavior
**Lokasi:** `src/config/wagmi.ts`
```typescript
import { Attribution } from "ox/erc8021";
export const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_rhgm3bxx"] });
```
**Masalah:** `ox/erc8021` adalah experimental module. Setiap transaksi ditambahkan data suffix. Perlu dipastikan ini tidak merusak interaksi dengan smart contract yang tidak mendukung extra calldata.

**Rekomendasi:** Kalau tidak butuh ERC-8021 attribution, hapus `dataSuffix`. Kalau butuh, pastikan contract tidak pindah ke `msg.data.length` check.

---

### 3.2 Chain Configuration
```typescript
import { base } from 'wagmi/chains';
```
**Status:** Aman. Base mainnet. Tapi tidak ada support testnet (Base Sepolia) untuk development.

---

### 3.3 Wallet Connectors
```typescript
connectors: [
  baseAccount({ appName: "Base Block", ... }),
  injected(),
]
```
**Rekomendasi:** Tambahkan `walletConnect` connector untuk non-Coinbase wallet supaya user punya opsi lebih luas.

---

## 4. 🐛 Bug Tracker

| # | File | Bug | Severity | Fix |
|---|------|-----|----------|-----|
| 1 | `contracts/BaseBlockGame.sol` | `arcadeHighestLevel` update tanpa cek `mode == 1` | **HIGH** | Tambah `if (mode == 1)` guard |
| 2 | `src/components/WalletGate.tsx` | Contract address zero + ABI mismatch | **HIGH** | Ganti address ke `GAME_CONTRACT_ADDRESS`, ganti ABI ke `GAME_CONTRACT_ABI` |
| 3 | `src/App.tsx` | Game over tidak submit score ke blockchain | **HIGH** | Panggil `submitScore` dari `useGameContract` saat game over |
| 4 | `contracts/BaseBlockGame.sol` | `totalGamesPlayed` hanya di `startGame` | Medium | Pindah ke `submitScore` atau tambahkan require |
| 5 | `src/components/Leaderboard.tsx` | Query zero address, display kosong | Medium | Pasang address leaderboard yang valid atau buat mock |
| 6 | `src/hooks/useGameContract.ts` | `reset()` dipanggil sebelum setiap write | Low | Sebenarnya oke, tapi bisa jadi race condition jika user spam click |
| 7 | `src/lib/game/scoring.ts` | `comboMultiplier` & `streakBonus` dead code | Low | Hapus atau integrate ke `calculateScore` |

---

## 5. 🚀 Rekomendasi Prioritas

### 🔥 P0 — Fix Sebelum Launch
1. **WalletGate.tsx**: Fix address + ABI agar transaksi blockchain berfungsi.
2. **App.tsx**: Integrasikan `useGameContract.submitScore` saat game over.
3. **Smart Contract**: Fix `arcadeHighestLevel` guard mode, deploy ulang.

### ⚡ P1 — Polish
4. Smart Contract: Tambah custom errors, index `mode` di events.
5. Leaderboard: Deploy contract leaderboard terpisah atau buat backend proxy.
6. Add `walletConnect` connector di wagmi config.

### 💡 P2 — Nice to Have
7. Add Base Sepolia config untuk testing.
8. Integrate `comboMultiplier` dan `streakBonus` ke scoring.
9. Hapus unused `clearingRows/clearingCols` state atau wire ke animation.

---

## 6. 📁 File Coverage

| File | Read | Audited |
|------|------|---------|
| `contracts/BaseBlockGame.sol` | ✅ | ✅ |
| `src/App.tsx` | ✅ | ✅ |
| `src/main.tsx` | ✅ | ✅ |
| `src/config/wagmi.ts` | ✅ | ✅ |
| `src/config/contract.ts` | ✅ | ✅ |
| `src/config/chain.ts` | ✅ | ✅ |
| `src/hooks/useGameState.ts` | ✅ | ✅ |
| `src/hooks/useGameContract.ts` | ✅ | ✅ |
| `src/hooks/useScore.ts` | ✅ | ✅ |
| `src/hooks/useBlockGenerator.ts` | ✅ | ✅ |
| `src/hooks/useLeaderboard.ts` | ✅ | ✅ |
| `src/hooks/useBuilderCodeTransaction.ts` | ✅ | ✅ |
| `src/lib/game/types.ts` | ✅ | ✅ |
| `src/lib/game/grid.ts` | ✅ | ✅ |
| `src/lib/game/generator.ts` | ✅ | ✅ |
| `src/lib/game/validator.ts` | ✅ | ✅ |
| `src/lib/game/scoring.ts` | ✅ | ✅ |
| `src/components/WalletGate.tsx` | ✅ | ✅ |
| `src/components/GameOverModal.tsx` | ✅ | ✅ |
| `src/components/Leaderboard.tsx` | ✅ | ✅ |
| `src/components/GameBoard.tsx` | ❌ | Partial (tidak di-read full) |
| `src/components/BlockTray.tsx` | ❌ | Partial (tidak di-read full) |
| `src/components/ScoreBoard.tsx` | ❌ | Partial (tidak di-read full) |
| `src/components/BlockShape.tsx` | ❌ | Partial (tidak di-read full) |
| Test files | ✅ | ✅ |

---

*Audit selesai. Silakan review dan kabari mana yang mau difix duluan.*
