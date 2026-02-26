import { GrammarPoint, GrammarQuizModes } from '../types';
import { sample, shuffle } from './random';

export type GrammarQuizItem = {
  id: string;
  grammarId: string;
  type: 'meaning_to_pattern' | 'example_to_pattern' | 'pattern_to_meaning';
  prompt: string;
  promptZh?: string;
  options: string[];
  answer: string;
};

const DEFAULT_MODES: GrammarQuizModes = {
  example_to_pattern: true,
  meaning_to_pattern: true,
  pattern_to_meaning: true,
};

function getMeaning(grammar: GrammarPoint) {
  const direct = (grammar.explanation ?? '').trim();
  if (direct) return direct;
  const usage = grammar.usage ?? [];
  for (const item of usage) {
    const text = (item ?? '').trim();
    if (text) return text;
  }
  return '';
}

function getExample(grammar: GrammarPoint) {
  const examples = grammar.examples ?? [];
  for (const example of examples) {
    const ja = (example?.ja ?? '').trim();
    const zh = (example?.zh ?? '').trim();
    if (ja || zh) {
      return {
        ja: ja || '',
        zh,
      };
    }
  }
  return null;
}

function buildOptions(answer: string, candidates: string[], count = 4) {
  const filtered = Array.from(new Set(candidates.filter((item) => item !== answer)));
  const picked = sample(filtered, Math.max(0, count - 1));
  return shuffle([answer, ...picked]).slice(0, count);
}

export function generateGrammarQuizItems(params: {
  grammars: GrammarPoint[];
  count?: number;
  modes?: GrammarQuizModes;
}): GrammarQuizItem[] {
  const { grammars, count = 20, modes } = params;
  const resolvedModes = { ...DEFAULT_MODES, ...(modes ?? {}) };
  const candidates = grammars.filter((item) => {
    const meaning = getMeaning(item);
    const example = getExample(item);
    const hasPattern = Boolean(item.pattern);
    const available =
      (resolvedModes.example_to_pattern && hasPattern && example) ||
      (resolvedModes.meaning_to_pattern && hasPattern && meaning) ||
      (resolvedModes.pattern_to_meaning && hasPattern && meaning);
    return Boolean(available);
  });
  if (!candidates.length) return [];

  const maxCount = Math.min(count, candidates.length);
  const picked = shuffle([...candidates]).slice(0, maxCount);
  const patterns = Array.from(new Set(candidates.map((item) => item.pattern).filter(Boolean)));
  const meanings = Array.from(new Set(candidates.map((item) => getMeaning(item)).filter(Boolean)));
  const items: GrammarQuizItem[] = [];

  for (let i = 0; i < picked.length; i += 1) {
    const grammar = picked[i];
    const meaning = getMeaning(grammar);
    const example = getExample(grammar);
    const availableTypes: GrammarQuizItem['type'][] = [];
    if (resolvedModes.example_to_pattern && example) {
      availableTypes.push('example_to_pattern');
    }
    if (resolvedModes.meaning_to_pattern && meaning) {
      availableTypes.push('meaning_to_pattern');
    }
    if (resolvedModes.pattern_to_meaning && meaning) {
      availableTypes.push('pattern_to_meaning');
    }
    if (availableTypes.length === 0) continue;
    const type = sample(availableTypes, 1)[0] ?? availableTypes[0];
    let prompt = meaning;
    let promptZh = '';
    let answer = grammar.pattern;
    let options = buildOptions(answer, patterns);

    if (type === 'example_to_pattern' && example) {
      prompt = example.ja || example.zh || meaning;
      promptZh = example.zh || '';
    }

    if (type === 'pattern_to_meaning') {
      prompt = grammar.pattern;
      answer = meaning;
      options = buildOptions(answer, meanings);
    }

    items.push({
      id: `${grammar.id}-gq-${i}`,
      grammarId: grammar.id,
      type,
      prompt,
      promptZh: promptZh || undefined,
      options,
      answer,
    });
  }

  return items;
}
