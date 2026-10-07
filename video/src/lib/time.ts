import tl from '../cuts/ep01/main.timeline.json';

export const FPS = 30;

export interface Seg {
  text: string;
  q: boolean;
}
export interface Sub {
  line: string;
  start: number;
  end: number;
  segs: Seg[];
}
export interface Line {
  id: string;
  chapter: string;
  start: number;
  end: number;
  text: string;
  ct: number[];
}

export const TIMELINE = tl as {duration: number; chapters: {id: string; start: number; end: number}[]; lines: Line[]; subs: Sub[]};

const lines: Record<string, Line> = Object.fromEntries(TIMELINE.lines.map((l) => [l.id, l]));
const chapters: Record<string, {start: number; end: number}> = Object.fromEntries(TIMELINE.chapters.map((c) => [c.id, c]));

export const L = (id: string) => {
  const l = lines[id];
  if (!l) throw new Error(`unknown line ${id}`);
  return l;
};

export const C = (id: string) => {
  const c = chapters[id];
  if (!c) throw new Error(`unknown chapter ${id}`);
  return c;
};

/** Absolute time at which `phrase` starts being spoken within line `id`. */
export const at = (id: string, phrase: string, offset = 0) => {
  const l = L(id);
  const k = l.text.indexOf(phrase);
  if (k < 0) throw new Error(`phrase ${phrase} not in ${id}`);
  return l.start + l.ct[k] + offset;
};

export const DURATION = TIMELINE.duration;
