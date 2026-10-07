# 04 · 配音、配乐与混音

## 配音（`scripts/tts.py`）

- 一句一个文件，缓存在 `data/tts/<ep>/<cut>/`。只有文本、提供方或音色参数变化的句子才会重新合成。
- 每个提供方都输出**逐字时间**（`ct`），时间轴、字幕和画面锚点因此与具体用哪家配音无关。
- 切换提供方：在 `.env` 填 key，在 `config/voices.json` 填音色，然后
  `python scripts/studio.py voice ep01 --provider doubao --force` → `timeline` → `score` → `render` → `package`。

| provider | 用途 | 需要 | 逐字时间 | 发音控制 |
|---|---|---|---|---|
| `edge` | 当前默认，免费 | 无 | WordBoundary | 等长同音字替换（`pronunciations.json` 的 `edge` 字段） |
| `doubao` | **推荐的正式旁白**（中文榜第一） | `VOLC_API_KEY` + `voices.json` 里的 2.0 音色 id | `enable_subtitle` 字级 | `原词/(pin1)(yin1)` 词典，自动生成 |
| `doubao_clone` | 用你自己的声音 | 控制台完成声音复刻，填 `speaker` / `model` | 同上 | 同上 |
| `azure` | 官方渠道的云健 + 纪录片风格 | `AZURE_SPEECH_KEY`、`pip install azure-cognitiveservices-speech` | WordBoundary | SAPI 拼音 `<phoneme>` |
| `minimax` | 备选（读字准确） | `MINIMAX_API_KEY` + `voice_id` | 字幕文件 | `原词/(pin1)` 词典 |

`doubao`、`azure`、`minimax` 的代码按官方文档写好，但在拿到 key 之前没有实测过。第一次接入时先合成一句（`--only h1`），检查音频和 `meta.json` 里的 `ct`。

### 发音词典

`config/pronunciations.json` 是唯一的读音表：

```json
{"word": "莫贺延碛", "pinyin": "mo4 he4 yan2 qi4", "edge": "莫贺延砌"}
```

- `pinyin` 用数字声调，供豆包/MiniMax/Azure 使用。
- `edge` 是给 edge-tts 的**等长**同音字（长度必须一致，否则字幕错位）。
- 新词：通听成片时发现读错，加一条，重跑 `voice`。

### 语速

纪录片长片 `-6%`；竖版短片 `-2%`～`-3%`（短视频节奏更快）。

## 配乐与音效（`scripts/score.py`）

- 全部程序化合成：五声音阶古筝式拨弦、垫音、钟、鼓、风沙、雷、水、印章、纸张撕裂等，没有采样，版权干净。
- 长片的段落与音效点写在 `scripts/events.py`（镜像 `director.ts`）；cut 的段落与音效点写在 cut JSON 的 `audio` 字段。
- 情绪（`mood`）：`mystery title regal journey desert warm fire cold loss tension silence storm release sacred sacred_big journey_fast grand battle melancholy bittersweet cold_journey build triumph reflect finale coldopen outro`。
- 音效点（`kind`）：`boom hit bell toll whoosh tear stamp seals gliss roar thunder water wind plate`，含义见 `docs/02-cut-json.md`。
- `fx` 里的 `sand` / `snow` 时间段会自动加风声。
- 合成很慢的部分会缓存成分轨 `data/audio/<ep>/<cut>/stem_*.npy`；只改混音参数时加 `--remix`。

## 混音验收标准

| 指标 | 长片 | 短片 |
|---|---|---|
| 整体响度（EBU R128） | -15 LUFS | -14.5 LUFS |
| 真峰值 | ≤ -1.2 dBTP | ≤ -1.2 dBTP |
| 每句解说比背景高 | ≥ 14 LU（目标 15） | 同左 |
| 1–4 kHz 语音频段被遮挡（<6 dB）的比例 | < 2% | < 2% |
| 段间音乐短期响度 | ≤ 解说 +1 LU（标题时刻 +3 LU） | 同左 |

做法：整句闪避（不在字间抽吸）→ 解说时把配乐的 1.2–4.5 kHz 挖掉约 4 dB → 音效和点缀音的瞬时响度压在解说下 8 LU → 逐句自动推子把背景压到解说下 15 LU → 段间配乐限幅 → 4 倍过采样的真峰值限幅器。`score.py` 每次都会打印这些指标，不达标就改参数重混。

纯音乐版另出一条（-16 LUFS），给不需要解说的场景用。
