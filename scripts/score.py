"""Procedural score + sound design + mix.

    python scripts/score.py                      # the long film (cues in scripts/events.py)
    python scripts/score.py --cut <x.cut.json>   # any cut: sections/cues come from its "audio" block
    add --remix to skip synthesis and redo only the mix from the cached stems

Outputs data/audio/<episode>/<cut>/{mix_voice.wav, mix_music.wav, narration.wav, stem_*.npy}.
Everything is synthesised here (no samples), so the soundtrack is fully original.
"""

import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import ndimage, signal

sys.path.insert(0, str(Path(__file__).parent))

ROOT = Path(__file__).resolve().parent.parent
SR = 48000

CUT_PATH = Path(sys.argv[sys.argv.index("--cut") + 1]).resolve() if "--cut" in sys.argv else None
if CUT_PATH:
    CUT = json.loads(CUT_PATH.read_text())
    TL = json.loads(CUT_PATH.with_name(CUT_PATH.name.replace(".cut.json", ".timeline.json")).read_text())
    E = None
else:
    import events as E  # noqa: E402

    CUT = None
    TL = E.TL
EPISODE, CUT_ID = (CUT["episode"], CUT["id"]) if CUT else ("ep01", "main")
DURATION = TL["duration"]
OUT = ROOT / "data" / "audio" / EPISODE / CUT_ID
OUT.mkdir(parents=True, exist_ok=True)
TTS_DIR = ROOT / "data" / "tts" / EPISODE / CUT_ID
N = int((DURATION + 0.8) * SR)
RNG = np.random.default_rng(20251004)
TAU = 2 * np.pi


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Bus:
    def __init__(self):
        self.x = np.zeros((2, N), np.float32)

    def add(self, t0, y, pan=0.0, gain=1.0):
        i0 = int(round(t0 * SR))
        if y.ndim == 1:
            a = (pan + 1) * np.pi / 4
            y = np.stack([y * np.cos(a), y * np.sin(a)]) * np.sqrt(2)
        if i0 < 0:
            y = y[:, -i0:]
            i0 = 0
        n = min(y.shape[1], N - i0)
        if n > 0:
            self.x[:, i0:i0 + n] += (y[:, :n] * gain).astype(np.float32)


pad, pluck, bells, perc, amb, sfx = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()

# ----------------------------------------------------------------------------- instruments


def adsr(n, att, rel_start, rel):
    t = np.arange(n) / SR
    env = np.minimum(1.0, t / max(att, 1e-3))
    tail = np.clip(1 - (t - rel_start) / max(rel, 1e-3), 0, 1)
    env = env * np.where(t > rel_start, tail, 1.0)
    return env * env * (3 - 2 * env)  # smoothstep for softer curves


def pad_note(m, t0, t1, amp, bright=0.4, att=2.2, rel=3.2, pan=0.0):
    f = mtof(m)
    n = int((t1 - t0 + rel) * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    norm = 0.0
    for d in (-7, 0, 6):
        fd = f * 2 ** (d / 1200)
        ph = RNG.uniform(0, TAU)
        for k in range(1, 14):
            if fd * k > 7000:
                break
            a = 1.0 / k ** (2.4 - 1.3 * bright)
            y += a * np.sin(TAU * fd * k * t + ph * k)
            norm += a
    lfo = 1 + 0.07 * np.sin(TAU * (0.11 + 0.08 * RNG.random()) * t + RNG.uniform(0, TAU))
    y = y / norm * adsr(n, att, t1 - t0, rel) * lfo
    pad.add(t0, y * amp, pan)


def pluck_note(m, t0, amp, decay=2.6, bright=0.6, pan=0.0, slide=False, vib=False, bus=None):
    f = mtof(m)
    n = int(decay * 2.6 * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    B = 0.00012
    bend = np.zeros(n)
    if slide:  # 滑音: slide up from a tone below
        bend += -1.0 * np.exp(-t / 0.07)
    else:
        bend += 0.08 * np.exp(-t / 0.05)
    if vib:  # 揉弦
        bend += 0.12 * np.sin(TAU * 5.3 * t) * np.clip((t - 0.35) / 0.4, 0, 1) * np.exp(-t / (decay * 1.2))
    ratio = 2 ** (bend / 12)
    for k in range(1, 16):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 11000:
            break
        ak = (1.0 / k ** 1.05) * (0.35 + 0.65 * bright) ** (k - 1)
        tau = decay / (1 + 0.55 * (k - 1))
        phase = TAU * np.cumsum(fk * ratio) / SR
        y += ak * np.exp(-t / tau) * np.sin(phase)
    pick = signal.sosfilt(signal.butter(2, [1800, 5200], "bandpass", fs=SR, output="sos"), RNG.normal(size=n))
    y += 0.25 * pick * np.exp(-t / 0.004)
    y *= np.minimum(1, t / 0.0015)
    (bus or pluck).add(t0, y * amp * 0.32, pan)


def bell(m, t0, amp, decay=5.5, pan=0.0):
    f = mtof(m)
    n = int(decay * 1.6 * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for r, a, d in [(1, 1, 1.0), (2.76, 0.55, 0.55), (5.40, 0.32, 0.32), (8.93, 0.18, 0.2), (13.34, 0.08, 0.12)]:
        for det in (0, 0.9):
            y += a * np.exp(-t / (decay * d)) * np.sin(TAU * (f * r + det) * t)
    y *= np.minimum(1, t / 0.002)
    bells.add(t0, y * amp * 0.12, pan)


HP_38 = signal.butter(2, 38, "highpass", fs=SR, output="sos")
LP_180 = signal.butter(2, 180, "lowpass", fs=SR, output="sos")


def tame_low(x):
    """38 Hz high-pass plus roughly -6 dB shelf below ~180 Hz."""
    x = signal.sosfilt(HP_38, x, axis=-1)
    return (x - 0.5 * signal.sosfilt(LP_180, x, axis=-1)).astype(np.float32)


def drum_wave(amp, f0=120, f1=44, decay=1.0, noise=0.5):
    n = int((decay * 3) * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.07)
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / decay)
    body += 0.35 * np.sin(TAU * np.cumsum(f * 0.5) / SR) * np.exp(-t / (decay * 1.3))
    hit = signal.sosfilt(signal.butter(2, 900, "lowpass", fs=SR, output="sos"), RNG.normal(size=n)) * np.exp(-t / 0.035)
    y = body + noise * hit
    y *= np.minimum(1, t / 0.001)
    return y * amp * 0.5


def drum(t0, amp, **kw):
    perc.add(t0, drum_wave(amp, **kw))


def hit(t0, amp, **kw):
    """Sound-design impact: lives on the SFX bus so it survives the speech ducking of the score."""
    sfx.add(t0, tame_low(drum_wave(amp, **kw)) * 0.85)


def shaker(t0, amp):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    y = signal.sosfilt(signal.butter(2, 6500, "highpass", fs=SR, output="sos"), RNG.normal(size=n)) * np.exp(-t / 0.025)
    perc.add(t0, y * amp * 0.12, pan=RNG.uniform(-0.4, 0.4))


def filtered_noise(n, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), RNG.normal(size=n))


def wind(t0, t1, level):
    n = int((t1 - t0) * SR)
    t = np.arange(n) / SR
    for ch, pan in ((0, -0.7), (1, 0.7)):
        g1 = 0.55 + 0.45 * np.sin(TAU * 0.06 * t + RNG.uniform(0, TAU)) * (0.6 + 0.4 * np.sin(TAU * 0.21 * t + ch))
        g2 = 0.5 + 0.5 * np.sin(TAU * 0.09 * t + RNG.uniform(0, TAU))
        y = filtered_noise(n, 250, 800) * g1 + 0.5 * filtered_noise(n, 900, 2600) * g2 * g1
        env = np.minimum(1, t / 2.0) * np.minimum(1, (t[-1] - t) / 2.0)
        amb.add(t0, y * env * level * 0.3, pan)


def whoosh(t0, dur, amp, f_a=300, f_b=4000, rise=True):
    n = int(dur * SR)
    t = np.arange(n) / SR
    chunks = 24
    y = np.zeros(n)
    win_len = n // chunks * 2
    for i in range(chunks):
        u = i / (chunks - 1)
        fc = f_a * (f_b / f_a) ** u
        s = int(i * n / chunks) - win_len // 4
        seg = filtered_noise(win_len, fc * 0.7, min(fc * 1.4, SR / 2 - 100))
        w = np.hanning(win_len)
        a, b = max(0, s), min(n, s + win_len)
        y[a:b] += (seg * w)[a - s:b - s]
    env = (t / dur) ** 2.2 if rise else (1 - t / dur) ** 2
    env *= np.minimum(1, (dur - t) / 0.06) if rise else np.minimum(1, t / 0.05)
    sfx.add(t0, y * env * amp * 0.5)


def thunder(t0, amp):
    n = int(4.5 * SR)
    t = np.arange(n) / SR
    crack = filtered_noise(n, 1500, 6000) * np.exp(-t / 0.08)
    rumble = signal.sosfilt(signal.butter(3, 180, "lowpass", fs=SR, output="sos"), RNG.normal(size=n))
    mod = 0.6 + 0.4 * np.abs(signal.sosfilt(signal.butter(1, 6, "lowpass", fs=SR, output="sos"), RNG.normal(size=n))) * 3
    y = 0.4 * crack + 2.2 * rumble * mod * np.exp(-t / 1.4) * np.minimum(1, t / 0.05)
    sfx.add(t0, y * amp * 0.5)


def heartbeat(t0, t1, bpm=66, amp=1.0):
    period = 60 / bpm
    k = 0
    while t0 + k * period < t1:
        for off, g in ((0, 1.0), (0.22, 0.7)):
            n = int(0.5 * SR)
            t = np.arange(n) / SR
            f = 38 + 40 * np.exp(-t / 0.03)
            y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.13)
            sfx.add(t0 + k * period + off, y * g * amp * 0.9)
        k += 1


def stamp(t0, amp):
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    f = 55 + 110 * np.exp(-t / 0.02)
    thump = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    slap = filtered_noise(n, 900, 4500) * np.exp(-t / 0.025)
    sfx.add(t0, (thump + 0.5 * slap) * amp * 0.75)


def tick(t0, amp):
    n = int(0.15 * SR)
    t = np.arange(n) / SR
    b, a = signal.iirpeak(1150, 18, fs=SR)
    y = signal.lfilter(b, a, RNG.normal(size=n)) * np.exp(-t / 0.018)
    y += 0.5 * np.sin(TAU * 820 * t) * np.exp(-t / 0.03)
    sfx.add(t0, y * amp * 0.5, pan=0.15)


def water(t0, t1, amp):
    n = int((t1 - t0) * SR)
    t = np.arange(n) / SR
    base = signal.sosfilt(signal.butter(2, [120, 1400], "bandpass", fs=SR, output="sos"), RNG.normal(size=(2, n)))
    swell = 0.5 + 0.5 * np.sin(TAU * 0.35 * t)[None] ** 2
    env = np.minimum(1, t / 0.8) * np.minimum(1, (t[-1] - t) / 1.2)
    sfx.add(t0, base * swell * env * amp * 0.35)


def gliss(t0, amp=1.0, start=62, up=True, notes=11, step=0.042):
    scale = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91]
    idx = [i for i, m in enumerate(scale) if m >= start][:notes]
    if not up:
        idx = idx[::-1]
    for j, i in enumerate(idx):
        g = (0.55 + 0.45 * j / max(1, len(idx) - 1)) if up else (1 - 0.5 * j / len(idx))
        pluck_note(scale[i], t0 + j * step, amp * g * 0.68, decay=2.2, bright=0.75, pan=-0.5 + j / len(idx), bus=bells)


# ----------------------------------------------------------------------------- harmony

CH = {
    "Dm": ([50, 57, 64, 65, 69], 38),
    "Dsus": ([50, 57, 62, 64, 69], 38),
    "Bb": ([46, 53, 57, 62, 65], 34),
    "F": ([53, 57, 60, 65, 67], 41),
    "C": ([48, 55, 62, 64, 67], 36),
    "Am": ([45, 52, 57, 60, 64], 33),
    "Gm": ([43, 50, 55, 58, 62], 31),
    "A": ([45, 52, 57, 61, 64], 33),
    "Fmaj": ([53, 57, 60, 64, 67, 72], 41),
}

MOODS = {
    #            progression                  chord_s bright reg  pluck   pulse  amp
    "mystery": (["Dm", "Dsus", "Bb", "Dm"], 4.6, 0.15, 0, "sparse", 0.0, 0.8),
    "title": (["Bb", "F", "C", "Dm"], 3.3, 0.6, 0, "motif", 0.0, 1.05),
    "regal": (["F", "C", "Dm", "Bb"], 5.5, 0.45, 0, "motif", 0.0, 0.85),
    "journey": (["Dm", "Bb", "F", "C"], 4.8, 0.5, 0, "arp", 0.6, 0.85),
    "desert": (["Dm", "Dsus", "Dm", "Am"], 7.0, 0.12, -12, "sparse", 0.0, 0.75),
    "warm": (["Bb", "F", "Gm", "Dm"], 5.0, 0.45, 0, "motif", 0.0, 0.85),
    "fire": (["Dm", "Bb", "Gm", "A"], 2.5, 0.7, 0, "trem", 0.5, 1.0),
    "cold": (["Am", "Dm", "Am", "Bb"], 6.0, 0.6, 12, "high", 0.0, 0.7),
    "loss": (["Dm", "Gm"], 4.5, 0.08, -12, "none", 0.0, 0.7),
    "tension": (["Dm", "Bb", "Gm", "A"], 4.5, 0.25, -12, "sparse", 0.6, 0.8),
    "silence": (["Dm"], 3.0, 0.05, -12, "none", 0.0, 0.25),
    "storm": (["Dm", "A", "Dm", "Bb"], 2.3, 0.8, 0, "trem", 0.42, 1.05),
    "release": (["Bb", "F", "C", "Dm"], 4.4, 0.4, 0, "motif", 0.0, 0.85),
    "sacred": (["F", "C", "Bb", "F"], 6.0, 0.5, 0, "motif", 0.0, 0.85),
    "sacred_big": (["Bb", "F", "C", "F"], 3.1, 0.75, 0, "motif", 0.0, 1.1),
    "journey_fast": (["Dm", "Bb", "F", "C"], 3.0, 0.6, 0, "arp8", 0.5, 0.95),
    "grand": (["Dm", "Bb", "F", "C"], 4.5, 0.55, 0, "motif", 0.0, 0.9),
    "battle": (["Dm", "Bb", "Gm", "A"], 2.4, 0.75, 0, "trem", 0.4, 1.05),
    "melancholy": (["Dm", "Gm", "Bb", "A"], 5.5, 0.3, 0, "sparse", 0.0, 0.8),
    "bittersweet": (["Bb", "F", "Gm", "Dm"], 4.5, 0.4, 0, "motif", 0.0, 0.9),
    "cold_journey": (["Am", "Dm", "Bb", "C"], 5.0, 0.55, 0, "arp", 0.6, 0.85),
    "build": (["Bb", "C", "Dm"], 2.2, 0.6, 0, "arp8", 0.5, 0.95),
    "triumph": (["F", "C", "Dm", "Bb"], 4.6, 0.7, 0, "motif", 0.0, 1.0),
    "reflect": (["Dm", "Bb", "F", "C"], 4.5, 0.45, 0, "sparse", 0.0, 0.85),
    "finale": (["Bb", "F", "C", "Dm", "Bb", "C", "Fmaj"], 2.25, 0.8, 0, "motif", 0.0, 1.15),
    "coldopen": (["Dm", "Bb", "Gm", "A"], 2.1, 0.6, 0, "arp8", 0.0, 0.95),
    "outro": (["Bb", "F"], 2.6, 0.35, 0, "sparse", 0.0, 0.7),
}


def main_sections():
    c, L = E.C, E.L
    return [
    (0.0, E.P0, "coldopen"),
    (E.P0, E.TITLE, "mystery"),
    (E.TITLE, c("changan")["start"], "title"),
    (c("changan")["start"], c("changan")["end"], "regal"),
    (c("guazhou")["start"], c("guazhou")["end"], "journey"),
    (c("mohe")["start"], c("mohe")["end"], "desert"),
    (c("gaochang")["start"], L("c4d")["start"], "warm"),
    (L("c4d")["start"], c("gaochang")["end"], "fire"),
    (c("lingshan")["start"], c("lingshan")["end"], "cold"),
    (c("bamiyan")["start"], E.LOSS - 0.3, "journey"),
    (E.LOSS - 0.3, c("bamiyan")["end"], "loss"),
    (c("ganges")["start"], E.DREAD[0], "tension"),
    (E.DREAD[0], E.STORM[0], "silence"),
    (E.STORM[0], L("c7d")["start"] - 0.2, "storm"),
    (L("c7d")["start"] - 0.2, c("ganges")["end"], "release"),
    (c("nalanda")["start"], L("c8c")["start"], "sacred"),
    (L("c8c")["start"], c("nalanda")["end"], "sacred_big"),
    (c("tour")["start"], c("tour")["end"], "journey_fast"),
    (c("kannauj")["start"], L("c10d")["start"] - 0.2, "grand"),
    (L("c10d")["start"] - 0.2, c("kannauj")["end"], "battle"),
    (c("indus")["start"], L("c11c")["start"] - 0.3, "melancholy"),
    (L("c11c")["start"] - 0.3, c("indus")["end"], "bittersweet"),
    (c("pamir")["start"], c("pamir")["end"], "cold_journey"),
    (c("return")["start"], E.ARRIVAL - 0.4, "build"),
    (E.ARRIVAL - 0.4, c("return")["end"], "triumph"),
    (c("epi")["start"], L("e3")["start"] - 0.6, "reflect"),
    (L("e3")["start"] - 0.6, E.DURATION, "finale"),
    ]

PENTA = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86]


def nearest_idx(m):
    return int(np.argmin([abs(p - m) for p in PENTA]))


def compose(sections, moves):
    for s0, s1, mood in sections:
        prog, dur, bright, reg, style, pulse, amp = MOODS[mood]
        n_chords = max(1, round((s1 - s0) / dur))
        cd = (s1 - s0) / n_chords
        for i in range(n_chords):
            name = prog[i % len(prog)]
            if mood == "finale" and i >= len(prog) - 1:
                name = "Fmaj"
            notes, bass = CH[name]
            t0 = s0 + i * cd
            t1 = t0 + cd
            if mood == "finale" and name == "Fmaj":
                t1 = DURATION - 0.4
            for j, m in enumerate(notes):
                low = m + reg < 52
                pad_note(m + reg, t0, t1, (0.07 if low else 0.11) * amp, bright, att=1.8 if cd > 3 else 0.9, rel=2.6,
                         pan=(-0.6 + 1.2 * j / (len(notes) - 1)))
            pad_note(bass + (12 if reg > 0 else 0), t0, t1, 0.075 * amp, 0.05, att=1.2, rel=2.0)
            if mood == "finale" and name == "Fmaj":
                break
            melody(style, t0, t1, notes, reg, bright, amp, seed=int(t0 * 10))
        if pulse:
            for m0, m1 in moves:
                a, b = max(s0, m0), min(s1, m1)
                if b - a < 1.2:
                    continue
                k = 0
                while a + k * pulse < b:
                    tt = a + k * pulse
                    w = np.sin(np.pi * (tt - m0) / (m1 - m0))
                    drum(tt, 0.22 * w * amp, f0=85, f1=48, decay=0.32, noise=0.25)
                    shaker(tt + pulse / 2, 0.8 * w * amp)
                    k += 1


def melody(style, t0, t1, chord, reg, bright, amp, seed):
    r = np.random.default_rng(seed)
    span = t1 - t0
    if style == "none":
        return
    if style == "sparse":
        k = 0
        while k * 2.3 < span - 0.5:
            m = PENTA[nearest_idx(r.choice(chord) + 12 + reg)]
            pluck_note(m, t0 + 0.4 + k * 2.3 + r.uniform(0, 0.4), 0.55 * amp, decay=3.2, bright=bright, pan=r.uniform(-0.5, 0.5),
                       slide=r.random() < 0.3, vib=True)
            k += 1
    elif style == "high":
        k = 0
        while k * 1.6 < span - 0.4:
            m = PENTA[min(len(PENTA) - 1, nearest_idx(r.choice(chord) + 24))]
            pluck_note(m, t0 + 0.3 + k * 1.6, 0.4 * amp, decay=2.4, bright=0.8, pan=r.uniform(-0.7, 0.7))
            k += 1
    elif style == "motif":
        beat = 0.58
        start = nearest_idx(r.choice(chord[2:]) + reg)
        idx = start
        tt = t0 + 0.25
        patterns = [[1, 0.5, 0.5, 1.5, 0.5, 2], [0.5, 0.5, 1, 1, 0.5, 1.5], [1.5, 0.5, 1, 1, 2], [0.5, 0.5, 0.5, 0.5, 1.5, 0.5, 2]]
        for d in patterns[r.integers(len(patterns))]:
            if tt > t1 - 0.4:
                break
            m = PENTA[idx]
            pluck_note(m, tt, 0.62 * amp, decay=2.6 if d < 1.5 else 3.4, bright=bright, pan=r.uniform(-0.35, 0.35),
                       slide=(d >= 1.5 and r.random() < 0.5), vib=d >= 1.5)
            tt += d * beat
            idx = int(np.clip(idx + r.choice([-2, -1, -1, 1, 1, 2]), 5, len(PENTA) - 2))
    elif style in ("arp", "arp8"):
        step = 0.6 if style == "arp" else 0.3
        tones = sorted(set(PENTA[nearest_idx(m + 12 + reg)] for m in chord))
        seq = tones + tones[-2:0:-1]
        k = 0
        while k * step < span - 0.2:
            m = seq[k % len(seq)]
            pluck_note(m, t0 + k * step, (0.4 if style == "arp" else 0.34) * amp, decay=1.8, bright=bright,
                       pan=-0.4 + 0.8 * ((k % len(seq)) / len(seq)))
            k += 1
    elif style == "trem":
        root = PENTA[nearest_idx(chord[0] + 24)]
        k = 0
        while k * 0.11 < span - 0.1:
            g = 0.3 + 0.2 * np.sin(np.pi * k * 0.11 / span)
            pluck_note(root, t0 + k * 0.11, g * amp, decay=0.9, bright=0.7, pan=0.2)
            k += 1


def roar(t0, dur=6.0, amp=0.5):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    y = signal.sosfilt(signal.butter(2, [60, 500], "bandpass", fs=SR, output="sos"), RNG.normal(size=n))
    sfx.add(t0, y * np.minimum(1, tt / 1.5) * np.exp(-tt / 3) * amp)


def tear(t0, amp=1.0):
    """Paper tearing: crackly band-passed noise with a jagged envelope."""
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    crackle = (RNG.random(n) < 0.012).astype(float) * RNG.uniform(0.4, 1.0, n)
    crackle = signal.sosfilt(signal.butter(2, 900, "highpass", fs=SR, output="sos"), crackle)
    body = filtered_noise(n, 1800, 6500) * (0.5 + 0.5 * np.abs(np.sin(TAU * 9 * t + RNG.uniform(0, TAU))))
    env = np.minimum(1, t / 0.02) * np.clip(1 - (t - 0.35) / 0.2, 0, 1)
    sfx.add(t0, (0.6 * body + 1.5 * crackle) * env * amp * 0.5, pan=0.2)


def sound_design_main():
    # cold open: a hit on every hard cut, a bloom on the whole-route reveal, a rewind, the walk, the globe
    for i, t in enumerate(E.COLD_CUTS):
        hit(t + 0.02, 0.85 if i else 1.0, f0=118, f1=42, decay=1.2)
        whoosh(t - 0.55, 0.6, 0.45, 400, 5200)
    bell(74, E.COLD_CUTS[0] + 0.1, 0.55, decay=6)
    whoosh(E.COLD_WIDE - 1.4, 1.5, 0.7, 250, 4200)
    gliss(E.COLD_WIDE - 0.2, 0.85, start=67, notes=12, step=0.05)
    bell(81, E.COLD_WIDE + 0.3, 0.5, decay=7, pan=0.3)
    whoosh(E.COLD_REWIND[0], E.COLD_REWIND[1] - E.COLD_REWIND[0] + 0.3, 0.6, 5200, 260, rise=False)
    gliss(E.COLD_REDRAW[0] + 0.1, 0.7, notes=13, step=(E.COLD_REDRAW[1] - E.COLD_REDRAW[0]) / 14)
    whoosh(E.COLD_REDRAW[1] - 1.6, 1.8, 0.6, 300, 3800)
    # prologue: deep boom + bell as the globe settles (times are relative to the prologue start)
    P0 = E.P0 + 0.6
    hit(P0 + 0.35, 0.9, f0=70, f1=32, decay=2.4, noise=0.2)
    bell(74, P0 + 1.0, 0.7, decay=7)
    for t in (5.8, 11.4):
        bell(81, P0 + t, 0.35, decay=6, pan=RNG.uniform(-0.6, 0.6))
    bell(69, E.END_CARD + 0.2, 0.4, decay=7, pan=-0.3)
    # title
    whoosh(E.TITLE - 1.9, 2.0, 0.9, 200, 5000)
    hit(E.TITLE + 0.05, 1.2, f0=120, f1=40, decay=1.8)
    gliss(E.TITLE + 0.1, 1.0)
    bell(74, E.TITLE + 0.1, 0.9, decay=8)
    whoosh(E.L("pro4")["start"] + 1.5, 3.2, 0.7, 250, 3500)
    # chapter openings
    for ch in E.CHAPTERS:
        t = E.C(ch)["start"]
        hit(t + 0.15, 0.75, f0=105, f1=42, decay=1.3)
        bell(69 if ch not in ("ganges", "indus") else 62, t + 0.2, 0.45, decay=5)
        whoosh(t - 1.1, 1.3, 0.35, 300, 2500)
    for t in E.NOVEL_REVEALS:
        gliss(t + 0.05, 0.75)
        bell(86, t + 0.5, 0.35, decay=4, pan=0.5)
    for t in E.HISTORY_REVEALS:
        bell(74, t + 0.1, 0.28, decay=4.5, pan=0.4)
    for name, (t0, _) in E.PLATES.items():
        whoosh(t0 - 1.5, 1.6, 0.8, 250, 4500)
        hit(t0 + 0.1, 1.0, f0=115, f1=40, decay=1.6)
        gliss(t0 + 0.15, 0.9, start=67)
    # 火焰山: swoop + low roar
    whoosh(E.SWOOP - 0.4, 2.0, 0.8, 150, 1800)
    roar(E.SWOOP + 0.8)
    # wind / sand / snow
    for t0, t1, lvl in E.WIND:
        wind(t0, t1, lvl)
    # 通关文牒 seals + paper unroll
    whoosh(E.L("c5c")["start"] - 0.2, 1.2, 0.35, 900, 3000, rise=False)
    for t in E.SEALS:
        stamp(t, 0.8)
    stamp(E.SEAL_DASHENG, 1.0)
    bell(62, E.SEAL_DASHENG + 0.02, 0.8, decay=7)
    # 十八日 counter ticks follow the on-screen number
    prev = 0
    for k in range(int((E.COUNTER[1] - E.COUNTER[0] + 0.4) * SR // 240)):
        t = E.COUNTER[0] + 0.1 + k * 240 / SR
        u = min(1.0, max(0.0, (t - (E.COUNTER[0] + 0.1)) / 2.4))
        num = int(1 + 17 * (1 - (1 - u) ** 3))
        if num != prev:
            tick(t, 0.5 + 0.03 * num)
            prev = num
    # 巴米扬: loss toll
    bell(50, E.LOSS + 0.1, 1.0, decay=9)
    hit(E.LOSS + 0.1, 0.6, f0=60, f1=30, decay=2.5, noise=0.1)
    # 恒河: heartbeat, storm, thunder
    heartbeat(E.DREAD[0] + 0.3, E.DREAD[1], bpm=64, amp=1.0)
    wind(E.STORM[0], E.STORM[1] + 1.0, 1.4)
    for t in E.STRIKES:
        thunder(t - 0.02, 1.0)
    # 信度河 water
    water(E.WATER[0], E.WATER[1] + 1.0, 1.0)
    # stats / lineage bells
    for t in E.STATS:
        bell(76, t + 0.5, 0.45, decay=5, pan=0.4)
    for i, t in enumerate(E.LINEAGE):
        bell([69, 72, 74, 77][i], t + 0.2, 0.35, decay=5, pan=0.3)
    hit(E.ARRIVAL + 0.2, 1.0, f0=110, f1=40, decay=1.6)
    gliss(E.ARRIVAL + 0.25, 0.9)
    # 筋斗云 + final title
    whoosh(E.SOMERSAULT - 0.1, 1.1, 1.0, 400, 7000)
    gliss(E.SOMERSAULT + 0.2, 0.9, start=67, notes=12, step=0.035)
    hit(E.FINAL_TITLE, 1.2, f0=110, f1=38, decay=2.2)
    bell(65, E.FINAL_TITLE + 0.05, 0.9, decay=9)
    bell(72, E.FINAL_TITLE + 0.05, 0.6, decay=9)


# ----------------------------------------------------------------------------- cuts


def T(anchor):
    """Same anchor grammar as video/src/shorts/spec.ts: start | end | id | id:end | id:短语 | @chapter[:end], ±seconds."""
    import re

    m = re.match(r"^(.*?)([+-]\d+(?:\.\d+)?)?$", anchor.strip())
    base, off = m.group(1), float(m.group(2) or 0)
    lines = {ln["id"]: ln for ln in TL["lines"]}
    if base == "start":
        v = 0.0
    elif base == "end":
        v = TL["duration"]
    elif base.startswith("@"):
        cid, _, which = base[1:].partition(":")
        ch = next(c for c in TL["chapters"] if c["id"] == cid)
        v = ch["end"] if which == "end" else ch["start"]
    else:
        lid, _, phrase = base.partition(":")
        ln = lines[lid]
        if not phrase:
            v = ln["start"]
        elif phrase == "end":
            v = ln["end"]
        else:
            v = ln["start"] + ln["ct"][ln["text"].index(phrase)]
    return v + off


def cut_sections():
    secs = sorted(((T(s["from"]), s["mood"]) for s in CUT["audio"]["sections"]), key=lambda x: x[0])
    return [(t0, secs[i + 1][0] if i + 1 < len(secs) else DURATION, mood) for i, (t0, mood) in enumerate(secs)]


def cut_moves():
    return [(T(o["from"]), T(o["to"])) for o in CUT.get("overlays", []) if o["type"] == "walker"]


def cut_hits():
    return [T(c["at"]) for c in CUT["audio"]["cues"] if c["kind"] in ("boom", "hit", "plate")]


def sound_design_cut():
    for c in CUT["audio"]["cues"]:
        t, k = T(c["at"]), c["kind"]
        if k == "boom":
            hit(t + 0.05, 0.9, f0=70, f1=32, decay=2.4, noise=0.2)
            bell(74, t + 0.5, 0.6, decay=7)
        elif k == "hit":
            whoosh(t - 1.0, 1.05, 0.5, 260, 4200)
            hit(t, 1.0, f0=115, f1=40, decay=1.6)
        elif k == "bell":
            bell(74, t, 0.45, decay=5, pan=RNG.uniform(-0.4, 0.4))
        elif k == "toll":
            bell(50, t, 1.0, decay=9)
            hit(t, 0.6, f0=60, f1=30, decay=2.5, noise=0.1)
        elif k == "whoosh":
            whoosh(t - 0.9, 1.0, 0.55, 300, 3600)
        elif k == "tear":
            tear(t, 1.0)
        elif k == "stamp":
            stamp(t, 1.0)
            bell(62, t + 0.02, 0.6, decay=6)
        elif k == "seals":
            whoosh(t - 1.4, 1.2, 0.35, 900, 3000, rise=False)
            for i in range(6):
                stamp(t + i * 0.42, 0.8)
        elif k == "gliss":
            gliss(t, 0.8)
        elif k == "roar":
            whoosh(t - 0.4, 1.6, 0.6, 150, 1800)
            roar(t + 0.4)
        elif k == "thunder":
            thunder(t, 1.0)
        elif k == "water":
            water(t - 0.3, t + 4.5, 1.0)
        elif k == "wind":
            wind(t - 0.5, t + 5.0, 0.9)
        elif k == "plate":
            whoosh(t - 1.5, 1.6, 0.8, 250, 4500)
            hit(t + 0.1, 1.0, f0=115, f1=40, decay=1.6)
            gliss(t + 0.15, 0.9, start=67)
        else:
            raise SystemExit(f"unknown cue kind {k!r} — see docs/02-cut-json.md")
    for kind, lvl in (("sand", 1.0), ("snow", 0.9)):
        for a, b in CUT.get("fx", {}).get(kind, []):
            wind(T(a) - 0.8, T(b) + 0.8, lvl)


# ----------------------------------------------------------------------------- mix


def reverb_ir(seconds=3.4, seed=7):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = r.normal(size=(2, n)) * np.exp(-t / (seconds / 6.9))[None]
    ir = signal.sosfilt(signal.butter(1, 5200, "lowpass", fs=SR, output="sos"), ir)
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[None]
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


IR = reverb_ir()


def wet(x, amount):
    y = np.stack([signal.oaconvolve(x[0], IR[0], mode="full")[:N], signal.oaconvolve(x[1], IR[1], mode="full")[:N]])
    return (x * (1 - amount * 0.5) + y * amount).astype(np.float32)


def load_narration():
    meta = json.loads((TTS_DIR / "meta.json").read_text())
    v = np.zeros(N, np.float32)
    for ln in TL["lines"]:
        y, sr = sf.read(TTS_DIR / f"{ln['id']}.wav", dtype="float32")
        assert sr == SR
        i0 = int(round(ln["start"] * SR))
        v[i0:i0 + len(y)] += y[: N - i0]
    v = signal.sosfilt(signal.butter(2, 75, "highpass", fs=SR, output="sos"), v)
    # gentle broadcast compression
    env = np.sqrt(signal.sosfilt(signal.butter(1, 12, "lowpass", fs=SR, output="sos"), v ** 2) + 1e-9)
    thr = 10 ** (-24 / 20)
    gain = np.where(env > thr, (env / thr) ** (1 / 2.5 - 1), 1.0)
    v = v * gain
    v = v / np.max(np.abs(v)) * 10 ** (-2 / 20)
    _ = meta
    return v.astype(np.float32)


STEMS = ("music", "sting", "fx")
VOICE_LUFS = -16.5  # narration alone, integrated
MUSIC_LUFS = -19.0  # score alone before ducking, integrated
MASTER_LUFS = -15.0 if CUT is None or DURATION > 180 else -14.5  # long films -15; short-form feeds play a touch louder
TP_CEILING = -1.8  # AAC adds 0.1–0.4 dB of inter-sample peak (most on thunder, surf, wind); delivered files land at ≤ -1.2 dBTP
BED_LUFS = -16.0  # music-only version
DUCK_DB = {"music": -12.0, "sting": -6.0, "fx": -5.0}
MARGIN = (14.0, 20.0)  # wanted voice-over-bed loudness per line, LU
SWELL_LU = 1.0  # music between lines may rise this far above the narration (short-term)
TITLE_LU = 3.0  # ...and this far around the opening and closing title hits
ACCENT_LU = 8.0  # effects and stingers stay this far under the line they land in (momentary)
MAX_CUT = 9.0
CR = 1000  # control rate of the gain curves (Hz)
SPEECH_BAND = signal.butter(2, [1200, 4500], "bandpass", fs=SR, output="sos")
KB1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
KB2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def k_weight(x):
    return signal.lfilter(*KB2, signal.lfilter(*KB1, x, axis=-1), axis=-1)


def power_lufs(p):
    return -0.691 + 10 * np.log10(np.asarray(p) + 1e-20)


def integrated(x):
    """ITU-R BS.1770-4 gated integrated loudness of a (channels, n) signal."""
    ms = (k_weight(x.astype(np.float64)) ** 2).sum(axis=0)
    c = np.concatenate([[0.0], np.cumsum(ms)])
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    s = np.arange(0, len(ms) - blk + 1, hop)
    z = (c[s + blk] - c[s]) / blk
    z = z[power_lufs(z) > -70]
    z = z[power_lufs(z) > power_lufs(z.mean()) - 10]
    return float(power_lufs(z.mean()))


def window_power(x, t0, t1, pre=0.5):
    """K-weighted power of x between t0 and t1 (filter settles over `pre` seconds first)."""
    a, b = int(t0 * SR), int(t1 * SR)
    p0 = max(0, a - int(pre * SR))
    k = k_weight(x[:, p0:b].astype(np.float64))[:, a - p0:]
    return float((k ** 2).mean(axis=1).sum())


def true_peak_db(x):
    return 20 * np.log10(max(np.abs(signal.resample_poly(ch, 4, 1)).max() for ch in x))


def limit(x, ceil_db, look_ms=5.0, rel_ms=90.0, dec=16):
    """Look-ahead limiter with 4x oversampled peak detection. Returns (y, max gain reduction in dB)."""
    n = x.shape[1]
    p = np.zeros(n, np.float32)
    for ch in x:
        up = np.abs(signal.resample_poly(ch, 4, 1)).astype(np.float32)
        np.maximum(p, up.reshape(n, 4).max(axis=1), out=p)
    req = np.minimum(1.0, 10 ** (ceil_db / 20) / np.maximum(p, 1e-9))
    nb = -(-n // dec)
    blk = np.pad(req, (0, nb * dec - n), constant_values=1.0).reshape(nb, dec).min(axis=1)
    la = max(2, 2 * round(look_ms * 1e-3 * SR / dec / 2))
    # min over ±la blocks then a mean over ±la/2 keeps every block at or below its own requirement
    blk = ndimage.minimum_filter1d(blk, 2 * la + 1)
    a = float(np.exp(-dec / (rel_ms * 1e-3 * SR)))
    g = np.empty_like(blk)
    prev = 1.0
    for i, r in enumerate(blk.tolist()):
        prev = r if r < prev else r + (prev - r) * a
        g[i] = prev
    g = ndimage.uniform_filter1d(g, la + 1)
    ga = np.interp(np.arange(n), np.arange(nb) * dec + (dec - 1) / 2, g).astype(np.float32)
    return (x * ga[None]).astype(np.float32), float(-20 * np.log10(g.min()))


def loudness_curve(x, hop=SR // 10, win=3 * SR):
    """Windowed loudness (3 s = short-term, 0.4 s = momentary) every `hop` samples, centred on `pos`."""
    p = (k_weight(x.astype(np.float64)) ** 2).sum(axis=0)
    c = np.concatenate([[0.0], np.cumsum(p)])
    pos = np.arange(0, x.shape[1], hop)
    a, b = np.clip(pos - win // 2, 0, x.shape[1]), np.clip(pos + win // 2, 0, x.shape[1])
    return pos, power_lufs((c[b] - c[a]) / np.maximum(b - a, 1))


def apply_cut(x, pos, cut, hops):
    """Smooth a per-hop cut curve (dB, <= 0) without letting it rise above what each hop asked for, then apply."""
    cut = ndimage.uniform_filter1d(ndimage.minimum_filter1d(cut, 2 * hops + 1), hops + 1)
    g = (10 ** (np.interp(np.arange(x.shape[1]), pos, cut) / 20)).astype(np.float32)
    return x * g[None], float(-cut.min())


def level(x, ceiling):
    """Slow leveller: pull short-term loudness down to `ceiling` (LUFS, scalar or per-hop array)."""
    pos, st = loudness_curve(x)
    return apply_cut(x, pos, np.minimum(0.0, ceiling - st), 15)


def tame_accents(x, voice):
    """Momentary control: sound effects and stingers stay ACCENT_LU under the line they land in."""
    hop = SR // 20
    pos, mb = loudness_curve(x, hop, int(0.4 * SR))
    cut = np.zeros_like(mb)
    for ln in TL["lines"]:
        lv = power_lufs(window_power(voice, ln["start"], ln["end"]))
        sel = (pos >= (ln["start"] - 0.1) * SR) & (pos <= (ln["end"] + 0.1) * SR)
        cut[sel] = np.minimum(0.0, lv - ACCENT_LU - mb[sel])
    return apply_cut(x, pos, np.maximum(cut, -15.0), 6)


def speech_regions(join=1.6):
    regions = []
    for ln in TL["lines"]:
        if regions and ln["start"] - regions[-1][1] < join:
            regions[-1][1] = ln["end"]
        else:
            regions.append([ln["start"], ln["end"]])
    return regions


def speech_gate(hits):
    """0..1 control curve: the bed dips just before each spoken passage and blooms back after it."""
    t = np.arange(int(N / SR * CR) + 2) / CR
    g = np.zeros_like(t)
    for a, b in speech_regions():
        a0, a1 = a - 0.55, a - 0.08
        b0, b1 = b + 0.2, b + 1.2
        nxt = [h for h in hits if b < h < b1 + 0.1]
        if nxt:  # be fully back for an impact that lands right after the passage
            b1 = max(b + 0.15, min(nxt) - 0.03)
            b0 = min(b0, b1 - 0.12)
        w = np.minimum(np.clip((t - a0) / (a1 - a0), 0, 1), np.clip((b1 - t) / (b1 - b0), 0, 1))
        g = np.maximum(g, 0.5 - 0.5 * np.cos(np.pi * w))
    return t, g


def rider(voice, bed):
    """Extra bed gain (dB) per line so the narration sits MARGIN above the ducked bed."""
    knots_t, knots_x, rows = [], [], []
    lo, hi = MARGIN
    for ln in TL["lines"]:
        m = float(power_lufs(window_power(voice, ln["start"], ln["end"])) - power_lufs(window_power(bed, ln["start"], ln["end"])))
        x = -min(MAX_CUT, lo + 1 - m) if m < lo else (min(3.0, m - hi) if m > hi else 0.0)
        knots_t += [ln["start"], ln["end"]]
        knots_x += [x, x]
        rows.append((ln["id"], m, x))
    return np.array(knots_t), np.array(knots_x), rows


def mix(stems):
    print("narration + mix...", flush=True)
    v = load_narration()
    voice = np.stack([v, v])
    voice *= 10 ** ((VOICE_LUFS - integrated(voice)) / 20)
    voice, gr = limit(voice, -2.5, look_ms=3.0, rel_ms=60.0)
    print(f"  voice limiter max GR {gr:.1f} dB", flush=True)
    k = 10 ** ((MUSIC_LUFS - integrated(stems["music"])) / 20)
    stems = {name: (x * k).astype(np.float32) for name, x in stems.items()}

    if CUT is None:
        hits = [E.C(ch)["start"] + 0.15 for ch in E.CHAPTERS] + [t0 + 0.1 for t0, _ in E.PLATES.values()]
        hits += [E.TITLE + 0.05, E.FINAL_TITLE] + list(E.COLD_CUTS)
        big = (E.TITLE, E.FINAL_TITLE)
    else:
        hits, big = cut_hits(), ()
    tc, gate = speech_gate(hits)
    ta = np.arange(N) / SR
    gate_a = np.interp(ta, tc, gate).astype(np.float32)
    ducked = {}
    for name, x in stems.items():
        g = (10 ** (gate_a * DUCK_DB[name] / 20)).astype(np.float32)
        if name == "music":  # carve the speech band out of the score while the narrator talks
            x = x - (0.4 * gate_a)[None] * signal.sosfiltfilt(SPEECH_BAND, x, axis=1).astype(np.float32)
        ducked[name] = x * g[None]
    accents, acut = tame_accents(ducked["sting"] + ducked["fx"], voice)
    bed = ducked["music"] + accents
    del ducked
    kt, kx, rows = rider(voice, bed)
    bed *= (10 ** (gate_a * np.interp(ta, kt, kx).astype(np.float32) / 20))[None]
    # big title moments may bloom a little higher than ordinary pauses
    pos = np.arange(0, N, SR // 10)
    near = np.zeros(len(pos))
    for h in big:
        near = np.maximum(near, np.clip(1.6 - np.abs(pos / SR - h - 1.0) / 2.0, 0, 1))
    bed, cut = level(bed, VOICE_LUFS + SWELL_LU + (TITLE_LU - SWELL_LU) * near)
    del ta
    print(f"  accent control max cut {acut:.1f} dB, bed leveller max cut {cut:.1f} dB", flush=True)

    margins = []
    for (lid, m0, x), ln in zip(rows, TL["lines"]):
        m = float(power_lufs(window_power(voice, ln["start"], ln["end"])) - power_lufs(window_power(bed, ln["start"], ln["end"])))
        margins.append((m, lid, m0, x))
    mm = np.array([m[0] for m in margins])
    print(f"  voice over bed per line: median {np.median(mm):.1f} LU, min {mm.min():.1f}, p10 {np.percentile(mm, 10):.1f}", flush=True)
    for m, lid, m0, x in sorted(margins)[:6]:
        print(f"    {lid:5s} {m:5.1f} LU (before ride {m0:5.1f}, ride {x:+.1f} dB)", flush=True)
    sb = signal.sosfilt(signal.butter(4, [1000, 4000], "bandpass", fs=SR, output="sos"), np.stack([voice[0], bed.mean(axis=0)]), axis=1)
    w = int(0.4 * SR)
    e = (sb[:, : N // w * w].reshape(2, -1, w) ** 2).mean(axis=2)
    act = e[0] > np.percentile(e[0], 40)
    r = 10 * np.log10(e[0, act] / (e[1, act] + 1e-20))
    print(f"  1-4 kHz speech windows: median {np.median(r):.1f} dB, p5 {np.percentile(r, 5):.1f} dB, "
          f"share under 6 dB {np.mean(r < 6) * 100:.1f}%", flush=True)

    mix_voice = voice + bed
    g_master = 10 ** ((MASTER_LUFS - integrated(mix_voice)) / 20)
    mix_voice, gr = limit(mix_voice * g_master, TP_CEILING)
    mix_music = stems["music"] + stems["sting"] + stems["fx"]
    mix_music, cut2 = level(mix_music, integrated(mix_music) + 7.0)
    mix_music, gr2 = limit(mix_music * 10 ** ((BED_LUFS - integrated(mix_music)) / 20), TP_CEILING)
    print(f"  music-only leveller max cut {cut2:.1f} dB", flush=True)
    for name, x, g_ in (("mix_voice", mix_voice, gr), ("mix_music", mix_music, gr2)):
        print(f"  {name}: {integrated(x):.1f} LUFS, true peak {true_peak_db(x):.2f} dBTP, limiter max GR {g_:.1f} dB", flush=True)
    pos, st = loudness_curve(mix_voice)
    quiet = gate_a[pos] < 0.02
    i = int(np.argmax(np.where(quiet, st, -99)))
    print(f"  short-term max between lines {st[i]:.1f} LUFS at {pos[i] / SR:.1f}s "
          f"(narration {integrated(voice * g_master):.1f})", flush=True)

    sf.write(OUT / "mix_voice.wav", mix_voice.T, SR, subtype="PCM_24")
    sf.write(OUT / "mix_music.wav", mix_music.T, SR, subtype="PCM_24")
    sf.write(OUT / "narration.wav", v, SR, subtype="PCM_24")
    print("done", mix_voice.shape, flush=True)


def render_stems():
    print("composing...", flush=True)
    if CUT is None:
        compose(main_sections(), E.MOVES)
        print("sound design...", flush=True)
        sound_design_main()
    else:
        compose(cut_sections(), cut_moves())
        print("sound design...", flush=True)
        sound_design_cut()
    rms = lambda x: float(np.sqrt(np.mean(x.astype(np.float64) ** 2)))  # noqa: E731
    for name, b in [("pad", pad), ("pluck", pluck), ("bells", bells), ("perc", perc), ("amb", amb), ("sfx", sfx)]:
        print(f"  {name:6s} rms {20 * np.log10(rms(b.x) + 1e-12):6.1f} dB", flush=True)
    print("reverb...", flush=True)
    stems = {
        "music": tame_low(wet(pad.x, 0.55) * 1.25 + wet(pluck.x, 0.42) * 1.35 + wet(perc.x, 0.22) * 0.85),
        "sting": tame_low(wet(bells.x, 0.6) * 1.6),
        "fx": signal.sosfilt(HP_38, wet(sfx.x, 0.18) + amb.x, axis=1).astype(np.float32),
    }
    fade_end = np.clip((DURATION + 0.3 - np.arange(N) / SR) / 2.0, 0, 1).astype(np.float32)
    for name, x in stems.items():
        x *= fade_end[None]
        np.save(OUT / f"stem_{name}.npy", x)
    return stems


def main():
    if "--remix" in sys.argv and all((OUT / f"stem_{s}.npy").exists() for s in STEMS):
        print("loading cached stems...", flush=True)
        stems = {s: np.load(OUT / f"stem_{s}.npy") for s in STEMS}
    else:
        stems = render_stems()
    mix(stems)


if __name__ == "__main__":
    main()


