export type LngLat = [number, number];
export type XY = [number, number];

export const merc = ([lng, lat]: LngLat): XY => {
  const s = Math.sin((lat * Math.PI) / 180);
  return [(lng + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)];
};

export const unmerc = ([x, y]: XY): LngLat => [
  x * 360 - 180,
  ((2 * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - Math.PI / 2) * 180) / Math.PI,
];

const dist = (a: XY, b: XY) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Centripetal Catmull-Rom through `pts`, sampled roughly every `step` (mercator units). */
export function catmullRom(pts: XY[], step: number): {path: XY[]; ctrlIndex: number[]} {
  const out: XY[] = [];
  const ctrlIndex: number[] = [];
  const n = pts.length;
  const get = (i: number): XY => {
    if (i < 0) return [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]];
    if (i >= n) return [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]];
    return pts[i];
  };
  for (let i = 0; i < n - 1; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const t0 = 0;
    const t1 = t0 + Math.sqrt(dist(p0, p1) || 1e-9);
    const t2 = t1 + Math.sqrt(dist(p1, p2) || 1e-9);
    const t3 = t2 + Math.sqrt(dist(p2, p3) || 1e-9);
    const k = Math.max(3, Math.ceil(dist(p1, p2) / step));
    ctrlIndex.push(out.length);
    for (let j = 0; j < k; j++) {
      const t = t1 + ((t2 - t1) * j) / k;
      const lerp = (a: XY, b: XY, ta: number, tb: number): XY => {
        const u = (t - ta) / (tb - ta || 1e-9);
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      };
      const a1 = lerp(p0, p1, t0, t1), a2 = lerp(p1, p2, t1, t2), a3 = lerp(p2, p3, t2, t3);
      const b1 = lerp(a1, a2, t0, t2), b2 = lerp(a2, a3, t1, t3);
      out.push(lerp(b1, b2, t1, t2));
    }
  }
  ctrlIndex.push(out.length);
  out.push(pts[n - 1]);
  return {path: out, ctrlIndex};
}

export function cumulative(path: XY[]): number[] {
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + dist(path[i - 1], path[i]));
  return cum;
}

export function pointAt(path: XY[], cum: number[], s: number): XY {
  if (s <= 0) return path[0];
  const total = cum[cum.length - 1];
  if (s >= total) return path[path.length - 1];
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const u = (s - cum[lo]) / (cum[hi] - cum[lo] || 1e-12);
  return [path[lo][0] + (path[hi][0] - path[lo][0]) * u, path[lo][1] + (path[hi][1] - path[lo][1]) * u];
}

/** Great-circle distance in km. */
export function haversine(a: LngLat, b: LngLat): number {
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
