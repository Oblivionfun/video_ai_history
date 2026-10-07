/**
 * Declarative cuts: one *.cut.json drives narration (scripts/tts.py), timeline (scripts/timeline.py),
 * score (scripts/score.py --cut) and the picture (ShortFilm). See docs/02-cut-json.md for the schema.
 */
import {Cam} from '../director';
import {LngLat, merc, unmerc} from '../lib/geo';
import {clamp, easeInOutSine, monotone} from '../lib/interp';
import type {Journey} from '../lib/journey';
import type {Seg} from '../lib/time';

export type Orientation = 'portrait' | 'landscape';

/** 'start' | 'end' | 'h1' | 'h1:end' | 'h1:短语' | '@chapter' | '@chapter:end', optionally followed by +/-seconds. */
export type Anchor = string;

export interface CamKey {
  at: Anchor;
  ll: LngLat;
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** hard cut: no interpolation from the previous key */
  cut?: boolean;
  /** explicit zoom for 9:16 (default: zoom + PORTRAIT_DZ) */
  pz?: number;
}

export interface RouteKey {
  at: Anchor;
  /** node id from data/route.ts, or 'END' for the whole journey */
  node: string;
}

export type Overlay =
  | {type: 'pin'; pin: string; from: Anchor; to: Anchor; side?: 'l' | 'r'; dy?: number}
  | {type: 'city'; node: string; from: Anchor; to: Anchor; side?: 'l' | 'r'}
  | {type: 'label'; anchor: string; text: string; sub?: string; from: Anchor; to: Anchor; style?: 'fire' | 'area' | 'gold'}
  | {type: 'walker'; from: Anchor; to: Anchor}
  | {type: 'line'; a: string; b: string; label?: string; from: Anchor; to: Anchor};

export type CutCard =
  | {type: 'image'; src: string; kind: 'history' | 'novel' | 'mural'; tag: string; title: string; sub?: string; quote?: string; source?: string; from: Anchor; to: Anchor; fx?: number; loss?: {at: Anchor; text: string}}
  | {type: 'quote'; lines: string[]; source: string; img?: string; from: Anchor; to: Anchor}
  | {type: 'facts'; tag: string; title: string; items?: string[]; quote?: string; source?: string; from: Anchor; to: Anchor}
  | {type: 'plate'; src: string; tag: string; title: string; sub: string; note?: string; from: Anchor; to: Anchor; fx?: number}
  | {type: 'scroll'; seals: Anchor; label?: string; tag?: string; from: Anchor; to: Anchor}
  /** big brush title over the map (main title of a long film) */
  | {type: 'title'; text: string; kicker?: string; sub?: string; dates?: string; seal?: string; from: Anchor; to: Anchor}
  /** chapter opener; afterwards the corner tag shows the current chapter */
  | {type: 'chapter'; num: string; name: string; theme?: string; en?: string; from: Anchor; to: Anchor};

/** cards that sit on the map instead of covering it (no dimming, no camera offset) */
export const OPEN_CARDS: CutCard['type'][] = ['title', 'chapter'];

export interface CutJson {
  id: string;
  episode: string;
  title: string;
  formats: Orientation[];
  chapters: {id: string; lines: {id: string; text: string}[]}[];
  hook: {kicker: string; lines: string[]};
  camera: CamKey[];
  route?: RouteKey[];
  overlays?: Overlay[];
  cards?: CutCard[];
  fx?: Partial<Record<'sand' | 'snow' | 'night' | 'heat', [Anchor, Anchor][]>>;
  end?: {from: Anchor; full?: string};
  cover?: {at: Anchor; lines?: string[]; kicker?: string};
}

export interface CutTimeline {
  duration: number;
  chapters: {id: string; start: number; end: number}[];
  lines: {id: string; chapter: string; start: number; end: number; text: string; ct: number[]}[];
  subs: {line: string; start: number; end: number; segs: Seg[]}[];
  subsP?: {line: string; start: number; end: number; segs: Seg[]}[];
}

export const PORTRAIT_DZ = -0.6;

export function makeTime(tl: CutTimeline) {
  const lines = Object.fromEntries(tl.lines.map((l) => [l.id, l]));
  const chapters = Object.fromEntries(tl.chapters.map((c) => [c.id, c]));
  const T = (a: Anchor): number => {
    const m = /^(.*?)([+-]\d+(?:\.\d+)?)?$/.exec(a.trim())!;
    const base = m[1];
    const off = m[2] ? parseFloat(m[2]) : 0;
    let v: number;
    if (base === 'start') v = 0;
    else if (base === 'end') v = tl.duration;
    else if (base.startsWith('@')) {
      const [id, which] = base.slice(1).split(':');
      const c = chapters[id];
      if (!c) throw new Error(`unknown chapter ${id}`);
      v = which === 'end' ? c.end : c.start;
    } else {
      const [id, phrase] = base.split(':');
      const l = lines[id];
      if (!l) throw new Error(`unknown line ${id} in anchor "${a}"`);
      if (!phrase) v = l.start;
      else if (phrase === 'end') v = l.end;
      else {
        const k = l.text.indexOf(phrase);
        if (k < 0) throw new Error(`phrase "${phrase}" not in ${id}`);
        v = l.start + l.ct[k];
      }
    }
    return v + off;
  };
  return {T, duration: tl.duration};
}

/** Camera as a function of time; separate monotone splines between hard cuts. */
export function makeCamera(keys: CamKey[], T: (a: Anchor) => number) {
  const ks = keys.map((k) => ({...k, t: T(k.at)})).sort((a, b) => a.t - b.t);
  // two keys on the same instant would make the spline divide by zero
  for (let i = 1; i < ks.length; i++) if (!ks[i].cut && ks[i].t <= ks[i - 1].t + 0.05) ks[i].t = ks[i - 1].t + 0.05;
  const segs: (typeof ks)[] = [];
  for (const k of ks) {
    if (!segs.length || k.cut) segs.push([]);
    segs[segs.length - 1].push(k);
  }
  const build = (seg: typeof ks, portrait: boolean) => {
    const ts = seg.map((k) => k.t);
    const mx = seg.map((k) => merc(k.ll));
    let prev = 0;
    const bear = seg.map((k, i) => {
      let b = k.bearing ?? 0;
      if (i > 0) {
        while (b - prev > 180) b -= 360;
        while (b - prev < -180) b += 360;
      }
      prev = b;
      return b;
    });
    const fx = monotone(ts, mx.map((m) => m[0]));
    const fy = monotone(ts, mx.map((m) => m[1]));
    const fz = monotone(ts, seg.map((k) => (portrait ? k.pz ?? k.zoom + PORTRAIT_DZ : k.zoom)));
    const fp = monotone(ts, seg.map((k) => k.pitch ?? 45));
    const fb = monotone(ts, bear);
    return {t0: ts[0], at: (t: number) => ({center: unmerc([fx(t), fy(t)]) as LngLat, zoom: fz(t), pitch: fp(t), bearing: fb(t)})};
  };
  const land = segs.map((s) => build(s, false));
  const port = segs.map((s) => build(s, true));
  return (t: number, o: Orientation): Omit<Cam, 'padR'> => {
    const list = o === 'portrait' ? port : land;
    let s = list[0];
    for (const x of list) if (t >= x.t0) s = x;
    return s.at(t);
  };
}

/** Route head (arc length along the journey) from node keys, eased between keys. */
export function makeRoute(keys: RouteKey[] | undefined, T: (a: Anchor) => number, j: Journey) {
  if (!keys?.length) return () => j.TOTAL;
  const ks = keys.map((k) => ({t: T(k.at), s: k.node === 'END' ? j.TOTAL : j.S(k.node)})).sort((a, b) => a.t - b.t);
  return (t: number) => {
    if (t <= ks[0].t) return ks[0].s;
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (t < b.t) return a.s + (b.s - a.s) * easeInOutSine(clamp((t - a.t) / (b.t - a.t || 1e-9)));
    }
    return ks[ks.length - 1].s;
  };
}

/** Smooth 0..1 window with fades, for [from, to] in seconds. */
export const win = (t: number, a: number, b: number, fin = 0.35, fout = 0.35) => {
  if (t <= a || t >= b) return 0;
  return easeInOutSine(Math.min(clamp((t - a) / fin), clamp((b - t) / fout)));
};
