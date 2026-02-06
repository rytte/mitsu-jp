import { GrammarPoint } from '../types';
import { sample, shuffle } from './random';

export type GrammarQuizItem = {
  id: string;
  grammarId: string;
  type: 'meaning_to_pattern' | 'example_to_pattern';
  prompt: string;
  promptZh?: string;
  options: string[];
  answer: string;
};

function getMeaning(grammar: GrammarPoint) {
  const direct = (grammar.meaning_cn ?? '').trim();
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
  const filtered = candidates.filter((item) => item !== answer);
  const picked = sample(filtered, Math.max(0, count - 1));
  return shuffle([answer, ...picked]).slice(0, count);
}

export function generateGrammarQuizItems(params: { grammars: GrammarPoint[]; count?: number }): GrammarQuizItem[] {
  const { grammars, count = 20 } = params;
  const candidates = grammars.filter((item) => {
    const meaning = getMeaning(item);
    const example = getExample(item);
    return Boolean(item.pattern && (meaning || example));
  });
  if (!candidates.length) return [];

  const maxCount = Math.min(count, candidates.length);
  const picked = shuffle([...candidates]).slice(0, maxCount);
  const patterns = candidates.map((item) => item.pattern).filter(Boolean);
  const items: GrammarQuizItem[] = [];

  for (let i = 0; i < picked.length; i += 1) {
    const grammar = picked[i];
    const meaning = getMeaning(grammar);
    const example = getExample(grammar);
    let type: GrammarQuizItem['type'] = 'meaning_to_pattern';
    let prompt = meaning;
    let promptZh = '';

    if (example && meaning) {
      type = Math.random() < 0.5 ? 'meaning_to_pattern' : 'example_to_pattern';
    } else if (example && !meaning) {
      type = 'example_to_pattern';
    }

    if (type === 'example_to_pattern' && example) {
      prompt = example.ja || example.zh || meaning;
      promptZh = example.zh || '';
    }

    const answer = grammar.pattern;
    const options = buildOptions(answer, patterns);

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
