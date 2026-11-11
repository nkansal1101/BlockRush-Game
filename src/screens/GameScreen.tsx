import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  Board, Gems, N, Piece, Rng, anyFits, applyClears, canPlace, cloneGems, emptyBoard, emptyGems, findClears,
  generateTray, isBoardEmpty, mulberry32, praise, scoreFor, stamp, Cell,
} from '../game/engine';
import { Level, TUTORIAL_GUIDE, goalText, tutorialSetup } from '../game/levels';
import { Block } from '../ui/Block';
import { BubbleText } from '../ui/Bubble';
import { Backdrop } from '../ui/Backdrop';
import { Button } from '../ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { Mascot } from '../ui/Mascot';
import { Ribbon } from '../ui/Ribbon';
import { TILES, theme } from '../ui/theme';
import { play, buzz } from '../game/sound';

export type Mode = { kind: 'classic'; tutorial?: boolean } | { kind: 'level'; level: Level };
export interface Result { won: boolean; score: number; stars: number }

interface Hover { r: number; c: number; ok: boolean; piece: Piece }
interface GState {
  board: Board;
  gems: Gems;
  tray: (Piece | null)[];
  score: number;
  lines: number;
  gemsGot: number;
  combo: number;
  stars: number;
  status: 'playing' | 'won' | 'lost';
  flash: Set<number>;
  dragIdx: number | null;
}

const LIFT_CELLS = 2.4;
const COMBO_STYLES: [string, string][] = [['#d9ffc4', '#1d8a1d'], ['#ffd1d1', '#c52f35'], ['#d6e6ff', '#2a56d4'], ['#f1d4ff', '#7d2fc0'], ['#ffe9b8', '#d4741a']];

function initState(mode: Mode, rng: Rng, tutorialAllowed = true): GState {
  if (mode.kind === 'classic' && mode.tutorial && tutorialAllowed) {
    const t = tutorialSetup();
    return { board: t.board, gems: t.gems, tray: t.tray(), score: 0, lines: 0, gemsGot: 0, combo: 0, stars: 0, status: 'playing', flash: new Set(), dragIdx: null };
  }
  const board = mode.kind === 'level' ? mode.level.board.map((r) => r.slice()) : emptyBoard();
  const gems = mode.kind === 'level' ? cloneGems(mode.level.gems) : emptyGems();
  const diff = mode.kind === 'level' ? mode.level.difficulty : 0.4;
  const fixed = mode.kind === 'level' && mode.level.fixedTray ? mode.level.fixedTray() : null;
  return { board, gems, tray: fixed ?? generateTray(board, rng, diff), score: 0, lines: 0, gemsGot: 0, combo: 0, stars: 0, status: 'playing', flash: new Set(), dragIdx: null };
}

// ---- memoised board cell: only re-renders when its own content changes ----
const BoardCell = React.memo(function BoardCell({ v, gem, flashing, cell, anim, alt }: { v: number; gem: boolean; flashing: boolean; cell: number; anim: Animated.Value; alt: boolean }) {
  return (
    <View style={{ width: cell, height: cell, padding: 1.5 }}>
      <View style={{ flex: 1, backgroundColor: alt ? '#22346f' : '#1a2859', borderRadius: cell * 0.16, borderTopWidth: 2, borderTopColor: 'rgba(0,0,0,0.28)', borderBottomWidth: 1.5, borderBottomColor: 'rgba(120,150,255,0.12)' }} />
      {v !== 0 && (
        <Animated.View
          style={[StyleSheet.absoluteFill, flashing && { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 0.2] }) }] }]}
        >
          <Block size={cell} color={v} gem={gem} />
        </Animated.View>
      )}
    </View>
  );
});

const PieceView = React.memo(function PieceView({ piece, size }: { piece: Piece; size: number }) {
  return (
    <View style={{ width: piece.w * size, height: piece.h * size }}>
      {piece.cells.map(([r, c]: Cell, k) => (
        <View key={k} style={{ position: 'absolute', left: c * size, top: r * size }}>
          <Block size={size} color={piece.color} />
        </View>
      ))}
    </View>
  );
});

// Confetti-style burst from cleared cells.
interface Pt { x: number; y: number; color: number }
function Burst({ id, pts, cell }: { id: number; pts: Pt[]; cell: number }) {
  const items = useMemo(() => pts.map((p) => ({
    ...p, a: Math.random() * Math.PI * 2, d: cell * (0.9 + Math.random() * 1.9), s: cell * (0.16 + Math.random() * 0.2),
    rot: (Math.random() * 2 - 1) * 260, v: new Animated.Value(0),
  })), [id]);
  useEffect(() => {
    if (!id) return;
    Animated.parallel(items.map((it) => Animated.timing(it.v, { toValue: 1, duration: 620, useNativeDriver: true }))).start();
  }, [items]);
  if (!id) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {items.map((it, k) => (
        <Animated.View key={k} style={{
          position: 'absolute', left: it.x - it.s / 2, top: it.y - it.s / 2, width: it.s, height: it.s, borderRadius: it.s * 0.3,
          backgroundColor: TILES[(it.color - 1) % TILES.length][0], borderWidth: 1.5, borderColor: TILES[(it.color - 1) % TILES.length][3],
          opacity: it.v.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: it.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(it.a) * it.d] }) },
            { translateY: it.v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, Math.sin(it.a) * it.d * 0.7 - cell * 0.5, Math.sin(it.a) * it.d + cell * 1.1] }) },
            { rotate: it.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${it.rot}deg`] }) },
            { scale: it.v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
          ],
        }} />
      ))}
    </View>
  );
}

// New pieces fall in from above the screen, staggered, with a little bounce.
function DropIn({ delay, children }: { delay: number; children: React.ReactNode }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([Animated.delay(delay), Animated.spring(a, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true })]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: a.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }), transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-380, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

export function GameScreen({ mode, onExit, onFinish, onNext, best, onGuideDone }: {
  mode: Mode; onExit: () => void; onFinish: (r: Result) => void; onNext?: () => void; best: number; onGuideDone?: () => void;
}) {
  const { width } = useWindowDimensions();
  const boardPx = Math.min(width - 28, 440);
  const frame = 8;
  const inner = boardPx - frame * 2;
  const cell = inner / N;
  const slotW = boardPx / 3;
  const slotH = cell * 3.5;

  const rngRef = useRef<Rng>(mulberry32((Date.now() ^ 0x9e3779b9) >>> 0));
  const [g, setG] = useState<GState>(() => initState(mode, rngRef.current));
  const gRef = useRef(g);
  gRef.current = g;
  const busy = useRef(false);
  const [paused, setPaused] = useState(false);
  const guideInfo = mode.kind === 'level' ? mode.level.guide : mode.tutorial ? TUTORIAL_GUIDE : undefined;
  const hasGuide = !!guideInfo;
  const classicTutorialDone = useRef(false);
  const [guideOn, setGuideOn] = useState(hasGuide);
  const guideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!guideOn) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(500),
      Animated.timing(guideAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.delay(450),
      Animated.timing(guideAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [guideOn]);
  const [hover, setHoverState] = useState<Hover | null>(null);
  const hoverKey = useRef('');
  const [toast, setToast] = useState<{ text: string; tier: number } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scoreBump = useRef(new Animated.Value(0)).current;
  const dragPos = useRef(new Animated.ValueXY({ x: -999, y: -999 })).current;
  const [burst, setBurst] = useState<{ id: number; pts: Pt[] }>({ id: 0, pts: [] });
  const shake = useRef(new Animated.Value(0)).current;
  const [pop, setPop] = useState<{ id: number; text: string; x: number; y: number } | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const doShake = (power: number) => {
    const a = 4 + power * 3;
    Animated.sequence([-a, a, -a * 0.7, a * 0.5, -a * 0.25, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 42, useNativeDriver: true }))).start();
  };

  const boardRef = useRef<any>(null);
  const rootRef = useRef<any>(null);
  const boardOrigin = useRef({ x: 0, y: 0 });
  const rootOrigin = useRef({ x: 0, y: 0 });
  const measureAll = () => {
    boardRef.current?.measure((_x: number, _y: number, _w: number, _h: number, px: number, py: number) => { boardOrigin.current = { x: px, y: py }; });
    rootRef.current?.measure((_x: number, _y: number, _w: number, _h: number, px: number, py: number) => { rootOrigin.current = { x: px, y: py }; });
  };
  useEffect(() => { const t = setTimeout(measureAll, 400); const d = setTimeout(() => play('drop'), 120); return () => { clearTimeout(t); clearTimeout(d); }; }, []);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    scoreBump.setValue(0);
    Animated.sequence([Animated.timing(scoreBump, { toValue: 1, duration: 110, useNativeDriver: true }), Animated.timing(scoreBump, { toValue: 0, duration: 160, useNativeDriver: true })]).start();
  }, [g.score]);

  const showToast = (text: string, tier: number) => {
    setToast({ text, tier });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.delay(450),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const restart = () => {
    timers.current.forEach(clearTimeout);
    busy.current = false;
    setPaused(false);
    setHover(null);
    const replayGuide = hasGuide && !(mode.kind === 'classic' && classicTutorialDone.current);
    setGuideOn(replayGuide);
    setG(initState(mode, rngRef.current, replayGuide));
  };

  const setHover = (h: Hover | null) => {
    const key = h ? `${h.r},${h.c},${h.ok}` : '';
    if (key === hoverKey.current) return;
    hoverKey.current = key;
    setHoverState(h);
  };

  const pieceBoxSize = (p: Piece) => Math.min(cell * 0.72, (slotW - 14) / p.w, (slotH - 10) / p.h);

  const computeHover = (i: number, x: number, y: number): Hover | null => {
    const p = gRef.current.tray[i];
    if (!p) return null;
    const left = x - (p.w * cell) / 2;
    const top = y - LIFT_CELLS * cell - (p.h * cell) / 2;
    const c = Math.round((left - boardOrigin.current.x - frame) / cell);
    const r = Math.round((top - boardOrigin.current.y - frame) / cell);
    if (!(r > -p.h && c > -p.w && r < N && c < N)) return null;
    // tutorial: snap to the highlighted gap when the player is roughly there
    const gd = guideInfo;
    if (guideOn && gd && i === gd.slot && Math.abs(r - gd.r) <= 1 && Math.abs(c - gd.c) <= 1) {
      return { r: gd.r, c: gd.c, ok: canPlace(gRef.current.board, p, gd.r, gd.c), piece: p };
    }
    return { r, c, ok: canPlace(gRef.current.board, p, r, c), piece: p };
  };
  const computeHoverRef = useRef(computeHover);
  computeHoverRef.current = computeHover;

  const commit = (i: number, r: number, c: number) => {
    const cur = gRef.current;
    const p = cur.tray[i]!;
    busy.current = true;
    if (guideOn) { setGuideOn(false); classicTutorialDone.current = true; onGuideDone?.(); }
    const placed = stamp(cur.board, p, r, c);
    const cl = findClears(placed);
    const lines = cl.rows.length + cl.cols.length;
    const combo = lines > 0 ? cur.combo + 1 : 0;
    const tray = cur.tray.map((t, k) => (k === i ? null : t));
    play('place');
    buzz('light');

    const finish = (board: Board, gems: Gems, gemsGot: number) => {
      let nextTray = tray;
      if (nextTray.every((t) => t === null)) {
        const diff = mode.kind === 'level' ? mode.level.difficulty : Math.min(1, 0.3 + cur.score / 4000);
        nextTray = generateTray(board, rngRef.current, diff);
        play('drop');
      }
      const allClear = isBoardEmpty(board);
      const score = cur.score + scoreFor(p.cells.length, lines, combo, allClear && lines > 0);
      const totalLines = cur.lines + lines;
      const totalGems = cur.gemsGot + gemsGot;
      let status: GState['status'] = 'playing';
      let stars = 0;
      if (mode.kind === 'level') {
        const t = mode.level.goal;
        const v = t.type === 'score' ? score : t.type === 'lines' ? totalLines : totalGems;
        if (v >= t.target) {
          status = 'won';
          const base = t.type === 'score' ? t.target : mode.level.id * 20 + 150;
          const ratio = score / base;
          stars = ratio >= 2 ? 3 : ratio >= 1.4 ? 2 : 1;
        }
      }
      if (status === 'playing' && !anyFits(board, nextTray)) status = 'lost';
      setG({ board, gems, tray: nextTray, score, lines: totalLines, gemsGot: totalGems, combo, stars, status, flash: new Set(), dragIdx: null });
      busy.current = false;
      if (status === 'won') { play('win'); buzz('success'); onFinish({ won: true, score, stars }); }
      else if (status === 'lost') { play('lose'); buzz('medium'); onFinish({ won: false, score, stars: 0 }); }
    };

    if (lines === 0) {
      setHover(null);
      setG({ ...cur, board: placed, tray, combo, dragIdx: null });
      later(() => finish(placed, cur.gems, 0), 0);
      return;
    }
    setHover(null);
    setG({ ...cur, board: placed, tray, combo, flash: new Set(cl.cells.map(([rr, cc]) => rr * N + cc)), dragIdx: null });
    flashAnim.setValue(0);
    Animated.timing(flashAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    {
      const sample = cl.cells.filter((_, k) => k % (cl.cells.length > 20 ? 2 : 1) === 0);
      setBurst({ id: Date.now(), pts: sample.map(([rr, cc]) => ({ x: cc * cell + cell / 2, y: rr * cell + cell / 2, color: placed[rr][cc] })) });
      doShake(Math.max(lines, combo));
      const gain = scoreFor(p.cells.length, lines, combo, isBoardEmpty(applyClears(placed, cur.gems, cl).board));
      setPop({ id: Date.now(), text: `+${gain}`, x: boardPx / 2, y: boardPx * 0.3 });
      popAnim.setValue(0);
      Animated.timing(popAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    }
    const pr = praise(lines, combo);
    play(combo >= 2 || lines >= 2 ? 'combo' : 'clear');
    buzz('medium');
    if (pr) showToast(pr, Math.max(lines, combo));
    later(() => {
      const res = applyClears(placed, cur.gems, cl);
      finish(res.board, res.gems, res.gemsCollected);
    }, 340);
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const responders = useMemo(
    () =>
      [0, 1, 2].map((i) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => !busy.current && gRef.current.status === 'playing' && !!gRef.current.tray[i],
          onPanResponderGrant: (e) => {
            measureAll();
            const { pageX, pageY } = e.nativeEvent;
            const p = gRef.current.tray[i]!;
            dragPos.setValue({ x: pageX - rootOrigin.current.x - (p.w * cell) / 2, y: pageY - rootOrigin.current.y - LIFT_CELLS * cell - (p.h * cell) / 2 });
            buzz('light');
            play('pick');
            setG((s) => ({ ...s, dragIdx: i }));
            setHover(computeHoverRef.current(i, pageX, pageY));
          },
          onPanResponderMove: (_e, gs) => {
            const p = gRef.current.tray[i];
            if (!p) return;
            dragPos.setValue({ x: gs.moveX - rootOrigin.current.x - (p.w * cell) / 2, y: gs.moveY - rootOrigin.current.y - LIFT_CELLS * cell - (p.h * cell) / 2 });
            setHover(computeHoverRef.current(i, gs.moveX, gs.moveY));
          },
          onPanResponderRelease: (_e, gs) => {
            const h = computeHoverRef.current(i, gs.moveX, gs.moveY);
            if (h && h.ok) commitRef.current(i, h.r, h.c);
            else {
              if (h) { play('invalid'); buzz('medium'); }
              setHover(null);
              setG((s) => ({ ...s, dragIdx: null }));
            }
          },
          onPanResponderTerminate: () => { setHover(null); setG((s) => ({ ...s, dragIdx: null })); },
        }),
      ),
    [cell],
  );

  // goal progress
  let prog: { cur: number; target: number } | null = null;
  if (mode.kind === 'level') {
    const t = mode.level.goal;
    const cur = t.type === 'score' ? g.score : t.type === 'lines' ? g.lines : g.gemsGot;
    prog = { cur: Math.min(cur, t.target), target: t.target };
  }
  const dragPiece = g.dragIdx !== null ? g.tray[g.dragIdx] : null;
  const toastStyle = COMBO_STYLES[((toast?.tier ?? 1) - 1) % COMBO_STYLES.length];

  return (
    <Backdrop>
      <View ref={rootRef} collapsable={false} style={{ flex: 1, alignItems: 'center' }}>
        {/* header */}
        <View style={styles.header}>
          <Pressable onPress={() => { play('click'); setPaused(true); }} style={styles.iconBtn}>
            <View style={{ flexDirection: 'row' }}><View style={styles.bar} /><View style={[styles.bar, { marginLeft: 5 }]} /></View>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ scale: scoreBump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>
              <BubbleText size={44} edge="#12296e">{String(g.score)}</BubbleText>
            </Animated.View>
          </View>
          <View style={styles.bestPill}>
            <Text style={{ fontSize: 16 }}>🏆</Text>
            <Text style={styles.bestTxt}>{mode.kind === 'level' ? `Lv ${mode.level.id}` : Math.max(best, g.score)}</Text>
          </View>
        </View>

        {prog && mode.kind === 'level' && (
          <View style={{ width: boardPx, marginBottom: 10 }}>
            <View style={styles.goalBar}>
              <View style={[styles.goalFill, { width: `${Math.max(6, (prog.cur / prog.target) * 100)}%` }]}>
                <View style={{ height: '45%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
              </View>
              <Text style={styles.goalTxt}>{goalText(mode.level)}  {prog.cur}/{prog.target}</Text>
            </View>
          </View>
        )}

        {/* board */}
        <Animated.View style={{ width: boardPx, height: boardPx, borderRadius: 22, backgroundColor: '#0f3a85', paddingBottom: 6, transform: [{ translateX: shake }] }}>
          <View ref={boardRef} collapsable={false} style={{ flex: 1, borderRadius: 22, overflow: 'hidden' }}>
            <LinearGradient colors={['#8fc6ff', '#3b8ae6', '#2467c9']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            <View style={{ flex: 1, margin: 2, padding: frame - 4, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' }}>
            <View style={{ flex: 1, backgroundColor: theme.board, borderRadius: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
              {g.board.map((row, r) =>
                row.map((v, c) => (
                  <BoardCell key={r * N + c} v={v} gem={g.gems[r][c]} flashing={g.flash.has(r * N + c)} cell={cell - 0.0001} anim={flashAnim} alt={(r + c) % 2 === 0} />
                )),
              )}
              {hover && (
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  {hover.piece.cells.map(([dr, dc], k) => {
                    const rr = hover.r + dr, cc = hover.c + dc;
                    if (rr < 0 || cc < 0 || rr >= N || cc >= N) return null;
                    return (
                      <View key={k} style={{ position: 'absolute', left: cc * cell, top: rr * cell }}>
                        <Block size={cell} color={hover.ok ? hover.piece.color : 1} opacity={hover.ok ? 0.5 : 0.28} />
                      </View>
                    );
                  })}
                </View>
              )}
              <Burst id={burst.id} pts={burst.pts} cell={cell} />
            </View>
            </View>
          </View>
          {guideOn && guideInfo && g.dragIdx === null && g.tray[guideInfo.slot] && (() => {
            const gd = guideInfo;
            const piece = g.tray[gd.slot]!;
            const sx = slotW * (gd.slot + 0.5) - 14;
            const sy = boardPx + 22 + slotH / 2 - 8;
            const tx = frame + (gd.c + piece.w / 2) * cell - 14;
            const ty = frame + (gd.r + piece.h / 2) * cell - 8 + LIFT_CELLS * cell;
            return (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {piece.cells.map(([dr, dc]: Cell, k: number) => (
                  <Animated.View key={k} style={{ position: 'absolute', left: frame + (gd.c + dc) * cell, top: frame + (gd.r + dr) * cell, width: cell, height: cell, padding: 2, opacity: guideAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.55, 1, 1] }) }}>
                    <View style={{ flex: 1, borderRadius: cell * 0.18, backgroundColor: 'rgba(120,225,255,0.35)', borderWidth: 3, borderColor: '#6fe3ff' }} />
                  </Animated.View>
                ))}
                <Animated.Text style={{ position: 'absolute', left: 0, top: 0, fontSize: 46, transform: [
                  { translateX: guideAnim.interpolate({ inputRange: [0, 1], outputRange: [sx, tx] }) },
                  { translateY: guideAnim.interpolate({ inputRange: [0, 1], outputRange: [sy, ty] }) },
                ] }}>👆</Animated.Text>
              </View>
            );
          })()}
          {toast && (
            <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastAnim, transform: [{ scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { rotate: '-4deg' }] }]}>
              <BubbleText size={40} color={toastStyle[0]} edge={toastStyle[1]}>{toast.text}</BubbleText>
            </Animated.View>
          )}
          {pop && (
            <Animated.View pointerEvents="none" key={pop.id} style={{ position: 'absolute', left: 0, right: 0, top: pop.y, alignItems: 'center', opacity: popAnim.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: popAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -46] }) }, { scale: popAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.25, 1] }) }] }}>
              <BubbleText size={30} color="#fff2b0" edge="#a05a08">{pop.text}</BubbleText>
            </Animated.View>
          )}
        </Animated.View>

        {/* hand: three slots, pieces drop in from the top */}
        <View style={{ width: boardPx, height: slotH, flexDirection: 'row', marginTop: 22 }}>
          {[0, 1, 2].map((i) => {
            const p = g.tray[i];
            return (
              <View key={i} style={styles.slot} {...responders[i].panHandlers}>
                {p && (
                  <DropIn key={p.id} delay={i * 110}>
                    <View style={{ opacity: g.dragIdx === i ? 0 : 1 }}>
                      <PieceView piece={p} size={pieceBoxSize(p)} />
                    </View>
                  </DropIn>
                )}
              </View>
            );
          })}
        </View>

        {guideOn && (
          <View style={{ marginTop: 14 }}><Ribbon width={boardPx} text="Drag the block into the glowing gap to clear the line!" /></View>
        )}

        {/* dragged piece (moved by Animated value, no re-render per touch move) */}
        {dragPiece && (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, transform: dragPos.getTranslateTransform() }}>
            <PieceView piece={dragPiece} size={cell} />
          </Animated.View>
        )}

        {paused && g.status === 'playing' && (
          <Overlay title="Paused">
            <Button label="Resume" onPress={() => setPaused(false)} color={theme.good} />
            <Button label="Restart" onPress={restart} color={theme.orange} style={{ marginTop: 12 }} />
            <Button label="Quit" onPress={onExit} color={theme.bad} style={{ marginTop: 12 }} />
          </Overlay>
        )}
        {g.status === 'won' && (
          <Overlay title={mode.kind === 'level' ? `Level ${mode.level.id} Complete!` : 'Great!'}>
            <View style={{ alignItems: 'center', marginTop: -6, marginBottom: 6 }}><Mascot size={84} cheer /></View>
            <Text style={styles.stars}>{'★'.repeat(g.stars)}<Text style={{ color: '#3a4a94' }}>{'★'.repeat(3 - g.stars)}</Text></Text>
            <BubbleText size={48} color={theme.gold} edge="#8a5a08" style={{ alignSelf: 'center' }}>{String(g.score)}</BubbleText>
            <View style={{ height: 18 }} />
            {onNext ? <Button label={`Level ${mode.kind === 'level' ? mode.level.id + 1 : ''}  ›`} onPress={onNext} color={theme.good} /> : <Text style={styles.newBest}>More levels coming soon!</Text>}
            <Button label="Replay" onPress={restart} color={theme.orange} style={{ marginTop: 12 }} />
            <Button label="Home" onPress={onExit} color={theme.blue} style={{ marginTop: 12 }} />
          </Overlay>
        )}
        {g.status === 'lost' && (
          <Overlay title={mode.kind === 'classic' ? 'Game Over' : 'Out of Moves'}>
            <BubbleText size={52} color={theme.gold} edge="#8a5a08" style={{ alignSelf: 'center' }}>{String(g.score)}</BubbleText>
            <Text style={styles.newBest}>{mode.kind === 'classic' && g.score >= best && g.score > 0 ? 'New best!' : ' '}</Text>
            <Button label="Try Again" onPress={restart} color={theme.good} />
            <Button label="Menu" onPress={onExit} color={theme.blue} style={{ marginTop: 12 }} />
          </Overlay>
        )}
      </View>
    </Backdrop>
  );
}

function Overlay({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View style={{ alignItems: 'center', marginBottom: 14 }}><BubbleText size={30} edge="#12296e">{title}</BubbleText></View>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 },
  iconBtn: { width: 46, height: 46, borderRadius: 15, backgroundColor: theme.panelEdge, borderBottomWidth: 4, borderBottomColor: '#0a1647', alignItems: 'center', justifyContent: 'center' },
  bar: { width: 6, height: 20, borderRadius: 3, backgroundColor: '#fff' },
  bestPill: { minWidth: 70, height: 38, borderRadius: 19, backgroundColor: theme.panelEdge, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  bestTxt: { color: theme.gold, fontWeight: '900', fontSize: 15, marginLeft: 4 },
  goalBar: { height: 28, borderRadius: 14, backgroundColor: theme.panelEdge, overflow: 'hidden', justifyContent: 'center', borderWidth: 2, borderColor: '#0a1647' },
  goalFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: theme.orange, borderRadius: 14, overflow: 'hidden' },
  goalTxt: { textAlign: 'center', color: '#fff', fontWeight: '900', fontSize: 13, textShadowColor: '#0a1647', textShadowRadius: 3 },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', top: '38%' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,12,48,0.82)', alignItems: 'center', justifyContent: 'center' },
  card: { width: 300, borderRadius: 28, backgroundColor: theme.boardFrameDark, paddingBottom: 6 },
  cardInner: { borderRadius: 28, backgroundColor: theme.panel, padding: 22, borderWidth: 3, borderColor: '#6fa8ff' },
  stars: { fontSize: 46, color: theme.gold, textAlign: 'center', marginBottom: 4 },
  newBest: { color: theme.gold, fontWeight: '900', fontSize: 16, textAlign: 'center', marginBottom: 14 },
});
