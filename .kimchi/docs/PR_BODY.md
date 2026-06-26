## 🎮 What's New

### Arcade Mode
- Classic vs Arcade mode selection on wallet gate
- Arcade: 90s countdown timer per level
- Auto game-over when timer hits 0 (shows ⏰ TIME'S UP)
- No-moves game-over shows 💀 GAME OVER

### Level System
- Level up every 500 points in Arcade mode
- Difficulty scaling: bigger pieces spawn more often at higher levels
- Progress bar showing target score progress
- Level display in ScoreBoard & GameOverModal
- Web Audio API level-up sound effect

### Blockchain Integration
- WalletGate calls `startGame(mode)` on-chain
- Auto `submitScore(mode, score, level)` on game over
- Fixed smart contract guard: `arcadeHighestLevel` only updates when `mode == 1`
- Leaderboard sorting: level desc → score desc

### UI Polish
- NextTray: preview upcoming pieces
- Timer color changes (green → orange → red)
- ScoreBoard progress bar with glow effect

### Contract Fix
```solidity
if (mode == 1 && level > arcadeHighestLevel[msg.sender]) {
    arcadeHighestLevel[msg.sender] = level;
}
```

### Files Changed
- `contracts/BaseBlockGame.sol`
- `src/App.tsx`
- `src/components/WalletGate.tsx`
- `src/components/ScoreBoard.tsx`
- `src/components/GameOverModal.tsx`
- `src/components/Leaderboard.tsx`
- `src/components/NextTray.tsx` (new)
- `src/hooks/useGameState.ts`
- `src/hooks/useBlockGenerator.ts`
- `src/hooks/useGameContract.ts`
- `src/lib/game/generator.ts`
- `src/lib/game/types.ts`
