# Builder Code Integration - Base Block Game

## Overview
Base Block game sudah terintegrasi dengan **ERC-8021 Builder Code Attribution** untuk tracking dan rewards dari Base ecosystem.

## Builder Code Details

- **Builder Code:** `bc_rhgm3bxx`
- **Encoding String:** `0x62635f7268676d336278780b0080218021802180218021802180218021`
- **Docs:** https://docs.base.org/apps/builder-codes/app-developers

## Technical Implementation

### 1. Config (src/config/wagmi.ts)
```typescript
import { Attribution } from "ox/erc8021";

export const DATA_SUFFIX = Attribution.toDataSuffix({ 
  codes: ["bc_rhgm3bxx"] 
});
```

### 2. Transaction Hook (src/hooks/useBuilderCodeTransaction.ts)
```typescript
writeContract({
  address,
  abi,
  functionName,
  args,
  chainId: 8453,
  value: options?.value ?? 0n,
  dataSuffix: DATA_SUFFIX,  // Builder code appended here
});
```

### 3. Usage (src/components/WalletGate.tsx)
```typescript
const { send, status, error } = useBuilderCodeTransaction({
  address: LEADERBOARD_ADDRESS,
  abi: leaderboardAbi,
  chainId: base.id,
});

// All transactions automatically include builder code
send('submitScore', [score]);
```

## How It Works

1. **ERC-8021 Data Suffix**
   - Appends dataSuffix ke transaction calldata
   - Format: 0x8021 marker + builder_code_utf8_hex + padding
   - Smart contract ignore suffix (backward compatible)
   - Base indexer detects dan track attribution

2. **Gas Overhead**
   - Minimal: 16 gas per non-zero byte
   - 29 bytes = ~464 gas overhead
   - Negligible untuk user experience

3. **Attribution Tracking**
   - Semua transaction dari game ter-track ke bc_rhgm3bxx
   - Base analytics dashboard akan show attribution
   - Eligible untuk builder rewards program

## Status

✅ **Integrated and Active**
- Config updated dengan builder code asli
- Hook automatically append dataSuffix
- Ready untuk production deployment

## Resources

- Base Builder Codes Docs: https://docs.base.org/apps/builder-codes/app-developers
- ERC-8021 Spec: https://eips.ethereum.org/EIPS/eip-8021
- ox/erc8021 Library: https://oxlib.sh
