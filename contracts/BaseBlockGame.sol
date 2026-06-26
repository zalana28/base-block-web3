// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BaseBlockGame {
    mapping(address => uint256) public classicBestScore;
    mapping(address => uint256) public arcadeBestScore;
    mapping(address => uint256) public arcadeHighestLevel;
    mapping(address => uint256) public totalGamesPlayed;
    
    event GameStarted(address indexed player, uint8 mode, uint256 timestamp);
    event GameCompleted(address indexed player, uint8 mode, uint256 score, uint256 level, uint256 timestamp);
    event NewHighScore(address indexed player, uint8 mode, uint256 oldScore, uint256 newScore);
    
    function startGame(uint8 mode) external {
        require(mode == 0 || mode == 1, "Invalid mode");
        totalGamesPlayed[msg.sender]++;
        emit GameStarted(msg.sender, mode, block.timestamp);
    }
    
    function submitScore(uint8 mode, uint256 score, uint256 level) external {
        require(mode == 0 || mode == 1, "Invalid mode");
        require(score > 0, "Score must be > 0");
        
        if (mode == 0) {
            uint256 oldScore = classicBestScore[msg.sender];
            if (score > oldScore) {
                classicBestScore[msg.sender] = score;
                emit NewHighScore(msg.sender, mode, oldScore, score);
            }
        } else {
            uint256 oldScore = arcadeBestScore[msg.sender];
            if (score > oldScore) {
                arcadeBestScore[msg.sender] = score;
                emit NewHighScore(msg.sender, mode, oldScore, score);
            }
            if (mode == 1 && level > arcadeHighestLevel[msg.sender]) {
                arcadeHighestLevel[msg.sender] = level;
            }
        }
        
        emit GameCompleted(msg.sender, mode, score, level, block.timestamp);
    }
    
    function getPlayerStats(address player) external view returns (
        uint256 classicScore,
        uint256 arcadeScore,
        uint256 arcadeLevel,
        uint256 gamesPlayed
    ) {
        return (
            classicBestScore[player],
            arcadeBestScore[player],
            arcadeHighestLevel[player],
            totalGamesPlayed[player]
        );
    }
}
