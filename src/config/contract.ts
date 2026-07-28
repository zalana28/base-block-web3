export const GAME_CONTRACT_ADDRESS = '0xEC8FB28Ec5D1F2be0d00b2293d6BF10B533fA49E' as const;

// ABI ini mengikuti kontrak yang BENAR-BENAR ter-deploy di alamat di atas
// (terverifikasi di Basescan), bukan contracts/BaseBlockGame.sol — file itu
// sempat tertinggal versi lama tanpa leaderboard dan sudah diselaraskan
// bersama commit ini. getTopScores / leaderboard / MAX_LEADERBOARD /
// LeaderboardUpdated ADA on-chain; jangan dihapus dari sini.
// Kalau kontrak diubah, regenerate dari compiler (forge inspect / solc --abi),
// jangan diedit tangan.
export const GAME_CONTRACT_ABI = [
  {
    'anonymous': false,
    'inputs': [
      {'indexed': true, 'name': 'player', 'type': 'address'},
      {'indexed': false, 'name': 'mode', 'type': 'uint8'},
      {'indexed': false, 'name': 'score', 'type': 'uint256'},
      {'indexed': false, 'name': 'level', 'type': 'uint256'},
      {'indexed': false, 'name': 'timestamp', 'type': 'uint256'}
    ],
    'name': 'GameCompleted',
    'type': 'event'
  },
  {
    'anonymous': false,
    'inputs': [
      {'indexed': true, 'name': 'player', 'type': 'address'},
      {'indexed': false, 'name': 'mode', 'type': 'uint8'},
      {'indexed': false, 'name': 'timestamp', 'type': 'uint256'}
    ],
    'name': 'GameStarted',
    'type': 'event'
  },
  {
    'anonymous': false,
    'inputs': [
      {'indexed': true, 'name': 'player', 'type': 'address'},
      {'indexed': false, 'name': 'mode', 'type': 'uint8'},
      {'indexed': false, 'name': 'oldScore', 'type': 'uint256'},
      {'indexed': false, 'name': 'newScore', 'type': 'uint256'}
    ],
    'name': 'NewHighScore',
    'type': 'event'
  },
  {
    'anonymous': false,
    'inputs': [
      {'indexed': true, 'name': 'player', 'type': 'address'},
      {'indexed': false, 'name': 'mode', 'type': 'uint8'},
      {'indexed': false, 'name': 'score', 'type': 'uint256'},
      {'indexed': false, 'name': 'level', 'type': 'uint256'},
      {'indexed': false, 'name': 'rank', 'type': 'uint256'}
    ],
    'name': 'LeaderboardUpdated',
    'type': 'event'
  },
  {
    'inputs': [{'name': 'mode', 'type': 'uint8'}],
    'name': 'startGame',
    'outputs': [],
    'stateMutability': 'nonpayable',
    'type': 'function'
  },
  {
    'inputs': [
      {'name': 'mode', 'type': 'uint8'},
      {'name': 'score', 'type': 'uint256'},
      {'name': 'level', 'type': 'uint256'}
    ],
    'name': 'submitScore',
    'outputs': [],
    'stateMutability': 'nonpayable',
    'type': 'function'
  },
  {
    'inputs': [{'name': 'player', 'type': 'address'}],
    'name': 'getPlayerStats',
    'outputs': [
      {'name': 'classicScore', 'type': 'uint256'},
      {'name': 'arcadeScore', 'type': 'uint256'},
      {'name': 'arcadeLevel', 'type': 'uint256'},
      {'name': 'gamesPlayed', 'type': 'uint256'}
    ],
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'inputs': [{'name': 'count', 'type': 'uint256'}],
    'name': 'getTopScores',
    'outputs': [
      {
        'components': [
          {'name': 'player', 'type': 'address'},
          {'name': 'mode', 'type': 'uint8'},
          {'name': 'score', 'type': 'uint256'},
          {'name': 'level', 'type': 'uint256'},
          {'name': 'timestamp', 'type': 'uint256'}
        ],
        'name': '',
        'type': 'tuple[]'
      }
    ],
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'inputs': [{'name': '', 'type': 'address'}],
    'name': 'classicBestScore',
    'outputs': [{'name': '', 'type': 'uint256'}],
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'inputs': [{'name': '', 'type': 'address'}],
    'name': 'arcadeBestScore',
    'outputs': [{'name': '', 'type': 'uint256'}],
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'inputs': [{'name': '', 'type': 'address'}],
    'name': 'arcadeHighestLevel',
    'outputs': [{'name': '', 'type': 'uint256'}],
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'inputs': [{'name': '', 'type': 'address'}],
    'name': 'totalGamesPlayed',
    'outputs': [{'name': '', 'type': 'uint256'}],
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'inputs': [{'name': '', 'type': 'uint256'}],
    'name': 'leaderboard',
    'outputs': [
      {'name': 'player', 'type': 'address'},
      {'name': 'mode', 'type': 'uint8'},
      {'name': 'score', 'type': 'uint256'},
      {'name': 'level', 'type': 'uint256'},
      {'name': 'timestamp', 'type': 'uint256'}
    ],
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'inputs': [],
    'name': 'MAX_LEADERBOARD',
    'outputs': [{'name': '', 'type': 'uint256'}],
    'stateMutability': 'view',
    'type': 'function'
  }
] as const;
