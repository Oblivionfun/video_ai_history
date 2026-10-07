"""Download map tiles into video/public/tiles (already-downloaded tiles are skipped).

Imagery : NASA Blue Marble (shaded relief + bathymetry) via NASA GIBS WMTS, public domain.
Terrain : Tilezen/Mapzen Terrain Tiles (terrarium encoding) on AWS Open Data.

    python scripts/fetch_tiles.py                       # the default REGIONS below (ep01 coverage)
    python scripts/fetch_tiles.py --bbox 118,24,142,40  # add a region at z5–8 (e.g. Japan for 鉴真)
    python scripts/fetch_tiles.py --bbox 30,-12,80,30 --zooms 5-8 img   # one layer only

Current coverage: z0–4 world; z5–6 lon 20..160, lat -12..62; z7–8 lon 52..126, lat 4..52.
Imagery stops at z8 (~500 m/px); MapLibre upsamples deeper zooms from the z8 tiles.
"""

import asyncio
import math
import sys
from pathlib import Path

import aiohttp

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "video" / "public" / "tiles"

LAYERS = {
    "img": ("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/"
            "BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg", "jpg"),
    "dem": ("https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", "png"),
}

# (zoom range, lon_min, lat_min, lon_max, lat_max)
REGIONS = [
    (range(0, 5), -180, -85, 180, 85),
    (range(5, 7), 20, -12, 160, 62),
    (range(7, 9), 52, 4, 126, 52),
]


def lon2x(lon, z):
    return int(math.floor((lon + 180.0) / 360.0 * (1 << z)))


def lat2y(lat, z):
    r = math.radians(lat)
    return int(math.floor((1.0 - math.log(math.tan(r) + 1.0 / math.cos(r)) / math.pi) / 2.0 * (1 << z)))


def tiles():
    seen = set()
    for zr, w, s, e, n in REGIONS:
        for z in zr:
            n_t = 1 << z
            x0, x1 = max(0, lon2x(w, z)), min(n_t - 1, lon2x(e, z))
            y0, y1 = max(0, lat2y(n, z)), min(n_t - 1, lat2y(s, z))
            for x in range(x0, x1 + 1):
                for y in range(y0, y1 + 1):
                    if (z, x, y) not in seen:
                        seen.add((z, x, y))
                        yield z, x, y


async def fetch(session, sem, layer, z, x, y, stats):
    url_t, ext = LAYERS[layer]
    dst = OUT / layer / str(z) / str(x) / f"{y}.{ext}"
    if dst.exists() and dst.stat().st_size > 0:
        stats["skip"] += 1
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    url = url_t.format(z=z, x=x, y=y)
    async with sem:
        for attempt in range(5):
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as r:
                    if r.status == 200:
                        dst.write_bytes(await r.read())
                        stats["ok"] += 1
                        return
                    if r.status in (400, 404):
                        stats["missing"] += 1
                        return
            except Exception:
                pass
            await asyncio.sleep(1.0 + attempt)
        stats["fail"] += 1


async def main(layers):
    todo = list(tiles())
    print(f"{len(todo)} tiles per layer", flush=True)
    for layer in layers:
        stats = {"ok": 0, "skip": 0, "missing": 0, "fail": 0}
        sem = asyncio.Semaphore(32)
        conn = aiohttp.TCPConnector(limit=48)
        async with aiohttp.ClientSession(connector=conn, headers={"User-Agent": "xuanzang-film/1.0"}) as session:
            jobs = [fetch(session, sem, layer, z, x, y, stats) for z, x, y in todo]
            done = 0
            for fut in asyncio.as_completed(jobs):
                await fut
                done += 1
                if done % 250 == 0:
                    print(f"[{layer}] {done}/{len(todo)} {stats}", flush=True)
        print(f"[{layer}] finished {stats}", flush=True)


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--bbox" in args:
        w, s, e, n = (float(v) for v in args[args.index("--bbox") + 1].split(","))
        z0, z1 = (int(v) for v in (args[args.index("--zooms") + 1] if "--zooms" in args else "5-8").split("-"))
        REGIONS[:] = [(range(z0, z1 + 1), w, s, e, n)]
        args = [a for i, a in enumerate(args) if a not in ("--bbox", "--zooms") and (i == 0 or args[i - 1] not in ("--bbox", "--zooms"))]
    asyncio.run(main(args or ["img", "dem"]))
