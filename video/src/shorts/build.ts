import {Cam} from '../director';
import {journeyOf} from '../episodes';
import type {Journey} from '../lib/journey';
import {CutEntry, episodeOf, Identity, NextUp} from './registry';
import {CutCard, makeCamera, makeRoute, makeTime, OPEN_CARDS, Orientation, Overlay, win} from './spec';

export type Timed<T> = T & {t0: number; t1: number; sealT?: number};

export interface BuiltCut {
  entry: CutEntry;
  journey: Journey;
  identity: Identity;
  next: NextUp;
  duration: number;
  T: (a: string) => number;
  cam: (t: number, o: Orientation) => Cam;
  head: (t: number) => number;
  overlays: Timed<Overlay>[];
  cards: Timed<CutCard>[];
  fx: Record<string, (t: number) => number>;
  endT: number;
  /** 0..1, how much a card covers the screen at t */
  busy: (t: number) => number;
  plate: (t: number) => number;
}

const cache = new Map<string, BuiltCut>();

export function buildCut(entry: CutEntry): BuiltCut {
  const hit = cache.get(entry.key);
  if (hit) return hit;
  const j = entry.json;
  const journey = journeyOf(j.episode);
  const {T, duration} = makeTime(entry.timeline);
  const camAt = makeCamera(j.camera, T);
  const cards = (j.cards ?? []).map((c) => ({
    ...c,
    t0: T(c.from),
    t1: T(c.to),
    ...(c.type === 'scroll' ? {sealT: T(c.seals)} : {}),
    // the main film's ImageCard reads loss.t
    ...(c.type === 'image' && c.loss ? {loss: {...c.loss, t: T(c.loss.at)}} : {}),
  }));
  const busy = (t: number) => {
    let v = 0;
    for (const c of cards) if (c.type !== 'plate' && !OPEN_CARDS.includes(c.type)) v = Math.max(v, win(t, c.t0 - 0.2, c.t1 + 0.2, 0.6, 0.6));
    return v;
  };
  const plate = (t: number) => {
    let v = 0;
    for (const c of cards) if (c.type === 'plate') v = Math.max(v, win(t, c.t0, c.t1, 1.2, 0.8));
    return v;
  };
  const cam = (t: number, o: Orientation): Cam => {
    const c = camAt(t, o);
    return o === 'portrait' ? {...c, padR: 0, padT: 360, padB: 560} : {...c, padR: 560 * busy(t)};
  };
  const fx: Record<string, (t: number) => number> = {};
  for (const [k, ws] of Object.entries(j.fx ?? {})) {
    const spans = (ws ?? []).map(([a, b]) => [T(a), T(b)] as const);
    fx[k] = (t: number) => Math.max(0, ...spans.map(([a, b]) => win(t, a, b, 1.0, 1.0)));
  }
  const built: BuiltCut = {
    entry,
    journey,
    identity: episodeOf(j.episode).identity,
    next: episodeOf(j.episode).next,
    duration,
    T,
    cam,
    head: makeRoute(j.route, T, journey),
    overlays: (j.overlays ?? []).map((o) => ({...o, t0: T(o.from), t1: T(o.to)})),
    cards,
    fx,
    endT: j.end ? T(j.end.from) : duration - 4,
    busy,
    plate,
  };
  cache.set(entry.key, built);
  return built;
}
