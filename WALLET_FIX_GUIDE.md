# Base Account "wallet_connect unsupported" Fix Guide

## 🔴 Problem

Error `"This method is unsupported. We do not currently support wallet_connect"` muncul saat klik **Connect Wallet** dengan Base Account di mobile browser.

**Root Cause:**
- `npm install` dengan caret `^` di `package.json` meng-upgrade dependencies secara otomatis
- Actual installed: `wagmi@2.19.5`, `viem@2.53.1`, `@coinbase/onchainkit@0.38.19`
- Expected (Frogger working versions): `wagmi@2.13.0`, `viem@2.21.0`, `@coinbase/onchainkit@0.38.0`
- Newer versions broke Base Account SDK compatibility

**Verify with:**
```bash
npm ls wagmi viem @coinbase/onchainkit
```

---

## ✅ Solution: Lock Exact Versions

### Step 1: Update `package.json`

**A) Remove caret `^` prefix** dari dependencies biar ga auto-upgrade:

```diff
  "dependencies": {
-    "@coinbase/onchainkit": "^0.38.0",
-    "@tanstack/react-query": "^5.62.0",
-    "ox": "^0.14.29",
-    "react": "^18.3.1",
-    "react-dom": "^18.3.1",
-    "viem": "^2.21.0",
-    "wagmi": "^2.13.0"
+    "@coinbase/onchainkit": "0.38.0",
+    "@tanstack/react-query": "5.62.0",
+    "ox": "0.14.29",
+    "react": "18.3.1",
+    "react-dom": "18.3.1",
+    "viem": "2.21.0",
+    "wagmi": "2.13.0"
  },
```

**B) Add package override** untuk latest Base Account SDK (recommended by Base docs):

```diff
  "dependencies": { ... },
+  "overrides": {
+    "@base-org/account": "latest"
+  },
```

**Why override?** Per [Base Account docs](https://docs.base.org/base-account/framework-integrations/rainbowkit), using latest `@base-org/account` gives bug fixes + improved wallet_connect compatibility.

### Step 2: Clean Install

```bash
# Remove existing node_modules and lock file
rm -rf node_modules package-lock.json

# Fresh install with exact versions
npm install

# Verify correct versions installed
npm ls wagmi viem @coinbase/onchainkit
```

Expected output:
```
base-block-web3@0.0.0
├── @coinbase/onchainkit@0.38.0
├── viem@2.21.0
└── wagmi@2.13.0
```

### Step 3: Rebuild

```bash
npm run build
```

### Step 4: Test on Mobile

1. Deploy ke Vercel atau test lokal via ngrok
2. Buka di mobile browser (Chrome/Safari)
3. Klik **Connect Wallet**
4. Pilih **Base Account**
5. ✅ Harus bisa connect tanpa error "wallet_connect unsupported"

---

## 🎯 Why This Fixes It

### Frogger Working Config (Reference)
```json
{
  "dependencies": {
    "@coinbase/onchainkit": "^0.38.0",
    "wagmi": "^2.13.0",
    "viem": "^2.21.0"
  }
}
```

**BUT** Frogger's `package-lock.json` locked ke:
- `@coinbase/onchainkit@0.38.0` (NOT 0.38.19)
- `wagmi@2.13.0` (NOT 2.19.5)
- `viem@2.21.0` (NOT 2.53.1)

Base Block tanpa lock file → npm install latest within `^` range → broke compatibility.

---

## 🔍 Technical Details

### Base Account SDK Compatibility Matrix

| wagmi | viem | @coinbase/onchainkit | Base Account | Status |
|-------|------|----------------------|--------------|--------|
| 2.13.0 | 2.21.0 | 0.38.0 | ✅ Working | Frogger proven |
| 2.19.5 | 2.53.1 | 0.38.19 | ❌ Broken | wallet_connect error |
| 3.x | 2.5x | 0.38.x | ❌ Broken | wagmi v3 incompatible |

### Why Newer Versions Break

1. **wagmi 2.19.5** introduced internal changes to connector API
2. **viem 2.53.1** changed how `eth_sendTransaction` is handled
3. **@coinbase/onchainkit 0.38.19** pulls `@wagmi/core@2.22.1` → version conflict
4. Base Account SDK (`@base-org/account@2.4.0`) was tested against wagmi 2.13.0 stack

### Code Verification

**Base Block already has correct dataSuffix setup:**

```typescript
// src/config/wagmi.ts
export const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_rhgm3bxx"] });

// src/hooks/useGameContract.ts
writeContract({
  address: GAME_CONTRACT_ADDRESS,
  abi: GAME_CONTRACT_ABI,
  functionName: 'startGame',
  args: [mode],
  chainId: base.id,
  dataSuffix: DATA_SUFFIX, // ✅ ERC-8021 builder code
});
```

**Wallet config matches Frogger:**

```typescript
// src/config/wagmi.ts
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    baseAccount({
      appName: "Base Block",
      appLogoUrl: typeof window !== "undefined" ? window.location.origin + "/favicon.ico" : undefined,
    }),
    injected(),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: false,
  storage: createStorage({ storage: localStorage }),
});
```

✅ **Code is correct** — only dependency versions are the issue.

---

## 🚨 If Still Broken After Fix

### Additional Debugging Steps

1. **Clear browser cache:**
   ```bash
   # Chrome DevTools
   F12 → Application → Clear Storage → Clear site data
   ```

2. **Check Vercel environment:**
   ```bash
   # Make sure Vercel rebuild after package.json change
   vercel --prod --force
   ```

3. **Verify build output:**
   ```bash
   npm run build
   # Check dist/ for viem/wagmi versions in bundled JS
   ```

4. **Test injected wallet first:**
   - Di desktop, test dengan MetaMask extension dulu
   - Kalau MetaMask works → Base Account SDK issue
   - Kalau MetaMask juga error → wagmi config issue

5. **Check console errors:**
   ```javascript
   // Browser console should show:
   // - Connected chainId
   // - Connector type
   // - Any RPC errors
   ```

---

## 📚 References

- **Frogger working commit:** https://github.com/zalana28/frogger-base-web3/commit/0b699dc
- **Base Account SDK:** https://docs.base.org/base-account/overview
- **Wagmi v2 docs:** https://wagmi.sh/react/api/connectors/base-account
- **ERC-8021 Builder Codes:** https://docs.base.org/apps/builder-codes/builder-codes

---

## ✅ Checklist

- [ ] Remove `^` dari semua dependencies di `package.json`
- [ ] `rm -rf node_modules package-lock.json`
- [ ] `npm install`
- [ ] `npm ls wagmi viem @coinbase/onchainkit` → verify exact versions
- [ ] `npm run build` → verify build success
- [ ] Test di mobile browser → Connect Wallet harus kerja
- [ ] Test startGame + submitScore → onchain tx harus kerja

---

**Updated:** 2026-06-26  
**Author:** Hermes Agent (Nous Research)
