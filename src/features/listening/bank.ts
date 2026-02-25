import { getGrammarByLevel } from '../../data/grammars';
import { LEXICONS } from '../../data/lexicons';
import { BankLevel, ListeningQuestionItem, ListeningQuestionType, Word } from '../../types';
import { sample, shuffle } from '../../utils/random';

export type LocalListeningQuestionType = Exclude<ListeningQuestionType, 'ai_passage'>;

function getWordsByLevel(level: BankLevel): Word[] {
  const lexicon = LEXICONS.find((item) => item.id === level);
  return (lexicon?.words ?? []) as Word[];
}

function normalizeMeaning(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function displayJa(word: Word) {
  const kanji = String(word.kanji ?? '').trim();
  return kanji || String(word.kana ?? '').trim();
}

function stripInlineMarkup(text: string) {
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function buildMcqOptions(answer: string, pool: string[], count = 4): string[] {
  const cleanAnswer = normalizeMeaning(answer);
  if (!cleanAnswer) return [];
  const candidates = Array.from(new Set(pool.map((item) => normalizeMeaning(item)).filter(Boolean))).filter(
    (item) => item !== cleanAnswer
  );
  const picked = sample(candidates, Math.max(0, count - 1));
  const options = shuffle([cleanAnswer, ...picked]).slice(0, count);
  return options.length === count ? options : [];
}

function pickTargets<T>(pool: T[], count: number): T[] {
  if (pool.length === 0 || count <= 0) return [];
  if (pool.length >= count) return pool.slice(0, count);
  return Array.from({ length: count }, (_, index) => pool[index % pool.length]);
}

function collectSentencePool(level: BankLevel) {
  const words = getWordsByLevel(level);
  const grammarPoints = getGrammarByLevel(level);
  const fromWords = words.flatMap((word) =>
    (word.examples ?? [])
      .map((example) => String(example?.ja ?? example?.ja_furigana ?? '').trim())
      .map(stripInlineMarkup)
      .filter(Boolean)
  );
  const fromGrammars = grammarPoints.flatMap((grammar) =>
    (grammar.examples ?? [])
      .map((example) => String(example?.ja ?? '').trim())
      .map(stripInlineMarkup)
      .filter(Boolean)
  );
  const merged = Array.from(new Set([...fromWords, ...fromGrammars]));
  return merged.filter((text) => text.length >= 6 && text.length <= 90);
}

export function buildListeningWordMeaningItems(level: BankLevel, count: number): ListeningQuestionItem[] {
  const source = getWordsByLevel(level).filter((word) => {
    const kana = String(word.kana ?? '').trim();
    const meaning = normalizeMeaning(String(word.meaning_cn ?? ''));
    return Boolean(kana && meaning);
  });
  if (!source.length) return [];

  const shuffled = shuffle(source);
  const targets = pickTargets(shuffled, count);
  const allMeanings = source.map((word) => normalizeMeaning(String(word.meaning_cn ?? ''))).filter(Boolean);

  return targets
    .map((target, index) => {
      const answer = normalizeMeaning(String(target.meaning_cn ?? ''));
      const targetPos = String(target.pos ?? '').trim();
      const posCandidates =
        targetPos.length > 0
          ? source
              .filter((word) => word.id !== target.id && String(word.pos ?? '').trim() === targetPos)
              .map((word) => normalizeMeaning(String(word.meaning_cn ?? '')))
          : [];
      const options = buildMcqOptions(answer, [...posCandidates, ...allMeanings], 4);
      if (!options.length) return null;
      return {
        id: `listen-word-${level}-${index + 1}`,
        type: 'word_meaning',
        audioText: String(target.kana ?? '').trim(),
        prompt: '听单词，选择正确释义',
        options,
        answer,
        displayJa: displayJa(target),
      } satisfies ListeningQuestionItem;
    })
    .filter(Boolean) as ListeningQuestionItem[];
}

export function buildListeningSentenceSpellingItems(level: BankLevel, count: number): ListeningQuestionItem[] {
  const pool = collectSentencePool(level);
  if (!pool.length) return [];
  const targets = pickTargets(shuffle(pool), count);

  return targets.map((sentence, index) => ({
    id: `listen-sentence-${level}-${index + 1}`,
    type: 'sentence_spelling',
    audioText: sentence,
    prompt: '听句子并输入你听到的内容',
    answer: sentence,
  }));
}

export function buildLocalListeningItems(params: {
  level: BankLevel;
  type: LocalListeningQuestionType;
  count: number;
}): ListeningQuestionItem[] {
  if (params.type === 'word_meaning') {
    return buildListeningWordMeaningItems(params.level, params.count);
  }
  return buildListeningSentenceSpellingItems(params.level, params.count);
}

export function normalizeListeningSpellingAnswer(text: string) {
  return String(text ?? '')
    .trim()
    .replace(/[ \t\r\n\u3000]/g, '')
    .replace(
      /[\u3002\uFF0E\u3001\uFF0C,!?\uFF01\uFF1F\u300C\u300D\u300E\u300F\uFF08\uFF09()\[\]\u3010\u3011\u30FB\u2026\u2025:\uFF1A;\uFF1B]/g,
      ''
    );
}
