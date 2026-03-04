import { Level } from '../types';

export type LevelMeta = {
  tag: string;
  hint: string;
  accent: string;
  soft: string;
};

type LevelTheme = Omit<LevelMeta, 'hint'>;
type LevelHints = Record<Level, string>;

const JLPT_LEVEL_THEME: Record<Level, LevelTheme> = {
  N5: { tag: '入门', accent: '#0f766e', soft: '#ccfbf1' },
  N4: { tag: '基础', accent: '#2563eb', soft: '#dbeafe' },
  N3: { tag: '进阶', accent: '#7c3aed', soft: '#ede9fe' },
  N2: { tag: '强化', accent: '#db2777', soft: '#fce7f3' },
  N1: { tag: '高阶', accent: '#b45309', soft: '#fef3c7' },
};

const WORD_LEVEL_HINTS: LevelHints = {
  N5: '高频基础词与核心场景词',
  N4: '生活会话与常见表达扩展',
  N3: '中级阅读与听力常用词',
  N2: '书面表达与应试高频词',
  N1: '抽象语义与高级表达词汇',
};

const GRAMMAR_LEVEL_HINTS: LevelHints = {
  N5: '基础句型与核心表达',
  N4: '连接表达与常见口语结构',
  N3: '中级语法与书面表达',
  N2: '抽象表达与新闻场景',
  N1: '细微语感与高难度语境',
};

function createLevelMetaMap(hints: LevelHints): Record<Level, LevelMeta> {
  return {
    N5: { ...JLPT_LEVEL_THEME.N5, hint: hints.N5 },
    N4: { ...JLPT_LEVEL_THEME.N4, hint: hints.N4 },
    N3: { ...JLPT_LEVEL_THEME.N3, hint: hints.N3 },
    N2: { ...JLPT_LEVEL_THEME.N2, hint: hints.N2 },
    N1: { ...JLPT_LEVEL_THEME.N1, hint: hints.N1 },
  };
}

const WORD_LEVEL_META = createLevelMetaMap(WORD_LEVEL_HINTS);
const GRAMMAR_LEVEL_META = createLevelMetaMap(GRAMMAR_LEVEL_HINTS);

export function getWordLevelMeta(level: string): LevelMeta {
  return (
    WORD_LEVEL_META[level as Level] ?? {
      tag: '词汇',
      hint: '按等级组织的词汇内容',
      accent: '#0f766e',
      soft: '#ccfbf1',
    }
  );
}

export function getGrammarLevelMeta(level: string): LevelMeta {
  return (
    GRAMMAR_LEVEL_META[level as Level] ?? {
      tag: '文法',
      hint: '按等级组织的文法条目',
      accent: '#2563eb',
      soft: '#dbeafe',
    }
  );
}
