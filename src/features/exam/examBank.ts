import n1Bank from '../../data/jlpt-n1.json';
import n2Bank from '../../data/jlpt-n2.json';
import n3Bank from '../../data/jlpt-n3.json';
import n4Bank from '../../data/jlpt-n4.json';
import n5Bank from '../../data/jlpt-n5.json';
import { BankLevel, ExamQuizItem, RawExamItem } from '../../types';

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

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

function maskPromptAnswer(html: string) {
  const withMaskedHighlight = html.replace(/<font[^>]*#ef3461[^>]*>([\s\S]*?)<\/font>/gi, (_, inner: string) => {
    const text = htmlToPlainText(inner).trim();
    if (!text) return '____';
    if (text.startsWith('(') && text.endsWith(')')) return '(____)';
    if (text.startsWith('（') && text.endsWith('）')) return '（____）';
    return '____';
  });

  return withMaskedHighlight.replace(/\{\{c\d+::[\s\S]*?\}\}/gi, '____');
}

function normalizePrompt(html: string) {
  const masked = maskPromptAnswer(html);
  const withoutHidden = masked.replace(/<a[^>]*display\s*:\s*none[^>]*>[\s\S]*?<\/a>/gi, '');
  const plain = htmlToPlainText(withoutHidden);
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
    const options = Array.isArray(item.options) ? item.options.map((option) => String(option).trim()).filter(Boolean) : [];
    const answerIndex = Number(item.answer_index ?? 0) - 1;
    const answer = answerIndex >= 0 && answerIndex < options.length ? options[answerIndex] : '';
    const prompt = normalizePrompt(String(item.question_html ?? ''));

    if (!prompt || options.length < 2 || !answer) continue;

    result.push({
      id: String(item.id ?? `${result.length + 1}`),
      prompt,
      options,
      answer,
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

