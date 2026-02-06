import n1 from './grammar-n1.json';
import n2 from './grammar-n2.json';
import n3 from './grammar-n3.json';
import n4 from './grammar-n4.json';
import n5 from './grammar-n5.json';
import { GrammarPoint, Level } from '../types';

export const GRAMMARS = [
  { id: 'N5', label: 'N5', items: n5 },
  { id: 'N4', label: 'N4', items: n4 },
  { id: 'N3', label: 'N3', items: n3 },
  { id: 'N2', label: 'N2', items: n2 },
  { id: 'N1', label: 'N1', items: n1 },
] as const;

export function getGrammarLevels(): Level[] {
  return GRAMMARS.map((item) => item.id as Level);
}

export function getGrammarByLevel(level: Level): GrammarPoint[] {
  const found = GRAMMARS.find((item) => item.id === level);
  return (found?.items ?? []) as GrammarPoint[];
}
