import { Board, Gems, N, Piece, SHAPES, emptyBoard, emptyGems, mulberry32, shapePiece } from './engine';

export type GoalType = 'score' | 'lines' | 'gems';
export interface Level {
  id: number;
  goal: { type: GoalType; target: number };
  board: Board;
  gems: Gems;
  difficulty: number; // 0..1
  fixedTray?: () => Piece[]; // scripted first tray (tutorial)
  guide?: { slot: number; r: number; c: number }; // tutorial hint target
}

export const LEVEL_COUNT = 50;

function buildLevel(id: number): Level {
  const rng = mulberry32(id * 7919 + 13);
  const tier = (id - 1) / (LEVEL_COUNT - 1);

  let type: GoalType = 'score';
  if (id >= 4) type = (['lines', 'score', 'gems'] as GoalType[])[(id - 4) % 3];
  if (type === 'gems' && id < 8) type = 'lines';

  let target: number;
  let gemCount = 0;
  if (type === 'score') target = Math.round((120 + id * 28) / 10) * 10;
  else if (type === 'lines') target = 3 + Math.floor(id / 3);
  else {
    gemCount = Math.min(12, 3 + Math.floor(id / 6));
    target = gemCount;
  }

  // Journey levels start with whole pieces already on the board; the player fits theirs around them.
  const board = emptyBoard();
  const gems = emptyGems();
  const filled = Math.min(36, 14 + Math.floor(id * 0.5) + (type === 'gems' ? 4 : 0));
  const cells: [number, number][] = [];
  const pool = SHAPES.filter((sh) => sh.tier <= 1 && sh.w <= 3 && sh.h <= 3);
  let guard = 0;
  while (cells.length < filled && guard++ < 900) {
    const sh = pool[Math.floor(rng() * pool.length)];
    const r0 = Math.floor(rng() * (N - sh.h + 1)), c0 = Math.floor(rng() * (N - sh.w + 1));
    if (sh.cells.some(([dr, dc]) => board[r0 + dr][c0 + dc])) continue;
    const color = 1 + Math.floor(rng() * 8);
    sh.cells.forEach(([dr, dc]) => { board[r0 + dr][c0 + dc] = color; });
    // keep every line at least 2 cells short of full (closable, but never pre-cleared)
    const bad = board.some((row) => row.filter(Boolean).length > N - 2) || Array.from({ length: N }, (_, c) => board.filter((row) => row[c]).length).some((n) => n > N - 2);
    if (bad) { sh.cells.forEach(([dr, dc]) => { board[r0 + dr][c0 + dc] = 0; }); continue; }
    sh.cells.forEach(([dr, dc]) => cells.push([r0 + dr, c0 + dc]));
  }
  for (let g = 0, tries = 0; g < gemCount && tries++ < 200; ) {
    const [r, c] = cells[Math.floor(rng() * cells.length)];
    if (gems[r][c]) continue;
    gems[r][c] = true; g++;
  }
  return { id, goal: { type, target }, board, gems, difficulty: Math.min(1, tier * 0.9) };
}

// Scripted tutorial position: bottom row has a 3-wide gap and the first piece fills it.
export const TUTORIAL_GUIDE = { slot: 0, r: N - 1, c: 2 };
export function tutorialSetup() {
  const board = emptyBoard();
  for (const c of [0, 1, 5, 6, 7]) board[N - 1][c] = 1 + (c % 3);
  // a few pieces already on the board, away from the gap
  for (const [r, c, col] of [[6, 0, 4], [6, 1, 4], [5, 0, 4], [6, 6, 6], [6, 7, 6], [5, 7, 6], [4, 3, 2], [4, 4, 2], [3, 3, 2]] as [number, number, number][]) board[r][c] = col;
  return {
    board,
    gems: emptyGems(),
    tray: (): Piece[] => [shapePiece(['###'], 5), shapePiece(['##', '##'], 2), shapePiece(['#'], 3)],
  };
}

function tutorialLevel(): Level {
  const base = buildLevel(1);
  const t = tutorialSetup();
  return { ...base, goal: { type: 'score', target: 150 }, board: t.board, gems: t.gems, fixedTray: t.tray, guide: TUTORIAL_GUIDE };
}

export const LEVELS: Level[] = Array.from({ length: LEVEL_COUNT }, (_, i) => (i === 0 ? tutorialLevel() : buildLevel(i + 1)));

export function goalText(l: Level): string {
  const t = l.goal.target;
  if (l.goal.type === 'score') return `Reach ${t} points`;
  if (l.goal.type === 'lines') return `Clear ${t} lines`;
  return `Collect ${t} gems`;
}
