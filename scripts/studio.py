"""One entry point for the whole pipeline.

    python scripts/studio.py list    ep01
    python scripts/studio.py voice   ep01 [--cut s1-toudu] [--provider doubao] [--force]
    python scripts/studio.py timeline ep01 [--cut s1-toudu]
    python scripts/studio.py score   ep01 [--cut s1-toudu] [--remix]
    python scripts/studio.py render  ep01 [--only main,s1] [--covers-only]
    python scripts/studio.py package ep01 [--only main,s1]
    python scripts/studio.py qa      ep01 [--only main,s1]
    python scripts/studio.py all     ep01 [--provider doubao]      # voice → timeline → score → render → package → qa

Cuts live in video/src/cuts/<ep>/: main.script.json (the long film, legacy code path for ep01) and
*.cut.json (declarative cuts). episode.json lists the deliverables that `render/package/qa` handle.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY = sys.executable
CUTS = ROOT / "video/src/cuts"


def run(cmd, cwd=ROOT):
    print("$", " ".join(str(c) for c in cmd), flush=True)
    subprocess.run([str(c) for c in cmd], cwd=cwd, check=True)


def specs(ep, cut=None):
    d = CUTS / ep
    out = []
    main = d / "main.script.json"
    if main.exists() and cut in (None, "main"):
        out.append(main)
    out += [p for p in sorted(d.glob("*.cut.json")) if cut in (None, p.name.replace(".cut.json", ""))]
    if not out:
        sys.exit(f"no spec for {ep} {cut or ''}")
    return out


def episode(ep):
    return json.loads((CUTS / ep / "episode.json").read_text())


def deliverables(ep, only):
    ds = episode(ep)["deliverables"]
    return [d for d in ds if not only or d["key"] in only]


def cmd_list(a):
    ep = episode(a.ep)
    print(f"{a.ep} · {ep['title']}")
    for p in specs(a.ep):
        s = json.loads(p.read_text())
        tts = ROOT / "data/tts" / a.ep / s["id"] / "meta.json"
        tl = p.parent / s.get("timeline_out", p.name.replace(".cut.json", ".timeline.json").replace(".script.json", ".timeline.json"))
        audio = ROOT / "data/audio" / a.ep / s["id"] / "mix_voice.wav"
        dur = json.loads(tl.read_text())["duration"] if tl.exists() else 0
        print(f"  {s['id']:16s} {'tts' if tts.exists() else '---'} {'timeline' if tl.exists() else '--------'} {'audio' if audio.exists() else '-----'}  {dur:6.1f}s  {s.get('title', '')}")
    for d in ep["deliverables"]:
        final = ROOT / "out" / a.ep / d["folder"] / f"{d['name']}.mp4"
        print(f"  [{d['key']}] {d['comp']:24s} {'✔' if final.exists() else '·'} {d['folder']}")


def cmd_voice(a):
    for p in specs(a.ep, a.cut):
        run([PY, "scripts/tts.py", p] + (["--provider", a.provider] if a.provider else []) + (["--force"] if a.force else []))


def cmd_timeline(a):
    run([PY, "scripts/timeline.py"] + specs(a.ep, a.cut))


def cmd_score(a):
    for p in specs(a.ep, a.cut):
        extra = ["--remix"] if a.remix else []
        run([PY, "-u", "scripts/score.py"] + ([] if p.name == "main.script.json" else ["--cut", p]) + extra)


def cmd_render(a):
    ids = []
    for d in deliverables(a.ep, a.only):
        if not a.covers_only:
            ids.append(d["comp"])
        ids += list(d.get("covers", {}).values())
    run(["node", "scripts/render.mjs", "--out", ROOT / "out" / a.ep / "_build"] + list(dict.fromkeys(ids)), cwd=ROOT / "video")


def mux(video, audio, out, title):
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)], capture_output=True, text=True, check=True).stdout.strip()
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-t", dur,
         "-c:v", "copy", "-c:a", "aac_at", "-b:a", "320k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart",
         "-metadata", f"title={title}", "-metadata:s:a:0", "language=chi", out])


def cmd_package(a):
    build = ROOT / "out" / a.ep / "_build"
    for d in deliverables(a.ep, a.only):
        folder = ROOT / "out" / a.ep / d["folder"]
        folder.mkdir(parents=True, exist_ok=True)
        audio = ROOT / "data/audio" / a.ep / d["audio"]
        mux(build / f"{d['comp']}.mp4", audio / "mix_voice.wav", folder / f"{d['name']}.mp4", d["name"])
        if d.get("music_only"):
            mux(build / f"{d['comp']}.mp4", audio / "mix_music.wav", folder / f"{d['name']}_纯音乐版.mp4", d["name"] + "（纯音乐版）")
        run([PY, "scripts/export_srt.py", CUTS / a.ep / d["timeline"], folder / f"{d['name']}.srt", d["subs"]])
        for aspect, comp in d.get("covers", {}).items():
            run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", build / f"{comp}.png", "-q:v", "2", folder / f"封面_{aspect}.jpg"])
    for doc in (ROOT / "docs/publish").glob(f"{a.ep}-*.md"):
        (ROOT / "out" / a.ep / "发布清单.md").write_text(doc.read_text(encoding="utf-8"), encoding="utf-8")


def cmd_qa(a):
    qa = ROOT / "out" / a.ep / "_qa"
    qa.mkdir(parents=True, exist_ok=True)
    report = []
    for d in deliverables(a.ep, a.only):
        video = ROOT / "out" / a.ep / d["folder"] / f"{d['name']}.mp4"
        dur = json.loads((CUTS / a.ep / d["timeline"]).read_text())["duration"]
        target = "-15" if dur > 180 else "-14.5"  # same rule as MASTER_LUFS in score.py
        r = subprocess.run([PY, "scripts/qa.py", video, "--sheet", qa / f"{d['key']}.jpg", "--target", target], capture_output=True, text=True)
        print(r.stdout)
        report.append(r.stdout)
    (qa / "report.md").write_text("\n\n".join(report), encoding="utf-8")
    print(f"-> {qa / 'report.md'}")


def cmd_all(a):
    for step in (cmd_voice, cmd_timeline, cmd_score, cmd_render, cmd_package, cmd_qa):
        step(a)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["list", "voice", "timeline", "score", "render", "package", "qa", "all"])
    ap.add_argument("ep")
    ap.add_argument("--cut")
    ap.add_argument("--provider")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--remix", action="store_true")
    ap.add_argument("--only", type=lambda s: set(s.split(",")))
    ap.add_argument("--covers-only", action="store_true")
    a = ap.parse_args()
    globals()[f"cmd_{a.command}"](a)


if __name__ == "__main__":
    main()
