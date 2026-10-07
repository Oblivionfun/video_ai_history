# 跟着地图读历史 · 视频工作室

真实卫星地图 + 路线动画 + AI 配音 + 程序化配乐，一套数据产出横版长片、竖版短片、横版短片、竖版中长片、三种比例的封面、字幕和各平台发布文案。

第一期《玄奘西行 629—645》的全部成片在 `out/ep01/`，每个文件夹对应一个平台用途，`out/ep01/发布清单.md` 是首发周排期和文案。

## 安装

```bash
brew install ffmpeg uv node
uv venv --python 3.12 .venv && uv pip install -r requirements.txt --python .venv/bin/python
cd video && npm ci && cd ..
.venv/bin/python scripts/fetch_tiles.py        # 地图瓦片，约 342 MB
cp .env.example .env                           # 用豆包等付费配音时再填
```

## 出片

```bash
.venv/bin/python scripts/studio.py all ep01    # 配音 → 时间线 → 配乐 → 渲染 → 打包 → 质检
```

单步命令、预览和静帧见 `AGENTS.md`。

## 做下一期

按 `docs/09-new-episode.md` 走：写路线文件 → 生成插画 → 写 cut JSON（解说 + 镜头 + 卡片 + 配乐）→ 配音 → 出静帧检查 → 渲染打包质检。选题和发布日历在 `docs/08-content-plan.md`。

## 文档

| 文件 | 内容 |
|---|---|
| `AGENTS.md` | 总入口：命令、质量红线、改哪里、约定 |
| `docs/01-pipeline.md` | 流水线、代码地图、资源清单、性能 |
| `docs/02-cut-json.md` | cut JSON 字段规范 |
| `docs/03-style-guide.md` | 视觉风格、插画提示词 |
| `docs/04-audio.md` | 配音服务、发音词典、混音标准 |
| `docs/05-compliance-qa.md` | 合规红线、发布前质检 |
| `docs/06-platforms.md` | 各平台规格与运营要点 |
| `docs/07-lessons.md` | 踩坑记录 |
| `docs/08-content-plan.md` | 后 10 期选题与发布日历 |
| `docs/09-new-episode.md` | 做新一期的完整步骤 |
