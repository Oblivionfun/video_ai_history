import type {CutJson, CutTimeline} from './spec';

declare const require: {
  context(dir: string, deep: boolean, re: RegExp): {keys(): string[]; (id: string): unknown};
};

const cutCtx = require.context('../cuts', true, /\.cut\.json$/);
const tlCtx = require.context('../cuts', true, /\.timeline\.json$/);
const epCtx = require.context('../cuts', true, /episode\.json$/);

export interface CutEntry {
  key: string;
  json: CutJson;
  timeline: CutTimeline;
}

export interface Identity {
  film: string;
  seal: string;
  tagline: string;
  cover_tag: string;
}

export interface NextUp {
  kicker: string;
  title: string;
  sub: string;
  img: string;
}

interface Episode {
  id: string;
  title: string;
  identity: Identity;
  next: NextUp;
}

/** Every video/src/cuts/<episode>/<id>.cut.json that already has a built timeline. */
export const CUTS: CutEntry[] = cutCtx
  .keys()
  .filter((k) => k.startsWith('./'))
  .map((k) => {
    const tk = k.replace(/\.cut\.json$/, '.timeline.json');
    return {key: k, json: cutCtx(k) as CutJson, timeline: tlCtx.keys().includes(tk) ? (tlCtx(tk) as CutTimeline) : null};
  })
  .filter((c): c is CutEntry => c.timeline !== null);

export const EPISODES: Episode[] = epCtx
  .keys()
  .filter((k) => k.startsWith('./'))
  .map((k) => epCtx(k) as Episode);

export const episodeOf = (episode: string): Episode => {
  const e = EPISODES.find((x) => x.id === episode);
  if (!e?.identity || !e.next) throw new Error(`video/src/cuts/${episode}/episode.json needs "identity" and "next" blocks`);
  return e;
};

export const cutByKey = (key: string) => {
  const c = CUTS.find((x) => x.key === key);
  if (!c) throw new Error(`cut ${key} not found (did you run scripts/timeline.py?)`);
  return c;
};

export const compId = (c: CutEntry, suffix: string) => `${c.json.episode}-${c.json.id}-${suffix}`;
