import type { BlockPiece, CellColor, Shape } from './types.js';

const COLORS: CellColor[] = [
  'red', 'orange', 'yellow', 'green',
  'cyan', 'blue', 'purple', 'pink',
];

const T = true;
const F = false;

interface ShapeDef { name: string; shape: Shape; weight: number; }

const SHAPE_LIBRARY: ShapeDef[] = [
  // singles & lines
  { name: '1x1', shape: [[T]], weight: 4 },
  { name: '1x2-h', shape: [[T, T]], weight: 4 },
  { name: '1x2-v', shape: [[T], [T]], weight: 4 },
  { name: '1x3-h', shape: [[T, T, T]], weight: 4 },
  { name: '1x3-v', shape: [[T], [T], [T]], weight: 4 },
  { name: '1x4-h', shape: [[T, T, T, T]], weight: 3 },
  { name: '1x4-v', shape: [[T], [T], [T], [T]], weight: 3 },
  { name: '1x5-h', shape: [[T, T, T, T, T]], weight: 2 },
  { name: '1x5-v', shape: [[T], [T], [T], [T], [T]], weight: 2 },
  // squares
  { name: '2x2', shape: [[T, T], [T, T]], weight: 4 },
  { name: '3x3', shape: [[T, T, T], [T, T, T], [T, T, T]], weight: 1 },
  // L 2x2
  { name: 'L-tl', shape: [[T, T], [T, F]], weight: 3 },
  { name: 'L-tr', shape: [[T, T], [F, T]], weight: 3 },
  { name: 'L-bl', shape: [[T, F], [T, T]], weight: 3 },
  { name: 'L-br', shape: [[F, T], [T, T]], weight: 3 },
  // L 3x3 (sudut besar)
  { name: 'BigL-tl', shape: [[T, T, T], [T, F, F], [T, F, F]], weight: 2 },
  { name: 'BigL-tr', shape: [[T, T, T], [F, F, T], [F, F, T]], weight: 2 },
  { name: 'BigL-bl', shape: [[T, F, F], [T, F, F], [T, T, T]], weight: 2 },
  { name: 'BigL-br', shape: [[F, F, T], [F, F, T], [T, T, T]], weight: 2 },
  // T shapes
  { name: 'T-up', shape: [[T, T, T], [F, T, F]], weight: 2 },
  { name: 'T-down', shape: [[F, T, F], [T, T, T]], weight: 2 },
  // S/Z
  { name: 'S', shape: [[F, T, T], [T, T, F]], weight: 2 },
  { name: 'Z', shape: [[T, T, F], [F, T, T]], weight: 2 },
  // diagonal
  { name: 'diag2', shape: [[T, F], [F, T]], weight: 2 },
  { name: 'diag2-r', shape: [[F, T], [T, F]], weight: 2 },
];

const EASY_SHAPES = new Set([
  '1x1', '1x2-h', '1x2-v', '1x3-h', '1x3-v', '2x2',
]);

const HARD_SHAPES = new Set([
  '3x3', 'BigL-tl', 'BigL-tr', 'BigL-bl', 'BigL-br',
  'T-up', 'T-down', 'S', 'Z',
]);

function getDifficultyWeight(def: ShapeDef, level: number): number {
  const base = def.weight;
  if (level <= 1) return base;

  const easyBonus = EASY_SHAPES.has(def.name) ? -0.3 : 0;
  const hardBonus = HARD_SHAPES.has(def.name) ? 0.3 : 0;
  const levelFactor = Math.min((level - 1) * 0.15, 1.5);

  const adjusted = base * (1 + easyBonus * levelFactor + hardBonus * levelFactor);
  return Math.max(adjusted, 0.5);
}

function randomShape(level: number = 1): ShapeDef {
  const weighted = SHAPE_LIBRARY.map((s) => ({ ...s, w: getDifficultyWeight(s, level) }));
  const total = weighted.reduce((sum, s) => sum + s.w, 0);
  let n = Math.random() * total;
  for (const s of weighted) {
    n -= s.w;
    if (n <= 0) return s;
  }
  return SHAPE_LIBRARY[0];
}

function randomColor(): CellColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

let nextId = 0;
function freshId(): string {
  nextId += 1;
  return `p${Date.now().toString(36)}-${nextId}`;
}

export function generatePiece(level: number = 1): BlockPiece {
  const def = randomShape(level);
  return {
    id: freshId(),
    name: def.name,
    shape: def.shape.map((row) => row.slice()),
    color: randomColor(),
  };
}

export function generateTrayBatch(level: number = 1): (BlockPiece | null)[] {
  return [generatePiece(level), generatePiece(level), generatePiece(level)];
}

export function generateThreePieces(level: number = 1): BlockPiece[] {
  return [generatePiece(level), generatePiece(level), generatePiece(level)];
}

export function getShapeSize(shape: boolean[][]): { rows: number; cols: number } {
  return { rows: shape.length, cols: shape[0]?.length ?? 0 };
}
