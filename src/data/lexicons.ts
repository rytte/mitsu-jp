import n1 from './words-n1.json';
import n2 from './words-n2.json';
import n3 from './words-n3.json';
import n4 from './words-n4.json';
import n5 from './words-n5.json';
import n1s from './words-n1s.json';
import n2s from './words-n2s.json';
import n3s from './words-n3s.json';
import n4s from './words-n4s.json';
import n5s from './words-n5s.json';

type WordLike = {
  level: string;
} & Record<string, unknown>;

function withLevel(words: unknown[], level: string) {
  return (words as WordLike[]).map((word) => ({ ...word, level }));
}

export const LEXICONS = [
  { id: 'N5', label: 'N5', words: n5 },
  { id: 'N4', label: 'N4', words: n4 },
  { id: 'N3', label: 'N3', words: n3 },
  { id: 'N2', label: 'N2', words: n2 },
  { id: 'N1', label: 'N1', words: n1 },
  { id: 'N5S', label: 'N5S', words: withLevel(n5s, 'N5S') },
  { id: 'N4S', label: 'N4S', words: withLevel(n4s, 'N4S') },
  { id: 'N3S', label: 'N3S', words: withLevel(n3s, 'N3S') },
  { id: 'N2S', label: 'N2S', words: withLevel(n2s, 'N2S') },
  { id: 'N1S', label: 'N1S', words: withLevel(n1s, 'N1S') },
] as const;

export type LexiconId = (typeof LEXICONS)[number]['id'];

export function getLexiconIds(): LexiconId[] {
  return LEXICONS.map((item) => item.id);
}

export function isLexiconId(value: unknown): value is LexiconId {
  return LEXICONS.some((item) => item.id === value);
}

export function getAllWords() {
  return LEXICONS.flatMap((item) => item.words as unknown[]);
}
