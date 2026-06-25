export function calculateScore(
  placedCells: number,
  cellsCleared: number,
  isCombo: boolean,
  linesCleared: number,
  streak: number,
): number {
  let score = placedCells;          // +1 per sel ditempatkan
  score += cellsCleared * 10;       // +10 per sel cleared
  if (isCombo) score += linesCleared * 20; // bonus combo (multi-line)
  if (streak > 0) score += streak * 5;     // bonus streak
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
