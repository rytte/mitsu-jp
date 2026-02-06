# 词汇部分方案

## 目标
- 建立完整的词汇学习闭环：学习 → 闯关 → 错题 → 复习。
- 支持 N5–N1 离线词库与进度保存。

## 数据模型（SQLite）
- `words`
  - `id` (PK), `level`, `kana`, `kanji`, `meaning_cn`, `meaning_en`, `pos`, `pitch`, `examples` (json), `tags` (json)
- `stages`
  - `id` (PK), `level`, `index`, `word_ids` (json)
- `progress`
  - `id` (PK), `stage_id`, `correct_count`, `wrong_count`, `last_played_at`, `stars`
- `mistakes`
  - `id` (PK), `word_id`, `wrong_times`, `last_wrong_at`
- `settings`
  - `tts_rate`, `tts_voice`, `quiz_mix`, `mcq_modes`, `meaning_language`, `compact_mode`, `compact_single_expand`, `lexicon_level`, `font_scale`, `lexicon_version`

## 词库与关卡
- N5–N1 每级别划分固定关卡（如每关 20 词）。
- 解锁机制：上一关 ≥2 星解锁下一关。
- 关卡分区：每 10 关为一区。
- 关卡列表页提供“本区词汇”入口。

## 闯关测验
- 题型组合：
  - 选择题：日→中 / 中→日
  - 拼写题：假名输入
  - 听写题：TTS 播放 → 输入/选择
- 题目生成：每关词汇全覆盖（每词一题）。

## 错题与复习
- 错题自动记录。
- 错题可插入后续关卡或独立复习。

## 词汇预览与展示
- 紧凑模式开关。
- 紧凑模式支持点击展开。
- 字号支持三档。
- 词性/音调/标签展示，例句区域卡片化。

## 统计与激励
- 每日学习时长、正确率、连续天数。
- 关卡星级系统（1–3 星）。

## 测试与验收
- 单元测试：题目生成算法、错题回插规则。
- 集成测试：关卡流程、TTS 播放。
- 手工验收：离线可用、关卡可遍历。
