import n1 from './words-n1.json';
import n2 from './words-n2.json';
import n3 from './words-n3.json';
import n4 from './words-n4.json';
import n5 from './words-n5.json';

export const LEXICONS = [
  { id: 'N5', label: 'N5', words: n5 },
  { id: 'N4', label: 'N4', words: n4 },
  { id: 'N3', label: 'N3', words: n3 },
  { id: 'N2', label: 'N2', words: n2 },
  { id: 'N1', label: 'N1', words: n1 }
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
