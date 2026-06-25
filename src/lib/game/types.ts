// Base Block — pure game logic types

export const GRID_SIZE = 8;

export type CellColor =
  | 'red' | 'orange' | 'yellow' | 'green'
  | 'cyan' | 'blue' | 'purple' | 'pink' | null;

export type Grid = CellColor[][];

export interface Position {
  row: number;
  col: number;
}

export interface BlockPiece {
  id: string;
  shape: boolean[][];
  color: CellColor;
  name: string;
}

export interface PlacedPiece {
  piece: BlockPiece;
  position: Position;
}

export interface GameState {
  grid: Grid;
  pieces: BlockPiece[];
  score: number;
  bestScore: number;
  combo: number;
  maxCombo: number;
  streak: number;
  totalCleared: number;
  phase: 'menu' | 'playing' | 'over';
}

export interface ClearResult {
  clearedRows: number[];
  clearedCols: number[];
  cellsCleared: number;
  isCombo: boolean;
}

export interface PlaceResult {
  success: boolean;
  state: GameState;
  clearResult?: ClearResult;
}
