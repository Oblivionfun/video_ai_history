# 03 · 风格规范

“高级感”主要来自克制和一致，而不是特效堆叠。新一期照这份规范做，观众一眼能认出是同一个系列。

## 视觉语法：史 vs 戏

| | 史（历史） | 戏（小说 / 神话 / 诗文） |
|---|---|---|
| 标记 | 金色描边方块“史” | 朱红实心方块“戏” |
| 插画风格 | 唐宋工笔、绢本设色、做旧裂纹，矿物颜料（石青、石绿、赭石） | 电影剧照质感（35mm、宽银幕、戏剧性光线） |
| 卡片画框 | 米黄纸框 | 细金线框 |
| 在地图上 | 金色地点菱形 + 竖排宋体地名 | 朱红故事钉“小说名 · 真实地名” |

每一个“原型说”都要用“有学者认为”“一般认为”“一说”这类措辞，并用故事钉把小说情节钉在真实地点上。

## 配色（`video/src/theme.ts`）

纸色 `#f2e8d2`（正文）、金 `#e6c47e` / 亮金 `#f8dfa2`（标签、强调）、朱砂 `#c6402b`（印章、小说、警示）。路线：去程金 `#f6d58e`，归程朱红 `#ff8a62`。除此之外不加新颜色。

## 字体

- 标题、片名、引文：马善政毛笔楷（Ma Shan Zheng）
- 正文、地名、字幕：思源宋体（Noto Serif SC），字重 500–900
- 拉丁文：Cormorant Garamond
- 竖排地名必须 `white-space: nowrap`

## 地图

- 底图：NASA Blue Marble + 地形高程（夸张 1.65 倍），暖色 soft-light 调色 + 天空雾化。
- 只画地形、河流、路线、古地名；**不画国界、不填疆域色块**。
- 近景 zoom ≤ 8.4、pitch ≤ 60（影像最高 z8，再近会发糊）；全景 zoom 4.2–4.5。
- 路线随解说“生长”，行进中有发光的行者光点；到站时地点标签弹出。

## 运动与节奏

- 镜头慢而稳：关键帧之间用单调样条插值，不要线性匀速，也不要频繁甩镜。硬切只用在冷开场和段落转换，并配白闪 + 鼓点。
- 卡片入场 0.6–0.8 秒（上移 + 去模糊），出场 0.45–0.55 秒。
- 插画用水墨晕染揭示 + 轻微推拉（Ken Burns）。
- 全片统一叠胶片颗粒、暗角、浮尘。

## 开头与结尾（每期必须有）

- **前 5 秒**：问题式钩子 + 最强画面（冷开场：几处“小说地名 → 真实地名”的快切，再拉到全路线）。
- **结尾**：片名 + 鸣谢 → 下期预告卡（下一期插画 + 标题）+ “关注 · 跟着地图读历史 · 每周五更新”。频道名、口号改 `video/src/config/brand.json`；下期预告改本期 `episode.json` 的 `next`。

## 字幕

- 横版 42–46px 宋体 600，底部居中；竖版 58px 宋体 700，底边约 y 1450。
- 引号内文字用亮金色；标点换成空格；单条不超过 21 字（横版）/ 14 字（竖版）。

## 封面

- 一个画面 + 一个大标题 + 一枚印章；标题 2–4 个大字为主，缩到 400 像素宽仍清楚。
- 横版：地图全路线 + 右侧标题区；竖版/3:4：标题在上、地图在下。
- 封面文字要和视频钩子一致。

## 文案

- 解说是讲故事，不是念百科：短句、具体的人和事、一个画面一句话。
- 引用原文时用一手史料原句（《慈恩传》《大唐西域记》等），并标明出处。
- 数字要准；拿不准的写“约”“前后”“一说”。
- 结尾一句收束全片主题（例：“从玄奘到唐僧，从一个人的西行，到一个民族的神话”）。

## 插画提示词模板

历史：

> Classical Chinese gongbi painting on aged, finely cracked silk, Tang dynasty style, cinematic wide composition. [场景与人物、动作、环境、光线]. Muted mineral pigments (azurite, malachite, ochre, lead white), delicate ink outlines, gentle washes, elegant negative space. No text, no seals, no calligraphy, no watermark, no border.

小说 / 神话：

> Cinematic 35mm anamorphic film still, [场景], dramatic lighting, rich color grading, shallow depth of field, epic Chinese fantasy production design, no text, no watermark.

生成后用 `scripts/upscale.py` 放大到 2560×1440，文件放 `video/public/img/` 和 `img2x/`。同一人物在多张图里出现时，先生成一张角色设定图，再把它作为参考图（`reference_image_paths`）生成其余画面，保证脸和服饰一致。
