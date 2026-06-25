import type { BlockPiece, CellColor } from './types.js';

const COLORS: CellColor[] = ['red','orange','yellow','green','cyan','blue','purple','pink'];

const SHAPES: { name: string; shape: boolean[][] }[] = [
  { name: '1x1', shape: [[true]] },
  { name: '1x2', shape: [[true, true]] },
  { name: '1x3', shape: [[true, true, true]] },
  { name: 'L3', shape: [[true, false], [true, true]] },
  { name: '1x4', shape: [[true, true, true, true]] },
  { name: '2x2', shape: [[true, true], [true, true]] },
  { name: 'L4', shape: [[true, false, false], [true, true, true]] },
  { name: 'T4', shape: [[true, true, true], [false, true, false]] },
  { name: 'S4', shape: [[false, true, true], [true, true, false]] },
  { name: 'Z4', shape: [[true, true, false], [false, true, true]] },
  { name: '1x5', shape: [[true, true, true, true, true]] },
  { name: 'L5', shape: [[true, false, false, false], [true, true, true, true]] },
  { name: 'T5', shape: [[true, true, true], [false, true, false], [false, true, false]] },
  { name: 'Cross', shape: [[false, true, false], [true, true, true], [false, true, false]] },
  { name: '3x3', shape: [[true,true,true],[true,true,true],[true,true,true]] },
];

let idCounter = 0;

function randomColor(): CellColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomShape(): { name: string; shape: boolean[][] } {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

export function generatePiece(): BlockPiece {
  const s = randomShape();
  idCounter += 1;
  return {
    id: 'piece-' + idCounter + '-' + Date.now(),
    shape: s.shape,
    color: randomColor(),
    name: s.name,
  };
}

export function generateThreePieces(): BlockPiece[] {
  return [generatePiece(), generatePiece(), generatePiece()];
}

export function getShapeSize(shape: boolean[][]): { rows: number; cols: number } {
  return { rows: shape.length, cols: shape[0]?.length ?? 0 };
}
