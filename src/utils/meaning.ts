import { MeaningLanguage, Word } from '../types';

export function getMeaning(word: Word, language: MeaningLanguage) {
  const zh = word.meaning_cn?.trim();
  const en = word.meaning_en?.trim();
  if (language === 'zh') {
    return zh || en || '';
  }
  return en || zh || '';
}

export function getMeaningLabel(language: MeaningLanguage) {
  return language === 'zh' ? '中文' : '英文';
}
