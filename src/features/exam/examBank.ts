import n1Bank from '../../data/jlpt-n1.json';
import n2Bank from '../../data/jlpt-n2.json';
import n3Bank from '../../data/jlpt-n3.json';
import n4Bank from '../../data/jlpt-n4.json';
import n5Bank from '../../data/jlpt-n5.json';
import { BankLevel, ExamQuestionType, ExamQuizItem, RawExamItem } from '../../types';

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};
const GENERIC_BLANK = '____';
const TARGET_SLOT_TOKEN = '__TARGET_SLOT__';
const TARGET_SLOT_LABEL = '__★__';
const CONVERSION_SLOT_PREFIX = '【';
const CONVERSION_SLOT_SUFFIX = '】';
const QUESTION_TYPES: ExamQuestionType[] = ['reorder_fill', 'single_blank_fill', 'kana_kanji_conversion'];

const RAW_BANKS: Record<BankLevel, unknown> = {
  N1: n1Bank,
  N2: n2Bank,
  N3: n3Bank,
  N4: n4Bank,
  N5: n5Bank,
};

const BANK_CACHE: Partial<Record<BankLevel, ExamQuizItem[]>> = {};

export const BANK_LEVELS: BankLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const SESSION_SIZE = 10;
export const WRITING_SESSION_SIZE = 3;
export const LISTENING_PASSAGE_SESSION_SIZE = 5;

function decodeHtmlEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (raw: string, entity: string) => {
    const key = entity.toLowerCase();
    if (key.startsWith('#x')) {
      const code = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : raw;
    }
    if (key.startsWith('#')) {
      const code = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : raw;
    }
    return ENTITY_MAP[key] ?? raw;
  });
}

function htmlToPlainText(html: string) {
  const stripped = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|details|summary|li)\s*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '');

  return decodeHtmlEntities(stripped)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isParenthesizedTerm(text: string) {
  return /^[(（][^()（）]+[)）]$/.test(text.trim());
}

function extractParenthesizedContent(text: string) {
  return text.trim().replace(/^[(（]\s*|\s*[)）]$/g, '');
}

function formatConversionSlot(text: string) {
  const content = extractParenthesizedContent(text);
  if (!content) return `${CONVERSION_SLOT_PREFIX}${CONVERSION_SLOT_SUFFIX}`;
  return `${CONVERSION_SLOT_PREFIX}${content}${CONVERSION_SLOT_SUFFIX}`;
}

function detectQuestionTypeFromHtml(html: string): ExamQuestionType {
  const blankCount = (html.match(/_{3,}/g) ?? []).length;
  if (blankCount >= 2) return 'reorder_fill';

  const fontRegex = /<font[^>]*#ef3461[^>]*>([\s\S]*?)<\/font>/gi;
  let match: RegExpExecArray | null = null;
  while ((match = fontRegex.exec(html))) {
    const innerPlain = htmlToPlainText(match[1])
      .replace(/\{\{c\d+::([\s\S]*?)\}\}/gi, '$1')
      .trim();
    if (isParenthesizedTerm(innerPlain)) {
      return 'kana_kanji_conversion';
    }
  }

  return 'single_blank_fill';
}

function normalizeQuestionType(rawType: unknown, html: string): ExamQuestionType {
  const raw = String(rawType ?? '').trim() as ExamQuestionType;
  if (QUESTION_TYPES.includes(raw)) {
    return raw;
  }
  return detectQuestionTypeFromHtml(html);
}

function maskPromptAnswer(html: string, questionType: ExamQuestionType) {
  const shouldShowTargetSlot = questionType === 'reorder_fill';
  const withClozeToken = html.replace(/\{\{c(\d+)::[\s\S]*?\}\}/gi, (_raw: string, clozeIndex: string) => {
    if (shouldShowTargetSlot && clozeIndex === '1') {
      return TARGET_SLOT_TOKEN;
    }
    return GENERIC_BLANK;
  });

  const withMaskedHighlight = withClozeToken.replace(/<font[^>]*#ef3461[^>]*>([\s\S]*?)<\/font>/gi, (_, inner: string) => {
    const innerPlain = htmlToPlainText(inner).trim();
    if (innerPlain.includes(TARGET_SLOT_TOKEN)) {
      if (innerPlain.startsWith('(') && innerPlain.endsWith(')')) return `(${TARGET_SLOT_TOKEN})`;
      if (innerPlain.startsWith('（') && innerPlain.endsWith('）')) return `（${TARGET_SLOT_TOKEN}）`;
      return TARGET_SLOT_TOKEN;
    }
    if (questionType === 'kana_kanji_conversion' && isParenthesizedTerm(innerPlain)) {
      return formatConversionSlot(innerPlain);
    }
    if (!innerPlain) return GENERIC_BLANK;
    if (innerPlain.startsWith('(') && innerPlain.endsWith(')')) return `(${GENERIC_BLANK})`;
    if (innerPlain.startsWith('（') && innerPlain.endsWith('）')) return `（${GENERIC_BLANK}）`;
    return GENERIC_BLANK;
  });

  if (shouldShowTargetSlot) {
    return withMaskedHighlight.replace(new RegExp(TARGET_SLOT_TOKEN, 'g'), TARGET_SLOT_LABEL);
  }
  return withMaskedHighlight.replace(new RegExp(TARGET_SLOT_TOKEN, 'g'), GENERIC_BLANK);
}

function normalizePrompt(html: string, questionType: ExamQuestionType) {
  const masked = maskPromptAnswer(html, questionType);
  const plain = htmlToPlainText(masked);
  const lines = plain
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/\bN\d\s*\|\s*Practice/i.test(line) && !/takostar\.net/i.test(line));
  return (lines.length ? lines : plain.split('\n').map((line) => line.trim()).filter(Boolean)).join('\n');
}

function resolveRawItems(raw: unknown): RawExamItem[] {
  return Array.isArray(raw)
    ? (raw as RawExamItem[])
    : Array.isArray((raw as { items?: unknown })?.items)
    ? (((raw as { items?: unknown }).items ?? []) as RawExamItem[])
    : [];
}

export function sanitizeRawExamItems(rawItems: RawExamItem[]) {
  const result: ExamQuizItem[] = [];

  for (const item of rawItems) {
    const rawQuestionHtml = String(item.question_html ?? '');
    const questionType = normalizeQuestionType(item.question_type, rawQuestionHtml);
    const options = Array.isArray(item.options) ? item.options.map((option) => String(option).trim()).filter(Boolean) : [];
    const answerIndex = Number(item.answer_index ?? 0) - 1;
    const answer = answerIndex >= 0 && answerIndex < options.length ? options[answerIndex] : '';
    const prompt = normalizePrompt(rawQuestionHtml, questionType);

    if (!prompt || options.length < 2 || !answer) continue;

    result.push({
      id: String(item.id ?? `${result.length + 1}`),
      prompt,
      options,
      answer,
      questionType,
    });
  }

  return result;
}

function buildQuestionBank(level: BankLevel) {
  const source = resolveRawItems(RAW_BANKS[level]);
  return sanitizeRawExamItems(source);
}

export function getQuestionBank(level: BankLevel) {
  if (!BANK_CACHE[level]) {
    BANK_CACHE[level] = buildQuestionBank(level);
  }
  return BANK_CACHE[level] ?? [];
}

