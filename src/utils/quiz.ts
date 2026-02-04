import { MeaningLanguage, QuizItem, QuizMix, Word } from '../types';
import { getMeaning } from './meaning';
import { pickOne, sample, shuffle } from './random';

function displayJa(word: Word) {
  return word.kanji ?? word.kana;
}

function weightedPick(mix: QuizMix): 'mcq' | 'spelling' | 'listening' {
  const r = Math.random();
  if (r < mix.mcq) return 'mcq';
  if (r < mix.mcq + mix.spelling) return 'spelling';
  return 'listening';
}

function buildOptions(answer: string, candidates: string[], count = 4): string[] {
  const filtered = candidates.filter((item) => item !== answer);
  const picked = sample(filtered, Math.max(0, count - 1));
  return shuffle([answer, ...picked]).slice(0, count);
}

export function generateQuizItems(params: {
  stageWords: Word[];
  mistakeWords: Word[];
  allLevelWords: Word[];
  questionCount: number;
  mix: QuizMix;
  meaningLanguage: MeaningLanguage;
}): QuizItem[] {
  const { stageWords, mistakeWords, allLevelWords, questionCount, mix, meaningLanguage } = params;
  const items: QuizItem[] = [];
  const allWords = allLevelWords.length ? allLevelWords : stageWords;
  const meanings = allWords.map((item) => getMeaning(item, meaningLanguage));

  for (let i = 0; i < questionCount; i += 1) {
    const roll = Math.random();
    let source = stageWords;
    if (roll >= 0.7 && roll < 0.9 && mistakeWords.length > 0) source = mistakeWords;
    if (roll >= 0.9) source = allWords;

    const word = pickOne(source.length ? source : allWords);
    const type = weightedPick(mix);
    const meaning = getMeaning(word, meaningLanguage);

    if (type === 'mcq') {
      const jaToCn = Math.random() < 0.5;
      if (jaToCn) {
        const options = buildOptions(meaning, meanings);
        items.push({
          id: `${word.id}-mcq-ja-${i}`,
          wordId: word.id,
          type: 'mcq_ja_to_cn',
          prompt: displayJa(word),
          options,
          answer: meaning,
        });
      } else {
        const options = buildOptions(displayJa(word), allWords.map((item) => displayJa(item)));
        items.push({
          id: `${word.id}-mcq-cn-${i}`,
          wordId: word.id,
          type: 'mcq_cn_to_ja',
          prompt: meaning,
          options,
          answer: displayJa(word),
        });
      }
      continue;
    }

    if (type === 'spelling') {
      items.push({
        id: `${word.id}-spell-${i}`,
        wordId: word.id,
        type: 'spelling',
        prompt: `${meaning}${word.kanji ? `(${word.kanji})` : ''}`,
        answer: word.kana,
      });
      continue;
    }

    const options = buildOptions(displayJa(word), allWords.map((item) => displayJa(item)));
    items.push({
      id: `${word.id}-listen-${i}`,
      wordId: word.id,
      type: 'listening',
      audioText: word.kana,
      options,
      answer: displayJa(word),
    });
  }

  return items;
}

export function calcStars(correct: number, total: number) {
  if (total === 0) return 0;
  const rate = correct / total;
  if (rate >= 0.9) return 3;
  if (rate >= 0.7) return 2;
  return 1;
}
