"""Key moments of the film, mirrored from the TypeScript director/cards so sound can hit them."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / "video/src/cuts/ep01/main.timeline.json").read_text())
LINES = {ln["id"]: ln for ln in TL["lines"]}
CHAP = {c["id"]: c for c in TL["chapters"]}
DURATION = TL["duration"]


def L(i):
    return LINES[i]


def C(i):
    return CHAP[i]


def at(i, phrase, off=0.0):
    ln = LINES[i]
    k = ln["text"].index(phrase)
    return ln["start"] + ln["ct"][k] + off


CHAPTERS = ["changan", "guazhou", "mohe", "gaochang", "lingshan", "bamiyan", "ganges", "nalanda", "tour",
            "kannauj", "indus", "pamir", "return"]

# (t0, t1) of the route head travelling — mirrors MOVES in director.ts
MOVES = [
    (C("changan")["end"] - 0.7, at("c2a", "来到瓜州", 0.6)),
    (at("c2b", "带他偷渡", -0.2), at("c2b", "绕过玉门关", 1.0)),
    (C("mohe")["start"] + 0.8, L("c3b")["end"] - 0.4),
    (at("c3c", "喝令他继续前行", -0.3), L("c3d")["start"] + 3.0),
    (C("gaochang")["start"] + 0.3, at("c4a", "便是高昌", 0.6)),
    (C("lingshan")["start"] + 0.2, at("c5a", "翻越凌山", 1.4)),
    (L("c5a")["end"] - 1.2, at("c5b", "在素叶城", 1.2)),
    (C("bamiyan")["start"] + 0.2, at("c6a", "撒马尔罕", 0.8)),
    (at("c6a", "撒马尔罕", 0.8), at("c6b", "在梵衍那", 0.8)),
    (C("ganges")["start"] + 0.2, at("c7a", "在恒河之上", 0.9)),
    (C("nalanda")["start"] + 0.2, at("c8a", "那烂陀寺", 0.8)),
    (C("tour")["start"] + 0.4, C("tour")["end"] - 0.6),
    (C("kannauj")["start"] + 0.2, at("c10a", "曲女城", 1.0)),
    (at("c11a", "踏上归途", -0.6), at("c11b", "渡信度河时", 1.2)),
    (C("pamir")["start"] + 0.2, at("c12b", "在于阗", 0.8)),
    (L("c12c")["start"] - 0.2, at("c12c", "回到敦煌", 1.0)),
    (C("return")["start"] + 0.2, at("c13a", "玄奘回到长安", 1.0)),
]

# cold open — mirrors COLD_SHOTS / COLD in director.ts
P0 = C("pro")["start"]
COLD_CUTS = [0.0] + [at("k1", w, -0.06) for w in ("流沙河", "女儿国", "通天河")]
COLD_WIDE = at("k2", "真实的地图", 0.4)
COLD_REWIND = (L("k3")["start"] + 0.3, at("k3", "真的有一个人", -0.15))
COLD_REDRAW = (at("k3", "真的有一个人"), L("k3")["end"] - 0.15)
# end card — mirrors Finale in ui/Outro.tsx
END_CARD = L("e3")["end"] + 0.5 + 2.4 + 4.4

TITLE = L("pro3")["end"] + 0.1
PLATES = {
    "huoyan": (at("c4d", "夏季", 0.3), C("gaochang")["end"] - 0.3),
    "lingshan": (at("c8c", "小说里", -0.3), C("nalanda")["end"] - 0.3),
    "shaijing": (L("c11c")["start"] - 0.1, C("indus")["end"] - 0.2),
}
NOVEL_REVEALS = [
    L("c1a")["start"] - 0.2,
    L("c2c")["start"] - 0.1,
    L("c3d")["start"] - 0.1,
    L("c4c")["start"] - 0.1,
    L("c7d")["start"] - 0.1,
    L("c10d")["start"] - 0.1,
]
HISTORY_REVEALS = [
    L("c1b")["start"] + 0.7, L("c2d")["start"] - 0.1, L("c3a")["start"] + 0.2, L("c3b")["start"] - 0.1,
    at("c4a", "国王", -0.3), L("c5a")["start"] - 0.1, L("c6b")["start"] - 0.1, L("c7c")["start"] - 0.1,
    at("c8a", "那烂陀寺", -0.4), L("c10a")["start"] - 0.1, L("c10b")["start"] + 0.2, L("c12a")["start"] + 0.2,
    at("c13a", "玄奘回到长安", -0.6),
]
SEALS = [at("c5c", "到了小说里", -0.4) + i * 0.42 for i in range(6)]
SEAL_DASHENG = at("c10c", "大乘天", -0.3)
COUNTER = (L("c10c")["start"] + 0.1, L("c10c")["start"] + 2.5)
LOSS = at("c6c", "大佛被炸毁", -0.2)
DREAD = (L("c7b")["start"] - 0.5, L("c7c")["start"] + 0.4)
STRIKES = [at("c7c", "黑风", 0.1), at("c7c", "折树", 0.2), at("c7c", "河流涌浪", 0.3)]
STORM = (L("c7c")["start"] - 0.2, L("c7c")["end"] + 0.5)
WATER = (at("c11b", "风浪骤起", -0.4), L("c11b")["end"] + 0.6)
SWOOP = at("c4d", "火焰山", -0.6)
SOMERSAULT = at("e1", "筋斗云", -0.2)
FINAL_TITLE = L("e3")["end"] + 0.5
LINEAGE = [L("c13c")["start"] + 0.1, L("c13c")["start"] + 0.8, at("c13c", "南宋", -0.3), at("c13c", "到了明代", -0.2)]
STATS = [at("c13b", "六百五十七部", -0.6), at("c13b", "一千三百三十五卷", -0.6)]
ARRIVAL = at("c13a", "玄奘回到长安", 0.0)
WIND = [  # (t0, t1, level)
    (C("mohe")["start"] - 0.5, C("mohe")["end"], 1.0),
    (L("c5a")["start"] - 1.0, L("c5a")["end"] + 1.0, 0.9),
    (L("c12a")["start"] - 1.0, L("c12a")["end"] + 1.2, 0.9),
    (L("c12c")["start"] - 0.6, L("c12c")["end"] + 0.8, 0.8),
]
