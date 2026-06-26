# Smart Contract Deployment Guide

## 📝 File: BaseBlockGame.sol

### Step 1: Buka Remix IDE
- Go to: https://remix.ethereum.org

### Step 2: Create & Paste Contract
- Klik icon + (New File)
- Nama: BaseBlockGame.sol
- Copy code dari contracts/BaseBlockGame.sol
- Paste ke editor

### Step 3: Compile
- Klik tab Solidity Compiler
- Version: 0.8.20+
- Klik Compile BaseBlockGame.sol
- Tunggu checkmark hijau

### Step 4: Connect Wallet
- MetaMask → Switch ke Base Mainnet (Chain ID: 8453)
- Pastikan ada ETH (minimal 5 dollar)

### Step 5: Deploy
- Klik tab Deploy & Run Transactions
- Environment: Injected Provider - MetaMask
- Contract: BaseBlockGame
- Klik Deploy (orange button)
- MetaMask popup → Confirm (gas ~1-3 dollar)
- Tunggu 5-10 detik

### Step 6: Copy Address
Setelah sukses, copy contract address:
Format: 0x1234567890abcdef1234567890abcdef12345678

SIMPAN ADDRESS INI - kasih ke developer!

---

## Gas Cost
- Deploy: ~2 dollar (sekali)
- startGame(): ~0.01 dollar
- submitScore(): ~0.01 dollar

---

## After Deploy
Kasih developer:
1. Contract Address
2. Network: Base Mainnet (8453)
