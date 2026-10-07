import {LngLat, merc, unmerc} from './lib/geo';
import {clamp, easeInOutSine, easeOutCubic, monotone} from './lib/interp';
import {NAMED_NODES, NODES, S, TOTAL} from './lib/journey';
import {at, C, L} from './lib/time';

/* ------------------------------------------------------------------ cold open */

interface Shot {
  t0: number;
  t1: number;
  pin: string;
  from: [number, number, number, number, number];
  to: [number, number, number, number, number];
}

/** Four hard cuts, one per place named in k1: [lng, lat, zoom, pitch, bearing]. */
export const COLD_SHOTS: Shot[] = (() => {
  const c = (w: string) => at('k1', w, -0.06);
  return [
    // stay at or below ~zoom 8.4: the imagery tops out at z8, deeper close-ups go soft
    {t0: 0, t1: c('流沙河'), pin: 'p_huoyan', from: [89.92, 42.6, 8.1, 54, 2], to: [90.0, 42.67, 8.4, 57, 10]},
    {t0: c('流沙河'), t1: c('女儿国'), pin: 'p_mohe', from: [94.98, 41.5, 7.4, 62, -46], to: [94.82, 41.6, 7.7, 65, -38]},
    {t0: c('女儿国'), t1: c('通天河'), pin: 'p_gaochang', from: [89.3, 42.5, 7.45, 48, -36], to: [89.42, 42.6, 7.7, 52, -27]},
    {t0: c('通天河'), t1: L('k2').start + 0.05, pin: 'p_indus', from: [72.58, 33.88, 7.4, 58, 28], to: [72.42, 33.98, 7.75, 61, 36]},
  ];
})();

export const COLD = {
  wide: at('k2', '真实的地图', 0.4),
  rewind: [L('k3').start + 0.3, at('k3', '真的有一个人', -0.15)] as const,
  redraw: [at('k3', '真的有一个人'), L('k3').end - 0.15] as const,
  retract: [L('k3').end + 0.35, C('pro').start + 0.7] as const,
  end: C('pro').start + 1.0,
};

function coldHead(t: number): number {
  const ramp = (a: number, b: number) => easeInOutSine(clamp((t - a) / (b - a)));
  if (t < COLD.rewind[0]) return TOTAL;
  if (t < COLD.redraw[0]) return TOTAL * (1 - ramp(...COLD.rewind));
  if (t < COLD.retract[0]) return TOTAL * ramp(...COLD.redraw);
  return TOTAL * (1 - ramp(...COLD.retract));
}

/* ------------------------------------------------------------------ route head */

interface Move {
  from: string;
  to: string;
  t0: number;
  t1: number;
}

export const MOVES: Move[] = [
  {from: 'changan', to: 'guazhou', t0: C('changan').end - 0.7, t1: at('c2a', '来到瓜州', 0.6)},
  {from: 'guazhou', to: 'yumen', t0: at('c2b', '带他偷渡', -0.2), t1: at('c2b', '绕过玉门关', 1.0)},
  {from: 'yumen', to: 'mohe', t0: C('mohe').start + 0.8, t1: L('c3b').end - 0.4},
  {from: 'mohe', to: 'yiwu', t0: at('c3c', '喝令他继续前行', -0.3), t1: L('c3d').start + 3.0},
  {from: 'yiwu', to: 'gaochang', t0: C('gaochang').start + 0.3, t1: at('c4a', '便是高昌', 0.6)},
  {from: 'gaochang', to: 'lingshan', t0: C('lingshan').start + 0.2, t1: at('c5a', '翻越凌山', 1.4)},
  {from: 'lingshan', to: 'suye', t0: L('c5a').end - 1.2, t1: at('c5b', '在素叶城', 1.2)},
  {from: 'suye', to: 'samarkand', t0: C('bamiyan').start + 0.2, t1: at('c6a', '撒马尔罕', 0.8)},
  {from: 'samarkand', to: 'fanyanna', t0: at('c6a', '撒马尔罕', 0.8), t1: at('c6b', '在梵衍那', 0.8)},
  {from: 'fanyanna', to: 'ganges', t0: C('ganges').start + 0.2, t1: at('c7a', '在恒河之上', 0.9)},
  {from: 'ganges', to: 'nalanda', t0: C('nalanda').start + 0.2, t1: at('c8a', '那烂陀寺', 0.8)},
  {from: 'nalanda', to: 'nalanda2', t0: C('tour').start + 0.4, t1: C('tour').end - 0.6},
  {from: 'nalanda2', to: 'kannauj2', t0: C('kannauj').start + 0.2, t1: at('c10a', '曲女城', 1.0)},
  {from: 'kannauj2', to: 'indus', t0: at('c11a', '踏上归途', -0.6), t1: at('c11b', '渡信度河时', 1.2)},
  {from: 'indus', to: 'khotan', t0: C('pamir').start + 0.2, t1: at('c12b', '在于阗', 0.8)},
  {from: 'khotan', to: 'dunhuang', t0: L('c12c').start - 0.2, t1: at('c12c', '回到敦煌', 1.0)},
  {from: 'dunhuang', to: 'changan2', t0: C('return').start + 0.2, t1: at('c13a', '玄奘回到长安', 1.0)},
];

export function headS(t: number): number {
  if (t < COLD.end) return coldHead(t);
  let s = 0;
  for (const m of MOVES) {
    if (t < m.t0) break;
    const a = S(m.from), b = S(m.to);
    s = t >= m.t1 ? b : a + (b - a) * easeInOutSine((t - m.t0) / (m.t1 - m.t0));
  }
  return s;
}

/** Whether the head is currently travelling (used for motion trails and sound cues). */
export function moving(t: number): number {
  for (const m of MOVES) {
    if (t >= m.t0 && t <= m.t1) return Math.sin(Math.PI * ((t - m.t0) / (m.t1 - m.t0)));
  }
  return 0;
}

/** Time the head first reaches arc-length `s` (Infinity if never). */
export function reachTime(s: number): number {
  if (s <= 0) return 0;
  for (const m of MOVES) {
    const a = S(m.from), b = S(m.to);
    if (s >= Math.min(a, b) - 1e-9 && s <= Math.max(a, b) + 1e-9 && b !== a) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (a + (b - a) * easeInOutSine(mid) < s) lo = mid;
        else hi = mid;
      }
      return m.t0 + (m.t1 - m.t0) * hi;
    }
  }
  return Infinity;
}

export const REACH: Record<string, number> = Object.fromEntries(NAMED_NODES.map((n) => [n.id, reachTime(n.s)]));
REACH.changan = 0;

/* ------------------------------------------------------------------ camera */

export interface Cam {
  center: LngLat;
  zoom: number;
  pitch: number;
  bearing: number;
  padR: number;
  padL?: number;
  padT?: number;
  padB?: number;
}

type K = [number, number, number, number, number, number, number?];

const K_: K[] = [
  // cold open: last cut → the whole route → back out to the globe
  [COLD_SHOTS[3].t1, 72.42, 33.98, 7.75, 61, 36],
  [COLD.wide, 87.6, 31.0, 4.45, 26, 0],
  [L('k3').start + 0.3, 88.0, 30.7, 4.35, 23, 0],
  [COLD.redraw[1] + 0.25, 88.2, 30.4, 4.25, 20, 0],
  // prologue: globe → Chang'an
  [C('pro').start + 0.9, 70, 24, 1.3, 0, 0],
  [L('pro2').start, 81, 28, 1.55, 0, 0],
  [L('pro3').end, 91, 31, 1.8, 0, 0],
  [L('pro4').start, 98, 33, 2.15, 8, 0],
  [L('pro4').end, 107.6, 34.5, 5.5, 38, -10],
  [C('changan').start + 2.6, 108.6, 34.45, 6.6, 52, -18, 540],
  // 壹 长安
  [L('c1b').start, 108.7, 34.4, 6.75, 55, -14, 560],
  [L('c1c').end, 108.6, 34.45, 6.9, 57, -6, 560],
  // 贰 瓜州
  [C('guazhou').start + 2.4, 102.6, 37.5, 5.7, 46, -36, 0],
  [at('c2a', '来到瓜州', 0.8), 96.7, 40.3, 6.6, 55, -32, 420],
  [L('c2b').start, 96.45, 40.4, 6.9, 58, -26, 560],
  [at('c2b', '绕过玉门关', 1.2), 96.2, 40.5, 7.0, 60, -22, 560],
  [L('c2d').start, 96.15, 40.3, 7.1, 58, -12, 560],
  [C('guazhou').end - 0.6, 95.8, 40.7, 6.95, 60, -30, 420],
  // 叁 莫贺延碛
  [L('c3a').start, 95.3, 41.15, 7.1, 66, -40, 380],
  [L('c3b').end, 94.9, 41.55, 7.3, 68, -46, 380],
  [L('c3c').end, 94.65, 41.75, 7.35, 66, -40, 420],
  [L('c3d').start + 3.4, 93.95, 42.4, 7.0, 60, -30, 420],
  [C('mohe').end - 0.4, 92.6, 42.7, 6.8, 58, -22, 300],
  // 肆 高昌
  [at('c4a', '便是高昌', 0.9), 89.8, 42.85, 7.3, 58, -12, 560],
  [L('c4c').start, 89.7, 42.82, 7.45, 60, -4, 560],
  [L('c4c').end, 89.75, 42.85, 7.6, 60, 4, 520],
  [at('c4d', '火焰山', 0.4), 89.97, 42.86, 8.85, 72, 16, 0],
  [at('c4d', '夏季', 1.6), 90.15, 42.9, 9.15, 74, 26, 0],
  [C('gaochang').end - 0.3, 89.4, 42.6, 7.2, 60, -24, 0],
  // 伍 凌山
  [C('lingshan').start + 2.8, 84.0, 41.6, 6.0, 55, -58, 0],
  [at('c5a', '翻越凌山', 1.6), 78.65, 41.3, 7.2, 70, -15, 300],
  [L('c5a').end, 78.25, 41.6, 7.35, 72, -4, 360],
  [at('c5b', '在素叶城', 1.4), 75.8, 42.6, 6.9, 58, -12, 480],
  [C('lingshan').end - 0.6, 75.4, 42.7, 7.0, 56, -4, 480],
  // 陆 梵衍那
  [C('bamiyan').start + 3.0, 71.0, 40.8, 5.6, 45, -10, 0],
  [at('c6a', '兴都库什山', 0.2), 68.3, 37.2, 5.9, 50, 4, 0],
  [at('c6b', '在梵衍那', 1.0), 67.95, 34.95, 7.0, 62, 18, 560],
  [C('bamiyan').end - 0.5, 68.05, 34.9, 7.2, 64, 30, 560],
  // 柒 恒河
  [C('ganges').start + 2.2, 74.0, 31.5, 5.4, 45, 0, 0],
  [at('c7a', '在恒河之上', 1.1), 80.5, 26.4, 7.0, 50, 8, 520],
  [L('c7c').start, 80.6, 26.35, 7.15, 54, 12, 520],
  [C('ganges').end - 0.5, 81.8, 26.0, 6.8, 50, 0, 380],
  // 捌 那烂陀
  [C('nalanda').start + 2.0, 83.5, 26.1, 6.3, 45, -6, 200],
  [at('c8a', '那烂陀寺', 1.0), 85.3, 25.2, 7.4, 55, -10, 560],
  [L('c8b').end, 85.4, 25.15, 7.6, 58, -4, 560],
  [at('c8c', '灵鹫山', 0.6), 85.45, 25.03, 8.8, 66, 8, 0],
  [C('nalanda').end - 0.4, 85.0, 24.2, 6.2, 42, 0, 0],
  // 玖 五印度
  [C('tour').start + 2.0, 81.0, 20.5, 4.75, 30, 0, 0],
  [C('tour').start + 6.5, 78.6, 17.8, 4.65, 28, 0, 0],
  [C('tour').end - 0.3, 80.0, 22.5, 4.85, 30, 0, 0],
  // 拾 曲女城
  [C('kannauj').start + 2.6, 82.2, 26.3, 6.2, 45, -12, 200],
  [at('c10a', '曲女城', 1.2), 80.0, 27.0, 7.2, 54, -16, 560],
  [C('kannauj').end - 0.5, 79.95, 27.05, 7.45, 58, -4, 560],
  // 拾壹 信度河
  [at('c11a', '踏上归途', 1.6), 76.8, 30.0, 5.7, 48, 10, 0],
  [at('c11b', '渡信度河时', 1.4), 72.6, 33.9, 7.2, 58, 24, 520],
  [C('indus').end - 0.5, 72.5, 34.0, 7.4, 60, 34, 520],
  // 拾贰 葱岭
  [C('pamir').start + 2.6, 70.4, 36.2, 6.5, 64, 44, 0],
  [at('c12a', '寒风凄劲', 0), 72.6, 37.0, 7.0, 72, 58, 0],
  [at('c12a', '春夏飞雪', 0.6), 74.4, 37.6, 7.05, 73, 66, 0],
  [at('c12b', '在于阗', 1.0), 79.4, 37.3, 6.6, 58, 70, 480],
  [L('c12b').end, 80.0, 37.2, 6.8, 58, 74, 480],
  [at('c12c', '大流沙', 0), 86.5, 38.6, 6.0, 52, 78, 0],
  [C('pamir').end - 0.4, 94.0, 40.1, 6.7, 55, 70, 300],
  // 拾叁 长安
  [C('return').start + 3.2, 101.5, 37.8, 5.6, 45, 40, 0],
  [at('c13a', '玄奘回到长安', 1.2), 108.8, 34.35, 7.0, 55, -10, 560],
  [L('c13b').end, 108.9, 34.3, 7.2, 58, -2, 560],
  [C('return').end - 0.4, 104.0, 33.0, 5.2, 40, -6, 0],
  // 尾声
  [C('epi').start + 3.0, 88.0, 30.0, 4.35, 28, 0, 0],
  [L('e2').end, 88.5, 30.5, 4.45, 24, 0, 0],
  [C('epi').end, 88.5, 30.5, 4.5, 22, 0, 0],
];

const KEYS = [...K_].sort((a, b) => a[0] - b[0]);
const ts = KEYS.map((k) => k[0]);
const mx = KEYS.map((k) => merc([k[1], k[2]]));
const unwrap = (() => {
  const out: number[] = [];
  KEYS.forEach((k, i) => {
    let b = k[5];
    if (i > 0) {
      const prev = out[i - 1];
      while (b - prev > 180) b -= 360;
      while (b - prev < -180) b += 360;
    }
    out.push(b);
  });
  return out;
})();

const fx = monotone(ts, mx.map((m) => m[0]));
const fy = monotone(ts, mx.map((m) => m[1]));
const fz = monotone(ts, KEYS.map((k) => k[3]));
const fp = monotone(ts, KEYS.map((k) => k[4]));
const fb = monotone(ts, unwrap);
const fr = monotone(ts, KEYS.map((k) => k[6] ?? 0));

export function camAt(t: number): Cam {
  const shot = COLD_SHOTS.find((s) => t >= s.t0 && t < s.t1);
  if (shot) {
    const u = easeOutCubic(clamp((t - shot.t0) / (shot.t1 - shot.t0)));
    const v = shot.from.map((a, i) => a + (shot.to[i] - a) * u);
    return {center: [v[0], v[1]], zoom: v[2], pitch: v[3], bearing: v[4], padR: 0};
  }
  return {
    center: unmerc([fx(t), fy(t)]),
    zoom: fz(t),
    pitch: fp(t),
    bearing: fb(t),
    padR: Math.max(0, fr(t)),
  };
}

export const nodeLL = (id: string): LngLat => NODES[id].ll;
