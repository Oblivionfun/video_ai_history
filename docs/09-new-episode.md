# 09 · 做新一期（以 ep02 李白为例）

从零到一整套成片（横版长片 + 3–4 条竖版短片 + 横版短片 + 竖版中长片 + 封面 + 字幕 + 发布清单）。每一步都只改数据文件，不需要改引擎代码。ep01 的长片 `XuanzangFilm` 是早期手写代码，**不要复制它**；新一期的长片写成 `main.cut.json`。

| 要建/改的文件 | 作用 |
|---|---|
| `video/src/episodes/<ep>/route.ts` + `episodes/index.ts` | 本期路线、节点、故事钉、区域标签 |
| `video/public/img/<ep>_*.jpg` + `img2x/` | 插画（史 / 戏两类） |
| `config/pronunciations.json` | 新出现的多音字、古地名 |
| `video/src/cuts/<ep>/main.cut.json` | 横版长片（6–8 分钟） |
| `video/src/cuts/<ep>/s1-*.cut.json` … | 短片、中长片 |
| `video/src/cuts/<ep>/episode.json` | 系列身份、下期预告、交付清单 |
| `docs/publish/<ep>-<标题>.md` | 各平台标题/简介/标签/置顶评论 |

## 0. 选题与史实

1. 选题、钩子、看点已写在 `docs/08-content-plan.md`，先读对应那一期。
2. 列事实清单：每条事实写出处（正史、年谱、权威选本、学术论文）。有争议的说“一说”，并在简介里注明。没有出处的不写进解说。
3. 过一遍 `docs/05-compliance-qa.md` 的红线：不画现代国界，不魔改经典，涉及宗教和民族的表述要克制。

## 1. 路线

新建 `video/src/episodes/ep02/route.ts`，结构与 `video/src/data/route.ts`（ep01）相同，类型见 `video/src/episodes/types.ts`：

```ts
// ep02 · 李白. 坐标按郁贤皓《李白选集》年谱的地名考订；每个点都要核对后再用。
import type {RouteData} from '../types';

export const ROUTE_EP02: RouteData = {
  LEG_ORDER: ['shu', 'roam', 'exile'],
  LEG_STYLE: {exile: 'return'}, // 'return' 段画朱红并略微错开，其余金色
  LEGS: {
    shu: [
      {id: 'jiangyou', name: '青莲乡', modern: '江油', ll: [104.75, 31.78], kind: 'major'},
      {ll: [104.2, 30.6]}, // 无 id 的点只用来塑形
      {id: 'yuzhou', name: '渝州', modern: '重庆', ll: [106.55, 29.56], kind: 'minor'},
      {id: 'jiangling', name: '江陵', modern: '荆州', ll: [112.19, 30.35], kind: 'major'},
    ],
    roam: [
      // 每段第一个点重复上一段最后一个点；给它起的 id 自动成为别名（jiangling_r = jiangling）
      {id: 'jiangling_r', ll: [112.19, 30.35]},
      // ...
    ],
    exile: [/* ... */],
  },
  STORY_PINS: [{id: 'p_baidi', ll: [109.57, 31.04], novel: '《早发白帝城》', real: '奉节 · 白帝城', side: 'r'}],
  AREA_LABELS: [{id: 'sanxia', text: '三 峡', ll: [110.4, 31.0], kind: 'water'}],
  EXTRA: {},
};
```

在 `video/src/episodes/index.ts` 注册：

```ts
import {ROUTE_EP02} from './ep02/route';
export const JOURNEYS: Record<string, Journey> = {ep01: J01, ep02: makeJourney(ROUTE_EP02)};
```

要点：

- `kind`：`major`（大城，金色菱形 + 大字）、`minor`、`event`（事件点）、`via`。有 `name` 的点才会成为 `n:<id>` 锚点。
- 故事钉（`STORY_PINS`）是本频道的“史 × 戏”核心：`novel` 写文学/传说里的元素（诗题、小说情节），`real` 写真实地点。
- cut JSON 里的 `route` 关键帧用这些节点 id；`END` 表示全程。
- 跑 `cd video && npm run typecheck`，再挑一条短片出静帧，看路线形状。

## 2. 地图资源

- **瓦片**：已覆盖 z0–4 全球；z5–6 经度 20–160、纬度 −12–62；z7–8 经度 52–126、纬度 4–52（中国全境 + 中亚 + 印度）。李白、苏轼、赤壁、梁山泊、荔枝道、徐霞客都在范围内。超出范围要补：`python scripts/fetch_tiles.py --bbox 118,24,142,40`（例：鉴真东渡要补日本）、`--bbox 30,-12,80,30`（郑和到东非）。
- **河流**：`video/src/data/rivers.json` 所有期共用，目前只有 ep01 沿线的河。要加长江、汉水、淮河等：在 `scripts/extract_rivers.py` 的 `KEEP` 里加 Natural Earth 的英文名（如 `Chang Jiang`、`Han`、`Huai`），必要时放宽 `BBOX`，然后运行它。拿不准名字时先列出 bbox 内所有河名再挑。
- **镜头缩放**：影像最清晰到 z8，城市特写别超过 zoom 8.4；全国 4.2–4.8；省域 6–7。

## 3. 插画

- 风格与提示词模板见 `docs/03-style-guide.md` 末尾（工笔重彩 / 壁画质感，16:9）。用 Cursor 的图像生成工具出图。
- 命名：`video/public/img/ep02_<英文短名>.jpg`；放大：`.venv/bin/python scripts/upscale.py`（输出到 `img2x/`，渲染用的是 `img2x`）。
- 同一人物多张图：先出一张角色设定图，再拿它当参考图生成其余画面，保证脸和服饰一致。
- 下一期的预告图命名 `next_<英文短名>.jpg`，填进本期 `episode.json` 的 `next.img`。

## 4. 解说稿 → cut JSON

**长片 `main.cut.json` 建议结构**（字段规范见 `docs/02-cut-json.md`）：

| chapter id | 时长 | 内容 |
|---|---|---|
| `cold` | 15–25 秒 | 冷开场：一个反常识的问题 + 3–4 个快切地图镜头（camera 用 `cut: true`） |
| `pro` | 30–40 秒 | `title` 卡出片名，交代人物和时代 |
| `c1` … `c5` | 每章 60–80 秒 | 每章开头一张 `chapter` 卡；地图跟着路线走，穿插 image / quote / facts / plate |
| `epi` | 30–40 秒 | 全程总览（route 到 `END`），收束观点 |
| 片尾 | 最后一章 `tail` ≥ 8 秒 | `end.from` 设在最后一句结束后，片尾卡自动显示“关注 + 下期预告” |

- 写法：口语、短句，每句 15–35 字；一句只讲一件事；数字用阿拉伯数字。语速约每秒 4.3 字，7 分钟长片约 1800 字。
- `formats: ["landscape"]`；竖版中长片另写一条压缩版（参考 `ep01/m1-quancheng.cut.json`，2 分钟左右）。
- 短片：一个问题 + 一个答案，40–70 秒，开头 2 秒内出钩子（`hook.lines`），参考 `ep01/s1-toudu.cut.json`。
- 新的古地名、多音字先加进 `config/pronunciations.json`（`pinyin` 用数字调，`edge` 写同长度的同音字），再跑配音。

```bash
.venv/bin/python scripts/studio.py voice ep02              # 全部 cut；或 --cut main
.venv/bin/python scripts/studio.py timeline ep02
```

## 5. 画面

1. 打开 `video/src/cuts/ep02/main.timeline.json` 看每句的起止时间，写 `camera / route / overlays / cards / fx`。所有时间都用锚点（`c2:长安` = 第 c2 句“长安”二字开口时）。
2. 出静帧检查（每个镜头、每张卡至少一帧）：

   ```bash
   cd video && node scripts/stills.mjs --comp ep02-main-h 3 12 30 65 …
   ```

   输出在 `out/stills/`。逐张看：字是否出安全区，标签是否被卡片挡住，镜头是否糊（zoom 过大）。
3. 改了解说文字必须重跑 `voice → timeline`；只改画面字段不需要。

## 6. 配乐与音效

在 cut JSON 的 `audio` 里写分段情绪和音效点：

- `sections[].mood` 可选：`coldopen` `mystery` `title` `regal` `journey` `journey_fast` `desert` `warm` `fire` `cold` `cold_journey` `loss` `tension` `silence` `storm` `release` `sacred` `sacred_big` `grand` `battle` `melancholy` `bittersweet` `build` `triumph` `reflect` `finale` `outro`。
- `cues[].kind` 见 `docs/02-cut-json.md`。

```bash
.venv/bin/python scripts/studio.py score ep02 --cut main   # 打印响度、对白余量、遮蔽比例
```

验收标准见 `docs/04-audio.md`（长片 −15 LUFS、短片 −14.5，真峰 ≤ −1.2 dBTP，对白余量 ≥ 14 LU）。

## 7. episode.json 与发布清单

复制 `video/src/cuts/ep01/episode.json` 改写：

- `identity`：片尾大字 `film`、印章 `seal`（1–2 字）、标语 `tagline`、封面角标 `cover_tag`。
- `next`：本期片尾的下期预告（标题、副标题、预告图）。
- `deliverables`：每条成片一项（`comp` = 合成 id：`ep02-main-h`、`ep02-s1-xxx-v`；`covers` 填封面合成 id）。`folder` 按“序号_版式 · 用途”命名。

再按 `docs/publish/ep01-玄奘西行.md` 的格式写 `docs/publish/ep02-<标题>.md`（标题 / 简介 / 标签 / 章节时间 / 置顶评论 / 发布时间），打包时会复制到 `out/ep02/发布清单.md`。

## 8. 渲染、打包、质检

```bash
.venv/bin/python scripts/studio.py render  ep02     # 一次打包，逐条渲染 mp4 和封面 png
.venv/bin/python scripts/studio.py package ep02     # 混入音轨、导出字幕和封面 jpg
.venv/bin/python scripts/studio.py qa      ep02     # 响度、闪帧、黑场、联系表 → out/ep02/_qa/
```

看 `out/ep02/_qa/report.md` 和每条的联系表，全部通过再发布。发布节奏见 `docs/08-content-plan.md`。

## 收尾清单

- [ ] 事实清单每条有出处；简介里写明“AI 配音 / AI 生成插画”
- [ ] `npm run typecheck` 通过；关键时刻静帧逐张看过
- [ ] 混音指标达标；`qa` 全部通过
- [ ] 封面三种比例都看过（文字不出安全区、不被平台 UI 挡住）
- [ ] 新踩的坑写进 `docs/07-lessons.md`
