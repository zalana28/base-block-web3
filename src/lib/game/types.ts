// Base Block — pure game logic types

export type CellColor =
  | 'red' | 'orange' | 'yellow' | 'green'
  | 'cyan' | 'blue' | 'purple' | 'pink';

export type Grid = (CellColor | null)[][];
export type Shape = boolean[][];

export interface BlockPiece {
  id: string;
  name: string;
  shape: Shape;
  color: CellColor;
}

export interface Position {
  row: number;
  col: number;
}

export interface ClearResult {
  clearedRows: number[];
  clearedCols: number[];
  cellsCleared: number;
  isCombo: boolean;
}

export interface GameState {
  grid: Grid;
  pieces: (BlockPiece | null)[]; // length 3, null = slot kosong
  score: number;
  bestScore: number;
  combo: number;
  maxCombo: number;
  streak: number;
  totalCleared: number;
  phase: 'menu' | 'playing' | 'over';
}

export interface PlacedPiece {
  piece: BlockPiece;
  position: Position;
}

export interface PlaceResult {
  success: boolean;
  state: GameState;
  clearResult?: ClearResult;
}

export const GRID_SIZE = 8;
