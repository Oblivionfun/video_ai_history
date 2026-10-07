"""Extract the rivers along Xuanzang's route from Natural Earth 10m into a small GeoJSON."""

import json
from pathlib import Path

import shapefile

ROOT = Path(__file__).resolve().parent.parent
KEEP = {"Ganges", "Indus", "Amu Darya", "Panj", "Syr Darya", "Naryn", "Tarim", "Yarkant", "Huang",
        "Yamuna", "Sutlej", "Chenab", "Jhelum", "Godävari", "Krishna", "Narmada", "Konqi", "Mahäna Nadï"}
BBOX = (52, 4, 126, 52)


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5 or 1e-12
    dmax, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        x0, y0 = pts[i]
        d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


def main():
    r = shapefile.Reader(str(ROOT / "data/ne/ne_10m_rivers_lake_centerlines.shp"))
    feats = []
    for sr in r.iterShapeRecords():
        rec = sr.record.as_dict()
        if rec["name"] not in KEEP:
            continue
        b = sr.shape.bbox
        if b[2] < BBOX[0] or b[0] > BBOX[2] or b[3] < BBOX[1] or b[1] > BBOX[3]:
            continue
        parts = list(sr.shape.parts) + [len(sr.shape.points)]
        for a, z in zip(parts[:-1], parts[1:]):
            pts = [(round(x, 4), round(y, 4)) for x, y in sr.shape.points[a:z]]
            pts = rdp(pts, 0.012)
            if len(pts) >= 2:
                feats.append({"type": "Feature", "properties": {"name": rec["name"], "rank": rec["scalerank"]},
                              "geometry": {"type": "LineString", "coordinates": pts}})
    out = ROOT / "video/src/data/rivers.json"
    out.write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
    print(f"{len(feats)} river parts, {out.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
