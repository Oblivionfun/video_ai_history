import maplibregl from 'maplibre-gl';
import {staticFile} from 'remotion';

// Must mirror REGIONS in scripts/fetch_tiles.py.
const REGIONS: [number, number, number, number, number, number][] = [
  [0, 4, -180, -85, 180, 85],
  [5, 6, 20, -12, 160, 62],
  [7, 8, 52, 4, 126, 52],
];

const lon2x = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

function available(z: number, x: number, y: number) {
  for (const [z0, z1, w, s, e, n] of REGIONS) {
    if (z < z0 || z > z1) continue;
    const nt = 2 ** z - 1;
    const x0 = Math.max(0, lon2x(w, z)), x1 = Math.min(nt, lon2x(e, z));
    const y0 = Math.max(0, lat2y(n, z)), y1 = Math.min(nt, lat2y(s, z));
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }
  return false;
}

let registered = false;

/**
 * `xz://img/z/x/y` and `xz://dem/z/x/y`: serve local tiles, and synthesise any tile outside the
 * downloaded pyramid from its nearest ancestor so MapLibre never sees a hole.
 */
export function registerTileProtocol() {
  if (registered) return;
  registered = true;
  const base = `${window.location.origin}${staticFile('tiles')}`;
  maplibregl.addProtocol('xz', async (params, abort) => {
    const m = /^xz:\/\/(img|dem)\/(\d+)\/(\d+)\/(\d+)/.exec(params.url);
    if (!m) throw new Error(`bad tile url ${params.url}`);
    const layer = m[1];
    const z = Number(m[2]), x = Number(m[3]), y = Number(m[4]);
    const ext = layer === 'img' ? 'jpg' : 'png';
    for (let dz = 0; dz <= z; dz++) {
      const pz = z - dz, px = x >> dz, py = y >> dz;
      if (!available(pz, px, py)) continue;
      const res = await fetch(`${base}/${layer}/${pz}/${px}/${py}.${ext}`, {signal: abort.signal});
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      if (dz === 0) return {data: buf};
      const bmp = await createImageBitmap(new Blob([buf]));
      const span = 256 / 2 ** dz;
      const cv = new OffscreenCanvas(256, 256);
      const ctx = cv.getContext('2d')!;
      // Terrarium encodes height across channels, so DEM must never be interpolated.
      ctx.imageSmoothingEnabled = layer === 'img';
      ctx.drawImage(bmp, (x - (px << dz)) * span, (y - (py << dz)) * span, span, span, 0, 0, 256, 256);
      const blob = await cv.convertToBlob(layer === 'img' ? {type: 'image/jpeg', quality: 0.92} : {type: 'image/png'});
      return {data: await blob.arrayBuffer()};
    }
    throw new Error(`no tile for ${params.url}`);
  });
}
