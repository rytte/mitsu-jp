# 日语单词背诵 App（React Native + Expo）具体方案

## 摘要
面向 JLPT N5–N1 学习者的离线闯关刷题应用。采用关卡制 + 题型组合（选择题/拼写/听写），内置静态词库包与本地进度存储，提供日语 TTS 发音与错题强化。首版目标：完整离线可用、基础学习闭环（学习→测验→复习→统计）。

## 目标与成功标准
- 目标：用户可在离线情况下完成词汇学习、测验与进度跟踪。
- 成功标准：
  - 关卡学习流程可用：选级别 → 关卡列表 → 闯关 → 结算 → 进入下一关。
  - TTS 读音可播放（日语）。
  - 题型组合覆盖：选择题/拼写/听写。
  - 词库完整覆盖 JLPT N5–N1，并可按级别筛选。

## 范围与非目标
- 范围：离线词库、关卡机制、学习/测验、错题本、基础统计。
- 非目标：账号系统、云同步、社交功能、在线词库更新。

## 架构设计
- 技术栈：React Native + Expo + TypeScript
- 状态管理：Zustand（轻量、易扩展）
- 本地存储：SQLite（expo-sqlite）用于词库、进度与设置；Web 端使用 localStorage 保存设置与进度
- TTS：expo-speech（优先系统 TTS）
- 题目生成：本地算法生成题目，基于词库与错误率

## 数据模型（SQLite）
- `words`  
  - `id` (PK), `level` (N5–N1), `kana`, `kanji`, `meaning_cn`, `meaning_en`, `pos`, `example`, `example_cn`, `tags`
- `stages`  
  - `id` (PK), `level`, `index`, `word_ids` (json list)
- `progress`  
  - `id` (PK), `stage_id`, `correct_count`, `wrong_count`, `last_played_at`, `stars`
- `mistakes`  
  - `id` (PK), `word_id`, `wrong_times`, `last_wrong_at`
- `settings`  
  - `id` (PK), `tts_rate`, `tts_voice`, `quiz_mix`, `meaning_language`, `compact_mode`, `lexicon_level`

## 功能模块
1. **词库与关卡**
   - N5–N1 每级别划分固定关卡（例如每关 20 词）
   - 关卡解锁机制：上一关 ≥2 星解锁下一关
   - 词库选择：N1–N5 作为“词库”，可设置默认词库并自动进入

2. **闯关测验**
   - 题型组合：
     - 选择题：给中文选日语/给日语选中文
     - 拼写题：日语假名输入（软键盘或选字拼写）
     - 听写题：TTS 播放 → 选/输答案
   - 题目生成策略：
     - 70% 当前关词汇
     - 20% 本级别错题
     - 10% 随机关卡复习词

3. **错题本**
   - 错题收集与标记
   - 独立复习入口
   - 错题自动插入后续关卡

4. **统计与激励**
   - 每日学习时长、答题正确率、连续天数
   - 关卡星级系统（1–3星）

5. **发音**
   - TTS 播放单词与例句
   - 可调语速（settings）
6. **词汇预览**
   - 紧凑模式开关（可保存设置）
   - 紧凑模式下点击词条展开/收起释义

## 关键界面（MVP）
- 启动页 / 级别选择页（N5–N1）
- 关卡列表页
- 闯关测验页
- 结算页
- 错题本
- 设置页（TTS、题型占比）
 - 词汇预览页：紧凑模式与展开/收起

## 重要接口/类型变更
- 新增数据初始化脚本：把静态词库 JSON 导入 SQLite
- 统一词库结构 `Word` 类型：
  ```ts
  type Word = {
    id: string;
    level: "N5"|"N4"|"N3"|"N2"|"N1";
    kana: string;
    kanji?: string;
    meaning_cn: string;
    meaning_en: string;
    pos?: string;
    example?: string;
    example_cn?: string;
    tags?: string[];
  };
  ```
 - 设置结构新增字段：
  ```ts
  type Settings = {
    tts_rate: number;
    tts_voice: string | null;
    quiz_mix: QuizMix;
    meaning_language: "zh" | "en";
    compact_mode: boolean;
    lexicon_level: "N5"|"N4"|"N3"|"N2"|"N1";
  };
  ```
- 题目结构：
  ```ts
  type QuizItem =
    | { type: "mcq_ja_to_cn"; prompt: string; options: string[]; answer: string }
    | { type: "mcq_cn_to_ja"; prompt: string; options: string[]; answer: string }
    | { type: "spelling"; prompt: string; answer: string }
    | { type: "listening"; audioText: string; answer: string };
  ```

## 测试与验收
- 单元测试（逻辑层）：
  - 题目生成算法：比例与内容正确
  - 错题回插规则：错题出现概率符合预期
- 集成测试：
  - 关卡闯关流程（进入 → 作答 → 结算 → 解锁）
  - TTS 播放是否正常（降级到无声提示）
- 手工验收：
  - 离线模式关闭网络仍可正常使用
  - N5–N1 关卡可遍历

## 交付步骤（实施顺序）
1. 初始化 Expo + TS + 基础路由
2. 导入静态词库 JSON → SQLite
3. 搭建关卡列表与进度表
4. 实现题目生成逻辑
5. 构建闯关测验 UI
6. 接入 TTS + 设置
7. 错题本与统计页
8. 测试与体验优化

## 假设与默认选择
- 采用系统 TTS（expo-speech），不集成真人录音
- 首版不做账号与云同步
- 词库以静态内置包随版本更新
 - 词库中文释义来自开源词库合并（详见 SOURCES.md）

