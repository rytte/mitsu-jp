import { McqModes, MeaningLanguage, QuizItem, QuizMix, Word } from '../types';
import { getMeaning } from './meaning';
import { sample, shuffle } from './random';

function displayJa(word: Word) {
  return word.kanji ?? word.kana;
}

function weightedPick(mix: QuizMix): 'mcq' | 'spelling' | 'listening' {
  const r = Math.random();
  if (r < mix.mcq) return 'mcq';
  if (r < mix.mcq + mix.spelling) return 'spelling';
  return 'listening';
}

function pickMcqDirection(modes: McqModes): 'ja_to_meaning' | 'meaning_to_ja' {
  if (modes.ja_to_meaning && modes.meaning_to_ja) {
    return Math.random() < 0.5 ? 'ja_to_meaning' : 'meaning_to_ja';
  }
  if (modes.ja_to_meaning) return 'ja_to_meaning';
  if (modes.meaning_to_ja) return 'meaning_to_ja';
  return 'ja_to_meaning';
}

function buildEqualMix(mcqEnabled: boolean, spellingEnabled: boolean, listeningEnabled: boolean): QuizMix {
  const enabledCount = [mcqEnabled, spellingEnabled, listeningEnabled].filter(Boolean).length;
  if (enabledCount <= 0) return { mcq: 1, spelling: 0, listening: 0 };
  const weight = 1 / enabledCount;
  return {
    mcq: mcqEnabled ? weight : 0,
    spelling: spellingEnabled ? weight : 0,
    listening: listeningEnabled ? weight : 0,
  };
}

function buildOptions(answer: string, candidates: string[], count = 4): string[] {
  const filtered = candidates.filter((item) => item !== answer);
  const picked = sample(filtered, Math.max(0, count - 1));
  return shuffle([answer, ...picked]).slice(0, count);
}

export function generateQuizItems(params: {
  stageWords: Word[];
  mix: QuizMix;
  mcqModes: McqModes;
  meaningLanguage: MeaningLanguage;
}): QuizItem[] {
  const { stageWords, mix, mcqModes, meaningLanguage } = params;
  if (!stageWords.length) return [];
  const mcqEnabled = mcqModes.ja_to_meaning || mcqModes.meaning_to_ja;
  const spellingEnabled = mix.spelling > 0;
  const listeningEnabled = mix.listening > 0;
  const effectiveMix = buildEqualMix(mcqEnabled, spellingEnabled, listeningEnabled);
  const items: QuizItem[] = [];
  const shuffledWords = shuffle([...stageWords]);
  const meanings = stageWords.map((item) => getMeaning(item, meaningLanguage));
  const jaWords = stageWords.map((item) => displayJa(item));

  for (let i = 0; i < shuffledWords.length; i += 1) {
    const word = shuffledWords[i];
    const type = weightedPick(effectiveMix);
    const meaning = getMeaning(word, meaningLanguage);

    if (type === 'mcq') {
      const direction = pickMcqDirection(mcqModes);
      if (direction === 'ja_to_meaning') {
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
        const options = buildOptions(displayJa(word), jaWords);
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
        prompt: meaning,
        answer: word.kana,
      });
      continue;
    }

    const options = buildOptions(displayJa(word), jaWords);
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
