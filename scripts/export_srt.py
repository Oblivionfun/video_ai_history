"""Write a timeline's subtitle chunks as .srt, timed like the burned-in subtitles.

    python scripts/export_srt.py <x.timeline.json> <out.srt> [subs|subsP]
"""

import json
import sys
from pathlib import Path


def stamp(t):
    ms = max(0, round(t * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def export(timeline, out, key="subs"):
    subs = json.loads(Path(timeline).read_text())[key]
    blocks = []
    for i, s in enumerate(subs):
        start, end = s["start"] - 0.05, s["end"] + 0.12
        if i + 1 < len(subs):
            end = min(end, subs[i + 1]["start"] - 0.051)
        text = " ".join("".join(g["text"] for g in s["segs"]).split())
        blocks.append(f"{i + 1}\n{stamp(start)} --> {stamp(end)}\n{text}\n")
    Path(out).write_text("\n".join(blocks), encoding="utf-8")
    return len(blocks)


if __name__ == "__main__":
    n = export(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "subs")
    print(f"{n} cues -> {sys.argv[2]}")
