# 02 · cut JSON 规范

一个 `video/src/cuts/<ep>/<id>.cut.json` 就是一条完整的片子：解说稿、镜头、路线、地图标注、卡片、特效、配乐和音效点、片尾、封面。**不需要写代码**——保存后 Remotion 自动注册合成：`<ep>-<id>-v`（9:16）、`<ep>-<id>-h`（16:9）以及封面 `<ep>-<id>-cover-v / -cover-34 / -cover-h / -cover-b`（`-cover-b` 是 B站用的 16:10）。

完整示例：`video/src/cuts/ep01/s1-toudu.cut.json`（竖版短片）、`s3-raolu.cut.json`（横竖两版）、`m1-quancheng.cut.json`（2 分钟全程）。

同一个引擎也能做 6–8 分钟的横版长片：用 `title` 卡做片名、`chapter` 卡分章（见下方）。ep01 的长片 `XuanzangFilm` 是早期手写代码（`Film.tsx` + `director.ts`），**ep02 起长片一律写成 `main.cut.json`**，不要再复制那套代码。

画面里的“系列身份”（片尾大字、印章、标语、封面角标）来自同目录 `episode.json` 的 `identity`；地图上的路线、节点、故事钉来自该期注册的路线（`video/src/episodes/index.ts`，见 `docs/09-new-episode.md`）。

## 锚点（anchor）

所有时间都写成锚点，配音一变，画面自动跟着变。

| 写法 | 含义 |
|---|---|
| `start` / `end` | 片头 / 片尾 |
| `b3` | 第 b3 句开始 |
| `b3:end` | 第 b3 句结束 |
| `b3:李昌` | 第 b3 句里“李昌”二字开口的时刻 |
| `@body` / `@body:end` | 段落开始 / 结束 |
| 任意后缀 `+0.4` / `-0.2` | 偏移秒数 |

## 字段

```jsonc
{
  "id": "s1-toudu", "episode": "ep01", "title": "唐僧其实是偷渡出国的？",
  "formats": ["portrait"],                 // portrait = 9:16, landscape = 16:9，可都写
  "voice": {"provider": "edge", "voice": "zh-CN-YunjianNeural", "rate": "-2%"},
  "gap": 0.32,                             // 句间停顿（秒）
  "sub_max": 20, "sub_max_portrait": 14,   // 字幕每条最多字数
  "chapters": [{"id": "hook", "lead": 0.25, "tail": 0.25, "lines": [{"id": "h1", "text": "…", "pre": 0}]}],
  "hook": {"kicker": "玄奘西行 · 历史 × 西游记", "lines": ["唐僧其实是", "偷渡出国的？"]},

  "camera": [                              // landscape 的参数；portrait 自动 zoom-0.6（或写 pz）
    {"at": "start", "ll": [108.94, 34.27], "zoom": 6.9, "pitch": 52, "bearing": -14},
    {"at": "b6", "ll": [76.5, 37.6], "zoom": 5.4, "pitch": 46, "bearing": 24, "cut": true, "pz": 4.9}
  ],
  "route": [                               // 路线生长：节点 id 来自本期路线文件，END = 全程
    {"at": "b2", "node": "changan"}, {"at": "b2:瓜州+0.5", "node": "guazhou"}
  ],
  "overlays": [
    {"type": "city", "node": "guazhou", "from": "b2:瓜州-0.3", "to": "b4:end", "side": "l"},
    {"type": "pin", "pin": "p_huoyan", "from": "e1", "to": "end-3.6"},
    {"type": "label", "anchor": "x:huoyan", "text": "火焰山", "sub": "吐鲁番", "style": "fire", "from": "…", "to": "…"},
    {"type": "line", "a": "n:changan", "b": "n:nalanda", "label": "最直的一条线", "from": "…", "to": "…"},
    {"type": "walker", "from": "b2", "to": "b2:瓜州+0.8"}
  ],
  "cards": [
    {"type": "image", "src": "xy_wukong", "kind": "novel", "tag": "西游记 · 原型之说", "title": "孙悟空", "sub": "…", "fx": 0.38, "from": "b5-0.1", "to": "b5:end+0.2"},
    {"type": "image", "src": "hs_gaochang", "kind": "history", "tag": "高昌", "title": "高昌王麴文泰", "loss": {"at": "b7:高昌国已经-0.3", "text": "公元 640 年 · 高昌国被唐所灭"}, "from": "…", "to": "…"},
    {"type": "quote", "lines": ["有诏不许"], "source": "《大唐大慈恩寺三藏法师传》", "from": "…", "to": "…"},
    {"type": "facts", "tag": "瓜州", "title": "李昌毁牒", "items": ["…", "…"], "from": "…", "to": "…"},
    {"type": "plate", "src": "xy_huoyanshan", "tag": "西游记 · 第五十九至六十一回", "title": "火焰山", "sub": "原型 · 吐鲁番火焰山", "from": "…", "to": "…"},
    {"type": "scroll", "seals": "b7:到了小说里", "label": "国书 → 通关文牒", "tag": "西游记 · 小说", "from": "…", "to": "…"},
    {"type": "title", "text": "李白", "kicker": "LI BAI · 701—762", "sub": "一张地图 看完诗仙一生", "dates": "701 — 762", "seal": "诗仙", "from": "@pro+0.3", "to": "@pro:end"},
    {"type": "chapter", "num": "一", "name": "仗剑去国", "theme": "开元十三年 · 二十四岁", "en": "LEAVING SHU", "from": "@c1", "to": "@c1+4.6"}
  ],
  "fx": {"night": [["b2", "b2:end"]], "sand": [], "snow": [], "heat": []},
  "end": {"from": "e1:end+0.35", "full": "完整版 · 看主页"},
  "cover": {"at": "e1:end", "lines": ["唐僧其实是", "偷渡出国的？"]},
  "audio": {
    "sections": [{"from": "start", "mood": "tension"}, {"from": "b2", "mood": "journey"}],
    "cues": [{"at": "b3:撕了", "kind": "tear"}, {"at": "b7:到了小说里", "kind": "seals"}]
  }
}
```

## 可用元素

- **地图锚点**（`overlays` 的 `anchor` / `line` 的 `a` `b`）：`n:<节点id>`（有名字的路线节点）、`p:<故事钉id>`、`a:<区域标签id>`、`x:<EXTRA 里的 id>`。全部来自本期路线文件（ep01 是 `video/src/data/route.ts`；ep02 起是 `video/src/episodes/<ep>/route.ts`），由 `lib/journey.ts` 的 `makeJourney` 生成。
- **label.style**：`fire`（书法字 + 红色热光）、`area`（区域名，宽字距）、`gold`。
- **cards.kind**：`history`（史，纸框）、`novel`（戏，金线框）、`mural`。`fx` 是插画裁切焦点（0 左 – 1 右）。
- **title / chapter 卡**（长片用）：浮在地图上，不压暗地图、不推开镜头。`title` 是居中的书法大字片名（字数多会自动缩小），窗口 6–9 秒，期间不要放 overlays；`chapter` 横版在左上角、竖版在画面中部，窗口约 4.6 秒；之后横版左上角常驻显示“当前章”。竖版里 chapter 卡不要和别的卡片重叠。建议配音效：title → `plate` 或 `boom`，chapter → `hit`。
- **fx**：`night`（夜色）、`heat`（热浪红光）、`sand`（风沙，自动配风声）、`snow`（飘雪，自动配风声）。
- **audio.kind**：`boom`（开场低鼓 + 钟）、`hit`（重拍）、`bell`、`toll`（丧钟，失去）、`whoosh`、`tear`（撕纸）、`stamp`（单枚印章）、`seals`（六枚印章，与 scroll 卡同步）、`gliss`（琶音划音，揭示）、`roar`（火焰低吼）、`thunder`、`water`、`wind`、`plate`（大画面揭示：嗖声 + 鼓 + 琶音）。

## 工作流

1. 写 `chapters`（解说稿）和 `hook`，跑 `python scripts/studio.py voice <ep> --cut <id>` 和 `timeline`。
2. 看 `video/src/cuts/<ep>/<id>.timeline.json` 里每句的时间，写 `camera / route / overlays / cards / fx`。
3. 出静帧检查：`cd video && node scripts/stills.mjs --comp <ep>-<id>-v 2 8 15 …`，图在 `out/stills/`。
4. 写 `audio`，跑 `studio.py score <ep> --cut <id>`，看混音指标。
5. 在 `episode.json` 里加一条 deliverable，`studio.py render/package/qa <ep> --only <key>`。

注意：改了解说文字，必须重跑 `voice → timeline`；只改画面字段不需要。
