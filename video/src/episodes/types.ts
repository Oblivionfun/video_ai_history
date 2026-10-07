import type {LngLat} from '../lib/geo';

export type Kind = 'major' | 'minor' | 'event' | 'via';

export interface Pt {
  id?: string;
  name?: string;
  modern?: string;
  ll: LngLat;
  kind?: Kind;
  side?: 'l' | 'r';
}

/** A story element (novel, poem, legend) pinned to the real place it comes from. */
export interface StoryPin {
  id: string;
  ll: LngLat;
  novel: string;
  real: string;
  side: 'l' | 'r';
  /** label side and vertical nudge (px) for crowded overview maps */
  epiSide?: 'l' | 'r';
  dy?: number;
}

export interface AreaLabel {
  id: string;
  text: string;
  sub?: string;
  ll: LngLat;
  kind: 'mountain' | 'desert' | 'water' | 'river' | 'region';
}

/**
 * Everything the map engine needs to know about one episode's journey.
 * Legs are drawn in LEG_ORDER and consecutive legs share their joining point (a leg's first point
 * repeats the previous leg's last point; give it its own id and it becomes an alias of that node).
 */
export interface RouteData {
  LEGS: Record<string, Pt[]>;
  LEG_ORDER: string[];
  /** 'return' legs are drawn in cinnabar with a small offset; everything else in gold */
  LEG_STYLE?: Record<string, 'out' | 'return'>;
  STORY_PINS: StoryPin[];
  AREA_LABELS: AreaLabel[];
  /** extra named map anchors, addressable as `x:<id>` */
  EXTRA?: Record<string, LngLat>;
}
