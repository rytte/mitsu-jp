import { FontScale } from '../types';

const SCALE_ORDER: FontScale[] = ['s', 'm', 'l'];
const SCALE_MAP: Record<FontScale, number> = { s: 0.9, m: 1, l: 1.1 };

export function bumpFontScale(scale: FontScale): FontScale {
  const index = SCALE_ORDER.indexOf(scale);
  if (index < 0) return 'm';
  return SCALE_ORDER[Math.min(index + 1, SCALE_ORDER.length - 1)];
}

export function getWordFontSizes(scale: FontScale) {
  const ratio = SCALE_MAP[scale] ?? 1;
  return {
    word: Math.round(16 * ratio),
    reading: Math.round(12 * ratio),
    meaning: Math.round(12 * ratio),
  };
}
