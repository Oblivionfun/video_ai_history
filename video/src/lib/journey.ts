import {ROUTE} from '../data/route';
import type {Pt, RouteData} from '../episodes/types';
import {catmullRom, cumulative, LngLat, merc, pointAt, unmerc, XY} from './geo';

export interface Node extends Pt {
  id: string;
  s: number;
  leg: string;
}

/** One episode's route turned into a measurable path: arc length, named nodes, leg ranges, map anchors. */
export interface Journey {
  route: RouteData;
  PATH: XY[];
  CUM: number[];
  TOTAL: number;
  NODES: Record<string, Node>;
  NAMED_NODES: Node[];
  LEG_RANGE: Record<string, [number, number]>;
  ANCHORS: Record<string, LngLat>;
  S: (id: string) => number;
  lngLatAt: (s: number) => LngLat;
  legCoords: (leg: string) => LngLat[];
  legStyle: (leg: string) => 'out' | 'return';
}

export function makeJourney(route: RouteData): Journey {
  const ctrl: XY[] = [];
  const meta: {pt: Pt; leg: string}[] = [];
  const legIdx: Record<string, [number, number]> = {};
  const aliases: [string, string][] = [];
  for (const leg of route.LEG_ORDER) {
    const start = Math.max(0, ctrl.length - 1);
    route.LEGS[leg].forEach((pt, i) => {
      if (ctrl.length && i === 0) {
        // legs share their joining point; an id on the repeated point becomes an alias
        const prev = meta[meta.length - 1].pt.id;
        if (pt.id && prev) aliases.push([pt.id, prev]);
        return;
      }
      ctrl.push(merc(pt.ll));
      meta.push({pt, leg});
    });
    legIdx[leg] = [start, ctrl.length - 1];
  }
  const {path, ctrlIndex} = catmullRom(ctrl, 0.00035);
  const CUM = cumulative(path);
  const TOTAL = CUM[CUM.length - 1];
  const NODES: Record<string, Node> = {};
  meta.forEach(({pt, leg}, i) => {
    if (pt.id) NODES[pt.id] = {...pt, id: pt.id, s: CUM[ctrlIndex[i]], leg};
  });
  for (const [alias, of] of aliases) NODES[alias] = {...NODES[of], id: alias};
  const LEG_RANGE: Record<string, [number, number]> = {};
  route.LEG_ORDER.forEach((leg, k) => {
    const [a, b] = legIdx[leg];
    LEG_RANGE[leg] = [k === 0 ? 0 : CUM[ctrlIndex[a]], k === route.LEG_ORDER.length - 1 ? TOTAL : CUM[ctrlIndex[b]]];
  });
  const NAMED_NODES = Object.values(NODES).filter((n) => n.name);
  const ANCHORS: Record<string, LngLat> = {
    ...Object.fromEntries(NAMED_NODES.map((n) => [`n:${n.id}`, n.ll])),
    ...Object.fromEntries(route.STORY_PINS.map((p) => [`p:${p.id}`, p.ll])),
    ...Object.fromEntries(route.AREA_LABELS.map((a) => [`a:${a.id}`, a.ll])),
    ...Object.fromEntries(Object.entries(route.EXTRA ?? {}).map(([k, v]) => [`x:${k}`, v])),
  };
  return {
    route,
    PATH: path,
    CUM,
    TOTAL,
    NODES,
    NAMED_NODES,
    LEG_RANGE,
    ANCHORS,
    S: (id) => {
      const n = NODES[id];
      if (!n) throw new Error(`unknown route node ${id}`);
      return n.s;
    },
    lngLatAt: (s) => unmerc(pointAt(path, CUM, s)),
    legCoords: (leg) => {
      const [a, b] = LEG_RANGE[leg];
      const out: LngLat[] = [];
      for (let i = 0; i < path.length; i++) if (CUM[i] >= a - 1e-12 && CUM[i] <= b + 1e-12) out.push(unmerc(path[i]));
      return out;
    },
    legStyle: (leg) => route.LEG_STYLE?.[leg] ?? 'out',
  };
}

/** ep01 · 玄奘西行 — the long film's code imports these names directly. */
export const J01 = makeJourney(ROUTE);
export const {PATH, CUM, TOTAL, NODES, NAMED_NODES, LEG_RANGE, S, lngLatAt, legCoords} = J01;
