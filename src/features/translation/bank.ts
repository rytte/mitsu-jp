import { getGrammarByLevel } from '../../data/grammars';
import { getAllWordsByLevel } from '../../db/queries';
import { sample, shuffle } from '../../utils/random';
import { BankLevel, TranslationDirection, TranslationFocus, Word } from '../../types';

export type TranslationPracticeItem = {
  id: string;
  level: BankLevel;
  direction: TranslationDirection;
  focus: TranslationFocus;
  sourceText: string;
  referenceAnswer: string;
  hint?: string;
  sourceRef?: string;
};

const DEFAULT_COUNT = 10;

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
};

function stripHtml(text: string) {
  let result = text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  for (const [entity, value] of Object.entries(ENTITY_MAP)) {
    result = result.split(entity).join(value);
  }
  return result;
}

function stripBracketFurigana(text: string) {
  return text.replace(/([^\s\[\]]+)\[[^\]]+\]/g, '$1').replace(/\[[^\]]+\]/g, '');
}

function normalizeJapaneseText(text: string) {
  return stripBracketFurigana(stripHtml(text)).replace(/[\u3000\s]+/g, '').trim();
}

function normalizeChineseText(text: string) {
  return stripBracketFurigana(stripHtml(text))
    .replace(/\r/g, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t\u3000]+/g, ' ')
    .trim();
}

function isLikelyJapaneseSentence(text: string) {
  if (text.length < 3 || text.length > 140) return false;
  if (!/[\u3040-\u30ff\u3400-\u9fff]/.test(text)) return false;
  const dotCount = (text.match(/・/g) ?? []).length;
  return dotCount < 3;
}

function isLikelyChineseSentence(text: string) {
  if (text.length < 2 || text.length > 140) return false;
  if (!/[\u4e00-\u9fff]/.test(text)) return false;
  const dotCount = (text.match(/・/g) ?? []).length;
  return dotCount < 3;
}

function buildWordHint(word: Word) {
  const head = word.kanji ? `${word.kanji}（${word.kana}）` : word.kana;
  const meaning = String(word.meaning_cn ?? '').trim();
  return meaning ? `词汇提示：${head}｜${meaning}` : `词汇提示：${head}`;
}

function sanitizePattern(raw: string) {
  return normalizeJapaneseText(raw).replace(/^\u301c+|\u301c+$/g, '');
}

function dedupeItems(items: TranslationPracticeItem[]) {
  const seen = new Set<string>();
  const result: TranslationPracticeItem[] = [];
  for (const item of items) {
    const key = `${item.direction}||${item.sourceText}||${item.referenceAnswer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

async function buildWordItems(level: BankLevel, direction: TranslationDirection) {
  const words = await getAllWordsByLevel(level);
  const items: TranslationPracticeItem[] = [];

  for (const word of words) {
    if (!Array.isArray(word.examples) || word.examples.length === 0) continue;
    for (let i = 0; i < word.examples.length; i += 1) {
      const example = word.examples[i];
      const ja = normalizeJapaneseText(String(example?.ja ?? ''));
      const zh = normalizeChineseText(String(example?.zh_cn ?? ''));
      if (!isLikelyJapaneseSentence(ja) || !isLikelyChineseSentence(zh)) continue;

      items.push({
        id: `tr-word-${level}-${word.id}-${i + 1}-${direction}`,
        level,
        direction,
        focus: 'vocab',
        sourceText: direction === 'zh_to_ja' ? zh : ja,
        referenceAnswer: direction === 'zh_to_ja' ? ja : zh,
        hint: buildWordHint(word),
        sourceRef: `word:${word.id}`,
      });
    }
  }

  return dedupeItems(items);
}

function buildGrammarItems(level: BankLevel, direction: TranslationDirection) {
  const grammars = getGrammarByLevel(level);
  const items: TranslationPracticeItem[] = [];

  for (const grammar of grammars) {
    if (!Array.isArray(grammar.examples) || grammar.examples.length === 0) continue;
    const pattern = sanitizePattern(String(grammar.pattern ?? ''));
    const meaning = normalizeChineseText(String(grammar.meaning_cn ?? ''));
    const hint = meaning ? `文法提示：${pattern}｜${meaning}` : `文法提示：${pattern}`;

    for (let i = 0; i < grammar.examples.length; i += 1) {
      const example = grammar.examples[i];
      const ja = normalizeJapaneseText(String(example?.ja ?? ''));
      const zh = normalizeChineseText(String(example?.zh ?? ''));
      if (!isLikelyJapaneseSentence(ja) || !isLikelyChineseSentence(zh)) continue;

      items.push({
        id: `tr-grammar-${level}-${grammar.id}-${i + 1}-${direction}`,
        level,
        direction,
        focus: 'grammar',
        sourceText: direction === 'zh_to_ja' ? zh : ja,
        referenceAnswer: direction === 'zh_to_ja' ? ja : zh,
        hint,
        sourceRef: `grammar:${grammar.id}`,
      });
    }
  }

  return dedupeItems(items);
}

export async function generateTranslationPracticeItems(params: {
  level: BankLevel;
  direction: TranslationDirection;
  focus: TranslationFocus;
  count?: number;
}) {
  const count = Math.max(1, params.count ?? DEFAULT_COUNT);
  const wordItems = await buildWordItems(params.level, params.direction);
  const grammarItems = buildGrammarItems(params.level, params.direction);

  let selected: TranslationPracticeItem[] = [];

  if (params.direction === 'zh_to_ja' && params.focus === 'vocab') {
    selected = sample(wordItems, count);
  } else if (params.direction === 'zh_to_ja' && params.focus === 'grammar') {
    selected = sample(grammarItems, count);
  } else {
    selected = sample(shuffle([...wordItems, ...grammarItems]), count);
  }

  if (selected.length < count) {
    throw new Error(`可用翻译训练内容不足：仅找到 ${selected.length} 题，请调整等级或方向后重试`);
  }

  return selected.slice(0, count);
}
