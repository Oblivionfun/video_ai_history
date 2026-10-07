"""Narration synthesis for one cut, with pluggable providers.

    python scripts/tts.py video/src/cuts/ep01/s1-toudu.cut.json [--provider doubao] [--only h1,b2] [--force]

Every provider returns audio plus a start time for each character of the on-screen line (`ct`),
so the timeline, subtitles and animation anchors never depend on which voice was used.
Lines are cached: a line is only re-synthesized when its text, provider or voice settings change.
Output: data/tts/<episode>/<cut>/<line>.wav and meta.json.
"""

import argparse
import asyncio
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import uuid
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
PUNCT = set("，。、；：？！…—“”‘’（）《》·,.;:?!()\"' \n")


# ----------------------------------------------------------------------------- config


def load_env():
    env = dict(os.environ)
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip())
    return env


class Pron:
    """Pronunciation table compiled into each provider's own markup."""

    def __init__(self):
        data = json.loads((ROOT / "config/pronunciations.json").read_text())
        self.entries = sorted(data["entries"], key=lambda e: -len(e["word"]))
        for e in self.entries:
            if "edge" in e:
                assert len(e["edge"]) == len(e["word"]), e

    def edge_text(self, text):
        for e in self.entries:
            if "edge" in e:
                text = text.replace(e["word"], e["edge"])
        return text

    def used(self, text):
        return [e for e in self.entries if e["word"] in text]

    def tone_rules(self, text):
        """`原词/(pin1)(yin1)` rules understood by Doubao and MiniMax."""
        return [e["word"] + "/" + "".join(f"({p})" for p in e["pinyin"].split()) for e in self.used(text)]

    def azure_ssml_body(self, text):
        out = xml_escape(text)
        for e in self.used(text):
            ph = " ".join(re.sub(r"(\d)$", r" \1", p) for p in e["pinyin"].split())
            out = out.replace(e["word"], f'<phoneme alphabet="sapi" ph="{ph}">{e["word"]}</phoneme>')
        return out


def xml_escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ----------------------------------------------------------------------------- timing helpers


def char_times_from_tokens(spoken, tokens, total):
    """Map timed tokens [(text, t)] onto characters of `spoken`; untimed characters are interpolated."""
    times = [None] * len(spoken)
    pos = 0
    for text, t in tokens:
        core = "".join(c for c in text if c not in PUNCT)
        if not core:
            continue
        k = spoken.find(core, pos)
        if k < 0:
            k = spoken.find(core[0], pos)
            if k < 0 or k - pos > 6:
                continue
            core = core[0]
        for i in range(k, k + len(core)):
            times[i] = t if i == k else None
        pos = k + len(core)
        # spread the token over its characters using the next token start later
    known = [i for i, v in enumerate(times) if v is not None]
    if not known:
        return estimate_char_times(spoken, total)
    out = [0.0] * len(spoken)
    for i in range(len(spoken)):
        prev = max((j for j in known if j <= i), default=None)
        nxt = min((j for j in known if j > i), default=None)
        if prev is None:
            out[i] = times[nxt]
        elif nxt is None:
            span = max(0.0, total - times[prev])
            rest = len(spoken) - prev
            out[i] = times[prev] + span * (i - prev) / max(1, rest)
        else:
            out[i] = times[prev] + (times[nxt] - times[prev]) * (i - prev) / (nxt - prev)
    return out


def estimate_char_times(text, total):
    """Fallback when a provider returns no timestamps: weight characters, longer pauses at punctuation."""
    w = []
    for c in text:
        if c in "，、；：":
            w.append(1.8)
        elif c in "。！？…":
            w.append(2.6)
        elif c in PUNCT:
            w.append(0.0)
        else:
            w.append(1.0)
    acc, out = 0.0, []
    s = sum(w) or 1
    for x in w:
        out.append(total * acc / s)
        acc += x
    return out


def trim(y, sr):
    env = np.convolve(np.abs(y), np.ones(int(0.01 * sr)) / int(0.01 * sr), mode="same")
    idx = np.where(env > 10 ** (-46 / 20))[0]
    # a click or breath before the first word is a short isolated burst; start at the first sustained run
    breaks = np.where(np.diff(idx) > 1)[0]
    starts, ends = np.r_[idx[0], idx[breaks + 1]], np.r_[idx[breaks], idx[-1]]
    sustained = np.where(ends - starts >= int(0.04 * sr))[0]
    first = starts[sustained[0]] if len(sustained) else idx[0]
    start = max(0, first - int(0.03 * sr))
    end = min(len(y), idx[-1] + int(0.10 * sr))
    y = y[start:end].copy()
    fade = int(0.01 * sr)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    return y, start / sr


def tighten(y, sr, ct, text, max_pause):
    """Cap pauses: max_pause at punctuation, 0.6 × max_pause between words; character times follow.

    Only audio more than 24 dB below the line's peak (silence, breaths, decay tails) is removed, so speech
    is never cut. Doubao pauses 0.6–1.1 s at commas and after words like 所以, where a narrator takes 0.3–0.4 s.
    """
    hop = int(0.01 * sr)
    n = len(y) // hop
    lv = 20 * np.log10(np.sqrt(np.mean(y[: n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
    quiet = lv < lv.max() - 24
    spoken = [i for i, ch in enumerate(text) if ch not in PUNCT]
    cuts = []
    for p, q in zip(spoken, spoken[1:]):
        cap = max_pause if q - p > 1 else 0.6 * max_pause
        a, b = min(n, int(ct[p] / 0.01) + 8), min(n, int(ct[q] / 0.01) + 3)
        best, s = (0, 0), None
        for f in range(a, b + 1):
            if f < b and quiet[f]:
                s = f if s is None else s
            elif s is not None:
                best = max(best, (f - s, s))
                s = None
        length, s = best
        if length * 0.01 > cap + 0.05:
            keep_a = int(0.45 * cap / 0.01)
            keep_b = int(cap / 0.01) - keep_a
            c0, c1 = (s + keep_a) * hop, (s + length - keep_b) * hop
            if not cuts or c0 >= cuts[-1][1] + hop:
                cuts.append((c0, c1))
    if not cuts:
        return y, ct
    xf = int(0.006 * sr)
    parts, last = [], 0
    for c0, c1 in cuts:
        parts.append(y[last:c0 + xf].copy())
        last = c1
    parts.append(y[last:].copy())
    out = parts[0]
    for p in parts[1:]:
        ramp = np.linspace(0, 1, xf)
        out[-xf:] = out[-xf:] * (1 - ramp) + p[:xf] * ramp
        out = np.concatenate([out, p[xf:]])

    def remap(t):
        k = t * sr
        removed = sum(min(max(0.0, k - c0), c1 - c0) for c0, c1 in cuts)
        return (k - removed) / sr

    return out, [remap(t) for t in ct]


def to_mono48k(path_in):
    tmp = path_in.with_suffix(".tmp.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(path_in), "-ac", "1", "-ar", str(SR), str(tmp)], check=True)
    y, _ = sf.read(tmp, dtype="float64")
    tmp.unlink()
    return y


# ----------------------------------------------------------------------------- providers


class Edge:
    name = "edge"

    def __init__(self, cfg, env, pron):
        self.voice, self.rate, self.pron = cfg["voice"], cfg.get("rate", "+0%"), pron

    def key(self):
        return f"edge|{self.voice}|{self.rate}"

    async def synth(self, text, workdir):
        import edge_tts

        spoken = self.pron.edge_text(text)
        for attempt in range(5):
            try:
                comm = edge_tts.Communicate(spoken, self.voice, rate=self.rate, boundary="WordBoundary")
                audio, words = bytearray(), []
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        audio.extend(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        words.append((chunk["text"], chunk["offset"] / 1e7))
                mp3 = workdir / f"{uuid.uuid4().hex}.mp3"
                mp3.write_bytes(bytes(audio))
                y = to_mono48k(mp3)
                mp3.unlink()
                return y, spoken, words
            except Exception as exc:  # network hiccups are common with the free endpoint
                print(f"  edge attempt {attempt} failed: {exc}", flush=True)
                await asyncio.sleep(2 + attempt)
        raise RuntimeError("edge-tts failed")


class Doubao:
    """火山引擎 豆包语音合成 2.0 / 声音复刻 2.0, HTTP chunked one-way streaming (V3)."""

    name = "doubao"
    URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional"

    def __init__(self, cfg, env, pron):
        self.cfg, self.env, self.pron = cfg, env, pron
        if not cfg.get("speaker"):
            sys.exit("config/voices.json: doubao.speaker is empty — pick a 2.0 voice id in the Volcengine console")
        if not (env.get("VOLC_API_KEY") or (env.get("VOLC_APP_ID") and env.get("VOLC_ACCESS_TOKEN"))):
            sys.exit(".env: set VOLC_API_KEY (new console) or VOLC_APP_ID + VOLC_ACCESS_TOKEN (old console)")
        self.section = str(uuid.uuid4())

    def key(self):
        c = self.cfg
        return f"doubao|{c.get('resource_id')}|{c['speaker']}|{c.get('model', '')}|{c.get('speech_rate', 0)}|{c.get('context', '')}"

    def headers(self):
        h = {
            "X-Api-Resource-Id": self.cfg.get("resource_id", "seed-tts-2.0"),
            "X-Api-Request-Id": str(uuid.uuid4()),
            "Content-Type": "application/json",
        }
        if self.env.get("VOLC_API_KEY"):
            h["X-Api-Key"] = self.env["VOLC_API_KEY"]
        else:
            h["X-Api-App-Id"] = self.env["VOLC_APP_ID"]
            h["X-Api-Access-Key"] = self.env["VOLC_ACCESS_TOKEN"]
        return h

    def body(self, text):
        additions = {"section_id": self.section}
        rules = self.pron.tone_rules(text)
        if rules:
            additions["pronunciation_dict"] = {"tone": rules}
        if self.cfg.get("context") and not self.cfg.get("model"):
            additions["context_texts"] = [self.cfg["context"]]
        req = {
            "text": text,
            "speaker": self.cfg["speaker"],
            "audio_params": {"format": "pcm", "sample_rate": SR, "speech_rate": int(self.cfg.get("speech_rate", 0)), "enable_subtitle": True},
            "additions": json.dumps(additions, ensure_ascii=False),
        }
        if self.cfg.get("model"):
            req["model"] = self.cfg["model"]
        return {"user": {"uid": "mapdoc"}, "req_params": req}

    async def synth(self, text, workdir):
        import aiohttp

        pcm, words = bytearray(), []
        async with aiohttp.ClientSession() as s:
            async with s.post(self.URL, headers=self.headers(), json=self.body(text), timeout=aiohttp.ClientTimeout(total=180)) as r:
                if r.status != 200:
                    raise RuntimeError(f"doubao HTTP {r.status}: {await r.text()}")
                buf = b""
                async for chunk in r.content.iter_any():
                    buf += chunk
                    while b"\n" in buf:
                        line, buf = buf.split(b"\n", 1)
                        self._handle(line, pcm, words)
                if buf.strip():
                    self._handle(buf, pcm, words)
        y = np.frombuffer(bytes(pcm), dtype="<i2").astype(np.float64) / 32768.0
        return y, text, words

    @staticmethod
    def _handle(line, pcm, words):
        line = line.strip()
        if not line:
            return
        if line.startswith(b"data:"):
            line = line[5:].strip()
        msg = json.loads(line)
        code = msg.get("code", 0)
        if code not in (0, 20000000):
            raise RuntimeError(f"doubao error {code}: {msg.get('message')}")
        if msg.get("data"):
            pcm.extend(base64.b64decode(msg["data"]))
        sent = msg.get("sentence") or {}
        for w in sent.get("words", []) or []:
            words.append((w.get("word", ""), float(w.get("startTime", 0.0))))


class Azure:
    """Official Azure Speech: YunjianNeural with the documentary-narration style and sapi pinyin."""

    name = "azure"

    def __init__(self, cfg, env, pron):
        try:
            import azure.cognitiveservices.speech  # noqa: F401
        except ImportError:
            sys.exit("pip install azure-cognitiveservices-speech  (into .venv)")
        if not env.get("AZURE_SPEECH_KEY"):
            sys.exit(".env: set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION")
        self.cfg, self.env, self.pron = cfg, env, pron

    def key(self):
        c = self.cfg
        return f"azure|{c['voice']}|{c.get('style')}|{c.get('styledegree')}|{c.get('rate')}"

    def ssml(self, text):
        c = self.cfg
        inner = self.pron.azure_ssml_body(text)
        if c.get("style"):
            inner = f'<mstts:express-as style="{c["style"]}" styledegree="{c.get("styledegree", 1)}">{inner}</mstts:express-as>'
        return (
            '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">'
            f'<voice name="{c["voice"]}"><prosody rate="{c.get("rate", "0%")}">{inner}</prosody></voice></speak>'
        )

    async def synth(self, text, workdir):
        import azure.cognitiveservices.speech as speechsdk

        def run():
            conf = speechsdk.SpeechConfig(subscription=self.env["AZURE_SPEECH_KEY"], region=self.env.get("AZURE_SPEECH_REGION", "eastasia"))
            conf.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Riff48Khz16BitMonoPcm)
            synth = speechsdk.SpeechSynthesizer(speech_config=conf, audio_config=None)
            words = []
            synth.synthesis_word_boundary.connect(lambda e: words.append((e.text, e.audio_offset / 1e7)))
            res = synth.speak_ssml_async(self.ssml(text)).get()
            if res.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
                raise RuntimeError(f"azure: {res.reason} {res.cancellation_details.error_details if res.cancellation_details else ''}")
            wav = workdir / f"{uuid.uuid4().hex}.wav"
            wav.write_bytes(res.audio_data)
            y = to_mono48k(wav)
            wav.unlink()
            return y, words

        y, words = await asyncio.to_thread(run)
        return y, text, words


class MiniMax:
    name = "minimax"

    def __init__(self, cfg, env, pron):
        if not cfg.get("voice_id"):
            sys.exit("config/voices.json: minimax.voice_id is empty")
        if not env.get("MINIMAX_API_KEY"):
            sys.exit(".env: set MINIMAX_API_KEY")
        self.cfg, self.env, self.pron = cfg, env, pron

    def key(self):
        c = self.cfg
        return f"minimax|{c['model']}|{c['voice_id']}|{c.get('speed')}"

    async def synth(self, text, workdir):
        import aiohttp

        c = self.cfg
        body = {
            "model": c["model"],
            "text": text,
            "stream": False,
            "voice_setting": {"voice_id": c["voice_id"], "speed": c.get("speed", 1.0), "vol": 1.0, "pitch": 0},
            "audio_setting": {"sample_rate": 44100, "format": "wav", "channel": 1},
            "subtitle_enable": True,
        }
        rules = self.pron.tone_rules(text)
        if rules:
            body["pronunciation_dict"] = {"tone": rules}
        headers = {"Authorization": f"Bearer {self.env['MINIMAX_API_KEY']}", "Content-Type": "application/json"}
        async with aiohttp.ClientSession() as s:
            async with s.post(c.get("endpoint"), headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=180)) as r:
                msg = await r.json(content_type=None)
            base = msg.get("base_resp", {})
            if base.get("status_code", 0) != 0:
                raise RuntimeError(f"minimax: {base}")
            wav = workdir / f"{uuid.uuid4().hex}.wav"
            wav.write_bytes(bytes.fromhex(msg["data"]["audio"]))
            words = []
            sub_url = msg["data"].get("subtitle_file")
            if sub_url:
                try:
                    async with s.get(sub_url) as r2:
                        subs = await r2.json(content_type=None)
                    for seg in subs if isinstance(subs, list) else []:
                        for w in seg.get("timestamped_words") or []:
                            words.append((w.get("word", ""), float(w.get("time_begin", 0)) / 1000.0))
                        if not seg.get("timestamped_words"):
                            words.append((seg.get("text", ""), float(seg.get("time_begin", 0)) / 1000.0))
                except Exception as exc:  # timing falls back to the punctuation-weighted estimate
                    print(f"  minimax subtitle parse failed: {exc}", flush=True)
        y = to_mono48k(wav)
        wav.unlink()
        return y, text, words


PROVIDERS = {"edge": Edge, "doubao": Doubao, "doubao_clone": Doubao, "azure": Azure, "minimax": MiniMax}


# ----------------------------------------------------------------------------- driver


def cut_lines(spec):
    for ch in spec["chapters"]:
        for ln in ch["lines"]:
            yield ln["id"], ln["text"]


def out_dir(spec):
    return ROOT / "data" / "tts" / spec["episode"] / spec["id"]


async def run(spec_path, provider_name=None, only=None, force=False):
    spec = json.loads(Path(spec_path).read_text())
    voices = json.loads((ROOT / "config/voices.json").read_text())
    provider_name = provider_name or spec.get("voice", {}).get("provider", "edge")
    cfg = {**voices.get(provider_name, {}), **{k: v for k, v in spec.get("voice", {}).items() if k != "provider" and provider_name == spec.get("voice", {}).get("provider")}}
    prov = PROVIDERS[provider_name](cfg, load_env(), Pron())
    od = out_dir(spec)
    od.mkdir(parents=True, exist_ok=True)
    meta_path = od / "meta.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    sem = asyncio.Semaphore(4)

    max_pause = cfg.get("max_pause")

    async def one(lid, text):
        raw_key = hashlib.sha1(f"{prov.key()}|{text}".encode()).hexdigest()[:16]
        sig = hashlib.sha1(f"{prov.key()}|{text}{f'|mp{max_pause}' if max_pause else ''}".encode()).hexdigest()[:16]
        if not force and meta.get(lid, {}).get("sig") == sig and (od / f"{lid}.wav").exists():
            return None
        # the provider's untouched output, so changing post-processing never pays for synthesis twice
        raw = od / "raw" / f"{raw_key}.npz"
        if raw.exists() and not force:
            z = np.load(raw)
            y, spoken, tokens = z["y"].astype(np.float64), str(z["spoken"]), [(w, float(t)) for w, t in json.loads(str(z["tokens"]))]
        else:
            async with sem:
                y, spoken, tokens = await prov.synth(text, od)
            raw.parent.mkdir(exist_ok=True)
            np.savez(raw, y=y.astype(np.float32), spoken=spoken, tokens=json.dumps(tokens, ensure_ascii=False))
        y, offset = trim(y, SR)
        dur = len(y) / SR
        ct = char_times_from_tokens(spoken, [(w, t - offset) for w, t in tokens], dur)
        if max_pause:
            y, ct = tighten(y, SR, ct, spoken, max_pause)
            dur = len(y) / SR
        ct = [round(max(0.0, min(dur, x)), 3) for x in ct]
        sf.write(od / f"{lid}.wav", y.astype(np.float32), SR, subtype="PCM_24")
        meta[lid] = {"text": text, "dur": round(dur, 4), "ct": ct, "sig": sig, "provider": prov.key(), "timed": bool(tokens)}
        print(f"  {lid}: {dur:5.2f}s{'' if tokens else '  (estimated timing)'}", flush=True)
        return lid

    jobs = [one(lid, text) for lid, text in cut_lines(spec) if not only or lid in only]
    done = [x for x in await asyncio.gather(*jobs) if x]
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    total = sum(meta[lid]["dur"] for lid, _ in cut_lines(spec) if lid in meta)
    print(f"{spec['id']}: {len(done)} synthesized, narration {total:.1f}s ({provider_name})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--provider")
    ap.add_argument("--only", help="comma-separated line ids")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    asyncio.run(run(a.spec, a.provider, set(a.only.split(",")) if a.only else None, a.force))


if __name__ == "__main__":
    main()
