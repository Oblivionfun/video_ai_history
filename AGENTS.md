# 地图历史纪录片工作室

这个目录是一条自动化的视频生产线：真实卫星地图 + 路线动画 + AI 配音 + 程序化配乐，把历史人物的行程做成横版长片、竖版短片等多个版本，发到 B站、抖音、视频号、小红书、YouTube。频道定位“跟着地图读历史”，每期都是“史 × 戏”：真实历史对照文学和传说（例：玄奘真实路线 ↔ 《西游记》）。

- 第一期 **ep01 玄奘西行** 已完成，成片在 `out/ep01/`，数据在 `video/src/cuts/ep01/`。
- **日更**：每周五一部横版长片，其余六天发同一期拆出来的竖版短片，周四发下一期预告。每期 9 条成片，排期和后 10 期选题在 `docs/08-content-plan.md`。
- 账号名“小山河司马”，口号“跟着地图读历史”（`video/src/config/brand.json`）。

## 新对话先做这三件事

1. 要做新一期 → 读 `docs/09-new-episode.md`；要改引擎 → 读 `docs/01-pipeline.md`。
2. 读 `docs/07-lessons.md`（踩过的坑，改相关代码前必看）。
3. 看进度：`.venv/bin/python scripts/studio.py list <ep>`。

## 常用命令（在本目录执行）

```bash
.venv/bin/python scripts/studio.py list     ep01
.venv/bin/python scripts/studio.py voice    ep01 [--cut s1-toudu] [--provider doubao] [--force]
.venv/bin/python scripts/studio.py timeline ep01 [--cut s1-toudu]
.venv/bin/python scripts/studio.py score    ep01 [--cut s1-toudu] [--remix]
.venv/bin/python scripts/studio.py render   ep01 [--only main,s1] [--covers-only]
.venv/bin/python scripts/studio.py package  ep01 [--only main,s1]
.venv/bin/python scripts/studio.py qa       ep01 [--only main,s1]
cd video && npm run typecheck                                  # 改 TS 后
cd video && node scripts/stills.mjs --comp ep01-s1-toudu-v 2 8 15   # 静帧 → out/stills/
cd video && npm run studio                                     # 交互预览
```

## 质量红线（不达标不交付）

- **史实**：每条事实有出处；有争议写“一说”；不编造引文。小说情节一律标“戏”，史实标“史”。
- **合规**：不画任何现代国界或行政区划；简介注明 AI 配音 / AI 生成插画；不魔改经典人物形象（详见 `docs/05-compliance-qa.md`）。
- **开头**：前 5 秒必须出钩子（问题 + 最强画面），不能黑场或慢热。
- **画面**：竖版文字在 x 80–940、y 150–1440 内；地图近景 zoom ≤ 8.4；关键时刻都出静帧逐张看过。
- **声音**：长片 −15 LUFS、短片 −14.5 LUFS，真峰 ≤ −1.2 dBTP，每句解说比背景高 ≥ 14 LU（`docs/04-audio.md`）。
- **读音**：古地名、多音字进 `config/pronunciations.json`，通听一遍再交付。
- 每条成片过 `studio.py qa`，看 `out/<ep>/_qa/` 的报告和联系表。

## 想做什么 → 改哪里

| 任务 | 位置 |
|---|---|
| 新一期的解说、镜头、卡片、配乐 | `video/src/cuts/<ep>/*.cut.json`（规范：`docs/02-cut-json.md`） |
| 新一期的路线 | `video/src/episodes/<ep>/route.ts` + 在 `episodes/index.ts` 注册 |
| 片尾大字、印章、下期预告、交付清单 | `video/src/cuts/<ep>/episode.json` |
| 频道名、口号、更新频率 | `video/src/config/brand.json` |
| 频道头像 | `video/src/brand/Avatar.tsx`，**选定 `Avatar-brushBold`**（书法“山河” + 小印“司马” + 金色路线）；导出：`cd video && node scripts/render.mjs --out ../out/brand Avatar-brushBold`。其余方案 `Avatar-seal4`、`Avatar-seal2`、`Avatar-brush` 和工笔人物图 `video/public/img/brand_xiaosima.jpg` 留作备选 |
| 配音服务与音色 | `config/voices.json`，密钥放 `.env`（模板 `.env.example`） |
| 读音 | `config/pronunciations.json` |
| 视觉风格、配色、字体、插画提示词 | `docs/03-style-guide.md`、`video/src/theme.ts` |
| 各平台规格、账号资料（头像、签名）与发布文案 | `docs/06-platforms.md`、`docs/publish/<ep>-*.md` |
| 地图覆盖范围、河流 | `scripts/fetch_tiles.py --bbox`、`scripts/extract_rivers.py` |

## 约定

- **内容是数据**：做新一期只加 JSON、路线文件和插画，不改引擎。必须改引擎时，保证 ep01 的输出不变（改前改后对比同一时刻的静帧）。
- ep01 长片的专用代码（`Film.tsx`、`director.ts`、`data/cards.ts`、`ui/ColdOpen.tsx`、`scripts/events.py`）只修 bug，不在上面加新功能；新一期的长片写成 `main.cut.json`。
- 改了解说文字必须重跑 `voice → timeline`；只改画面字段不需要。
- 渲染开始时就把源码打包了：渲染过程中改的代码不会进入这批成片，改完要重渲受影响的条目。
- 渲染、配乐合成这类重任务串行跑；机器忙时 `render.mjs --concurrency 3`。
- 密钥只放 `.env`（已在 `.gitignore`），不写进任何 JSON、代码或文档。
- 代码风格跟随周边代码；注释只写代码本身表达不了的约束。
- 新踩的坑写进 `docs/07-lessons.md`，新规范写进对应的 docs 文件。

## 配音服务现状

- `doubao`（**默认**，2026-10-07 实测可用）：豆包语音合成 2.0，音色“磁性解说男”，逐字时间戳和发音词典都生效。豆包句内停顿偏长，`tts.py` 会按 `max_pause` 压缩（长片 0.38 秒、短片 0.30 秒），只删静音和换气，逐字时间同步前移。原始返回缓存在 `data/tts/<ep>/<cut>/raw/`，只调后处理参数不会重复计费。
- `edge`：免费备用，发音靠等长同音字替换。
- `doubao_clone`（声音复刻）、`azure`、`minimax`：已按官方文档接好，**还没用真实 key 测过**。第一次使用先合成一句（`scripts/tts.py <cut.json> --provider doubao --only h1`），检查音频和 `meta.json` 里的逐字时间 `ct`。试听会覆盖这一句的缓存，确认可用后整条 cut 用同一个 provider 重跑，别让一条片子里混着两种声音。

## 仓库与可选资源

- 代码仓库：`git@github.com:Oblivionfun/video_ai_history.git`（公开仓库，`main` 分支）。提交身份只配在本仓库（`git config --local`）。推送会经过公司电脑管家的 pre-push 审计钩子，不要用 `--no-verify` 绕过。
- 可选：声音复刻（`doubao_clone`，需要 30 秒本人录音）、Azure / MiniMax key、商用配乐授权、图生视频 API。

## 文档索引

`docs/01-pipeline.md` 流水线与架构 · `02-cut-json.md` cut 规范 · `03-style-guide.md` 风格 · `04-audio.md` 配音与混音 · `05-compliance-qa.md` 合规与质检 · `06-platforms.md` 平台规格 · `07-lessons.md` 踩坑记录 · `08-content-plan.md` 选题与日历 · `09-new-episode.md` 做新一期 · `publish/` 每期发布清单
