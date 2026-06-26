export const GAME_CONTRACT_ADDRESS = '0xf567D8C020D80AcF3735d0487452E4a3D2dE83fE' as const;

export const GAME_CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "player", "type": "address"},
      {"indexed": false, "name": "mode", "type": "uint8"},
      {"indexed": false, "name": "score", "type": "uint256"},
      {"indexed": false, "name": "level", "type": "uint256"},
      {"indexed": false, "name": "timestamp", "type": "uint256"}
    ],
    "name": "GameCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "player", "type": "address"},
      {"indexed": false, "name": "mode", "type": "uint8"},
      {"indexed": false, "name": "timestamp", "type": "uint256"}
    ],
    "name": "GameStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "player", "type": "address"},
      {"indexed": false, "name": "mode", "type": "uint8"},
      {"indexed": false, "name": "oldScore", "type": "uint256"},
      {"indexed": false, "name": "newScore", "type": "uint256"}
    ],
    "name": "NewHighScore",
    "type": "event"
  },
  {
    "inputs": [{"name": "mode", "type": "uint8"}],
    "name": "startGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "mode", "type": "uint8"},
      {"name": "score", "type": "uint256"},
      {"name": "level", "type": "uint256"}
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "player", "type": "address"}],
    "name": "getPlayerStats",
    "outputs": [
      {"name": "classicScore", "type": "uint256"},
      {"name": "arcadeScore", "type": "uint256"},
      {"name": "arcadeLevel", "type": "uint256"},
      {"name": "gamesPlayed", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "address"}],
    "name": "classicBestScore",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "address"}],
    "name": "arcadeBestScore",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "address"}],
    "name": "arcadeHighestLevel",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "address"}],
    "name": "totalGamesPlayed",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
