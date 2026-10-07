"""Automated checks for a finished video.

    python scripts/qa.py <video.mp4> [--sheet out.jpg] [--target -15]

Reports integrated loudness / true peak (EBU R128), isolated single-frame flashes (a broken map frame
shows up as a frame that differs from both neighbours while they match each other), near-black runs,
and writes a 4x5 contact sheet. Exit code 1 if a hard rule fails.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    return float(j["format"]["duration"]), int(v["width"]), int(v["height"]), any(s["codec_type"] == "audio" for s in j["streams"])


def loudness(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    summary = err[err.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))
    lra = float(re.search(r"LRA:\s+(-?[\d.]+) LU", summary).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))
    return i, lra, tp


def frames(path, w=192):
    h = round(w * 9 / 16)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={w}:{h}:flags=area,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.int16)


def glitches(f, fps):
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    skip = np.abs(f[2:] - f[:-2]).mean(axis=(1, 2))
    score = np.minimum(d[:-1], d[1:]) - skip
    hits = [(int(i + 1), float(score[i])) for i in np.argsort(score)[::-1][:8] if score[i] > 6]
    dark = np.where(f.mean(axis=(1, 2)) < 4)[0]
    runs = []
    if len(dark):
        for r in np.split(dark, np.where(np.diff(dark) > 1)[0] + 1):
            runs.append((round(r[0] / fps, 2), round(r[-1] / fps, 2)))
    return hits, runs


def sheet(path, out, dur, cols=4, rows=5):
    n = cols * rows
    tiles = []
    tmp = Path(out).with_suffix("")
    tmp.mkdir(parents=True, exist_ok=True)
    for k in range(n):
        t = dur * (k + 0.5) / n
        p = tmp / f"{k:02d}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(path), "-frames:v", "1", "-vf", "scale=480:-2", str(p)], check=True)
        tiles.append(p)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "1", "-i", str(tmp / "%02d.jpg"), "-vf", f"tile={cols}x{rows}:padding=4:color=black", "-frames:v", "1", str(out)], check=True)
    for p in tiles:
        p.unlink()
    tmp.rmdir()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--sheet")
    ap.add_argument("--target", type=float, default=-15.0)
    a = ap.parse_args()
    dur, w, h, has_audio = probe(a.video)
    fps = 30
    lines, ok = [f"# QA · {Path(a.video).name}", "", f"- {w}×{h}, {dur:.2f}s"], True
    if has_audio:
        i, lra, tp = loudness(a.video)
        lines.append(f"- loudness {i:.1f} LUFS (target {a.target:.1f} ±1), LRA {lra:.1f} LU, true peak {tp:.1f} dBTP")
        if abs(i - a.target) > 1.0 or tp > -1.0:
            ok = False
            lines.append("  - FAIL: loudness or true peak out of range")
    else:
        lines.append("- no audio stream")
        ok = False
    hits, runs = glitches(frames(a.video), fps)
    lines.append(f"- isolated single-frame changes: {', '.join(f'{fr / fps:.2f}s ({s:.0f})' for fr, s in hits) or 'none'}")
    lines.append(f"- near-black runs: {', '.join(f'{float(a):.2f}–{float(b):.2f}s' for a, b in runs) or 'none'}")
    if a.sheet:
        sheet(a.video, a.sheet, dur)
        lines.append(f"- contact sheet: {a.sheet}")
    lines.append(f"- verdict: {'PASS' if ok else 'CHECK'} (flash candidates still need a human look: lightning, hard cuts)")
    print("\n".join(lines))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
