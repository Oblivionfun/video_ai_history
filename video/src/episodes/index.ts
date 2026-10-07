import {J01, Journey} from '../lib/journey';

/**
 * Route registry: the cut JSON's "episode" picks the journey drawn on the map.
 * New episode: write video/src/episodes/<ep>/route.ts exporting a RouteData (copy data/route.ts as the
 * template), then add `<ep>: makeJourney(ROUTE_<EP>)` below.
 */
export const JOURNEYS: Record<string, Journey> = {
  ep01: J01,
};

export const journeyOf = (episode: string): Journey => {
  const j = JOURNEYS[episode];
  if (!j) throw new Error(`no route registered for ${episode} in video/src/episodes/index.ts`);
  return j;
};
