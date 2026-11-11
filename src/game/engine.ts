export const N = 8;
export const COLORS = [1, 2, 3, 4, 5, 6, 7, 8]; // tile palettes live in ui/theme.ts

export type Board = number[][]; // 0 empty, 1..7 color index+1
export type Gems = boolean[][];
export type Cell = [number, number];

export interface Piece {
  id: number;
  cells: Cell[];
  h: number;
  w: number;
  color: number; // 1..7
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- shapes ----------
// tier 0 = easy, 1 = medium, 2 = hard
const BASE: { m: string[]; tier: number; rot: boolean }[] = [
  { m: ['#'], tier: 0, rot: false },
  { m: ['##'], tier: 0, rot: true },
  { m: ['###'], tier: 0, rot: true },
  { m: ['####'], tier: 1, rot: true },
  { m: ['#####'], tier: 2, rot: true },
  { m: ['##', '##'], tier: 0, rot: false },
  { m: ['###', '###', '###'], tier: 2, rot: false },
  { m: ['##', '#.'], tier: 0, rot: true },
  { m: ['###', '#..', '#..'], tier: 2, rot: true },
  { m: ['###', '#..'], tier: 1, rot: true },
  { m: ['###', '..#'], tier: 1, rot: true },
  { m: ['###', '.#.'], tier: 1, rot: true },
  { m: ['.##', '##.'], tier: 1, rot: true },
  { m: ['##.', '.##'], tier: 1, rot: true },
  { m: ['##', '##', '##'], tier: 1, rot: true },
];

function rotate(m: string[]): string[] {
  const h = m.length, w = m[0].length;
  const out: string[] = [];
  for (let c = 0; c < w; c++) {
    let row = '';
    for (let r = h - 1; r >= 0; r--) row += m[r][c];
    out.push(row);
  }
  return out;
}

interface ShapeDef { cells: Cell[]; h: number; w: number; tier: number }
export const SHAPES: ShapeDef[] = (() => {
  const seen = new Set<string>();
  const out: ShapeDef[] = [];
  for (const b of BASE) {
    let m = b.m;
    for (let k = 0; k < (b.rot ? 4 : 1); k++) {
      const key = m.join('|');
      if (!seen.has(key)) {
        seen.add(key);
        const cells: Cell[] = [];
        m.forEach((row, r) => [...row].forEach((ch, c) => ch === '#' && cells.push([r, c])));
        out.push({ cells, h: m.length, w: m[0].length, tier: b.tier });
      }
      m = rotate(m);
    }
  }
  return out;
})();

let pieceCounter = 1;
export function makePiece(rng: Rng, difficulty: number): Piece {
  // difficulty 0..1 shifts weight toward harder shapes
  const wt = [1.0, 0.35 + difficulty * 0.9, 0.05 + difficulty * 0.8];
  const weights = SHAPES.map((s) => wt[s.tier]);
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  let idx = 0;
  for (; idx < weights.length - 1; idx++) {
    x -= weights[idx];
    if (x <= 0) break;
  }
  const s = SHAPES[idx];
  return { id: pieceCounter++, cells: s.cells, h: s.h, w: s.w, color: 1 + Math.floor(rng() * COLORS.length) };
}

// ---------- board ops ----------
export const emptyBoard = (): Board => Array.from({ length: N }, () => Array(N).fill(0));
export const emptyGems = (): Gems => Array.from({ length: N }, () => Array(N).fill(false));
export const cloneBoard = (b: Board): Board => b.map((r) => r.slice());
export const cloneGems = (g: Gems): Gems => g.map((r) => r.slice());

export function canPlace(board: Board, p: Piece, r: number, c: number): boolean {
  for (const [dr, dc] of p.cells) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || cc < 0 || rr >= N || cc >= N || board[rr][cc] !== 0) return false;
  }
  return true;
}

export function pieceFits(board: Board, p: Piece): boolean {
  for (let r = 0; r <= N - p.h; r++)
    for (let c = 0; c <= N - p.w; c++) if (canPlace(board, p, r, c)) return true;
  return false;
}

export function anyFits(board: Board, tray: (Piece | null)[]): boolean {
  return tray.some((p) => p && pieceFits(board, p));
}

export function generateTray(board: Board, rng: Rng, difficulty: number): Piece[] {
  let best: Piece[] = [];
  for (let attempt = 0; attempt < 30; attempt++) {
    const t = [0, 1, 2].map(() => makePiece(rng, difficulty));
    best = t;
    // require that at least two pieces fit, so the player isn't ambushed
    if (t.filter((p) => pieceFits(board, p)).length >= 2) return t;
  }
  return best;
}

export function stamp(board: Board, p: Piece, r: number, c: number): Board {
  const nb = cloneBoard(board);
  for (const [dr, dc] of p.cells) nb[r + dr][c + dc] = p.color;
  return nb;
}

export interface Clears {
  rows: number[];
  cols: number[];
  cells: Cell[];
}
export function findClears(board: Board): Clears {
  const rows: number[] = [], cols: number[] = [];
  for (let r = 0; r < N; r++) if (board[r].every((v) => v !== 0)) rows.push(r);
  for (let c = 0; c < N; c++) if (board.every((row) => row[c] !== 0)) cols.push(c);
  const set = new Set<number>();
  rows.forEach((r) => { for (let c = 0; c < N; c++) set.add(r * N + c); });
  cols.forEach((c) => { for (let r = 0; r < N; r++) set.add(r * N + c); });
  const cells: Cell[] = [...set].map((k) => [Math.floor(k / N), k % N] as Cell);
  return { rows, cols, cells };
}

export function applyClears(board: Board, gems: Gems, cl: Clears): { board: Board; gems: Gems; gemsCollected: number } {
  const nb = cloneBoard(board), ng = cloneGems(gems);
  let gemsCollected = 0;
  for (const [r, c] of cl.cells) {
    if (ng[r][c]) gemsCollected++;
    nb[r][c] = 0;
    ng[r][c] = false;
  }
  return { board: nb, gems: ng, gemsCollected };
}

export const isBoardEmpty = (b: Board) => b.every((r) => r.every((v) => v === 0));

// score = cells placed + line bonus scaled by simultaneous lines and combo streak
export function scoreFor(cellsPlaced: number, lines: number, combo: number, allClear: boolean): number {
  let s = cellsPlaced;
  if (lines > 0) s += lines * lines * 10 + combo * 10;
  if (allClear) s += 120;
  return s;
}

export function praise(lines: number, combo: number): string | null {
  if (lines === 0) return null;
  if (lines >= 4) return 'Incredible!';
  if (lines === 3) return 'Awesome!';
  if (lines === 2) return 'Great!';
  if (combo >= 3) return `Combo x${combo}!`;
  return 'Nice!';
}

// Build a piece from an ASCII mask, e.g. shapePiece(['###'], 5)
export function shapePiece(m: string[], color: number): Piece {
  const cells: Cell[] = [];
  m.forEach((row, r) => [...row].forEach((ch, c) => ch === '#' && cells.push([r, c])));
  return { id: pieceCounter++, cells, h: m.length, w: m[0].length, color };
}
