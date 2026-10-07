"""Lay a cut's narration out on an absolute timeline and chunk subtitles.

    python scripts/timeline.py video/src/cuts/ep01/s1-toudu.cut.json

Reads data/tts/<episode>/<cut>/meta.json (per-character timings from scripts/tts.py) and writes
<cut>.timeline.json next to the spec (or `timeline_out` if the spec sets it). Subtitles are chunked
once per layout: `subs` for 16:9 (21 chars) and `subsP` for 9:16 (spec `sub_max_portrait`, default 14).
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUNCT = "，。；：、！？——…"


def split_chunks(sub, max_chunk):
    pieces = re.split(r"(?<=[。！？；：])(?!”)|(?<=——)", sub)
    pieces = [p for p in pieces if p.strip()]
    out = []
    for p in pieces:
        if len(p) <= max_chunk:
            out.append(p)
            continue
        parts = re.split(r"(?<=[，、])", p)
        cur = ""
        for part in parts:
            while len(part) > max_chunk + 2:  # a clause with no comma: cut it at the limit
                if cur:
                    out.append(cur)
                    cur = ""
                out.append(part[:max_chunk])
                part = part[max_chunk:]
            if cur and len(cur) + len(part) > max_chunk:
                out.append(cur)
                cur = part
            else:
                cur += part
        if cur:
            out.append(cur)
    merged = []
    for c in out:
        bare = len(c.strip(PUNCT + "“”"))
        prev_closed = merged and merged[-1].rstrip("”").endswith(("。", "！", "？"))
        if merged and not prev_closed and (bare <= 4 or len(merged[-1].strip(PUNCT)) <= 4) and len(merged[-1]) + len(c) <= max_chunk + 3:
            merged[-1] += c
        else:
            merged.append(c)
    return merged


def segments(chunk, in_quote):
    """Split a chunk into plain/quoted runs; tidy punctuation for display."""
    segs, cur = [], ""
    for ch in chunk:
        if ch == "“":
            if cur:
                segs.append({"text": cur, "q": in_quote})
            cur, in_quote = "“", True
        elif ch == "”":
            segs.append({"text": cur + "”", "q": True})
            cur, in_quote = "", False
        else:
            cur += ch
    if cur:
        segs.append({"text": cur, "q": in_quote})
    for s in segs:
        s["text"] = re.sub(r"[。！？]”", "”", s["text"])
        s["text"] = re.sub(r"[，、；：。]", "  ", s["text"])
    last = segs[-1]
    last["text"] = re.sub(r"(  |。|——)+$", "", last["text"].rstrip())
    if not last["text"]:
        segs.pop()
    return [s for s in segs if s["text"].strip()], in_quote


def chunk_subs(line, start, end, ct, dur, max_chunk):
    out, idx, in_quote = [], 0, False
    chunks = split_chunks(line["text"], max_chunk)
    for j, c in enumerate(chunks):
        cs = start + ct[idx]
        nxt = idx + len(c)
        ce = start + (ct[nxt] if nxt < len(ct) else dur)
        if j == len(chunks) - 1:
            ce = end
        segs, in_quote = segments(c, in_quote)
        if segs:
            out.append({"line": line["id"], "start": round(cs, 3), "end": round(ce, 3), "segs": segs})
        idx = nxt
    return out


def build(spec_path):
    spec_path = Path(spec_path).resolve()
    spec = json.loads(spec_path.read_text())
    meta = json.loads((ROOT / "data/tts" / spec["episode"] / spec["id"] / "meta.json").read_text())
    gap = spec.get("gap", 0.45)
    portrait = "portrait" in spec.get("formats", ["landscape"])
    landscape = "landscape" in spec.get("formats", ["landscape"])
    t = 0.0
    lines, chapters, subs, subs_p = [], [], [], []
    for ch in spec["chapters"]:
        c_start = t
        t += ch.get("lead", 0.0)
        for i, line in enumerate(ch["lines"]):
            if i > 0:
                t += gap
            t += line.get("pre", 0.0)
            m = meta[line["id"]]
            if m["text"] != line["text"]:
                sys.exit(f"{line['id']}: text changed since TTS — rerun scripts/tts.py")
            start, end = round(t, 3), round(t + m["dur"], 3)
            ct = m["ct"]
            lines.append({"id": line["id"], "chapter": ch["id"], "start": start, "end": end, "text": line["text"], "ct": [round(x, 2) for x in ct]})
            if landscape:
                subs += chunk_subs(line, start, end, ct, m["dur"], spec.get("sub_max", 21))
            if portrait:
                subs_p += chunk_subs(line, start, end, ct, m["dur"], spec.get("sub_max_portrait", 14))
            t = end
        t += ch.get("tail", 0.0)
        chapters.append({"id": ch["id"], "start": round(c_start, 3), "end": round(t, 3)})
    out = {"duration": round(t, 3), "chapters": chapters, "lines": lines, "subs": subs}
    if portrait:
        out["subsP"] = subs_p
    target = spec_path.parent / spec.get("timeline_out", spec_path.name.replace(".cut.json", ".timeline.json").replace(".script.json", ".timeline.json"))
    target.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"{spec['id']}: {t:.1f}s, {len(lines)} lines, {len(subs)} subs (16:9), {len(subs_p)} subs (9:16) -> {target.relative_to(ROOT)}")
    for c in chapters:
        print(f"  {c['id']:9s} {c['start']:7.2f} → {c['end']:7.2f}  ({c['end'] - c['start']:.1f}s)")
    return out


if __name__ == "__main__":
    for p in sys.argv[1:]:
        build(p)
