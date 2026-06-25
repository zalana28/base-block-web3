export function calculateScore(
  cellsPlaced: number,
  cellsCleared: number,
  isCombo: boolean,
  comboCount: number,
  streak: number,
): number {
  let score = cellsPlaced * 10;
  if (cellsCleared > 0) {
    score += cellsCleared * 50;
  }
  if (isCombo) {
    score += comboCount * 100; // bonus per extra line
  }
  if (streak > 1) {
    score += (streak - 1) * 25; // streak bonus
  }
  return score;
}

export function comboMultiplier(linesCleared: number): number {
  if (linesCleared <= 1) return 1;
  return 1 + (linesCleared - 1) * 0.5;
}

export function streakBonus(streak: number): number {
  if (streak <= 1) return 0;
  return (streak - 1) * 25;
}
