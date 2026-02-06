import type { LexiconId } from './data/lexicons';

export type Level = LexiconId;

export type MeaningLanguage = 'zh' | 'en';

export type FontScale = 's' | 'm' | 'l';

export type Word = {
  id: string;
  level: Level;
  kana: string;
  kanji?: string | null;
  meaning_cn: string;
  meaning_en: string;
  pos?: string | null;
  pitch?: string | null;
  examples?: WordExample[] | null;
  tags?: string[] | null;
};

export type WordExample = {
  type?: string | null;
  ja?: string | null;
  ja_furigana?: string | null;
  zh_cn?: string | null;
  audio?: string | null;
};

export type GrammarExample = {
  ja?: string | null;
  zh?: string | null;
  audio?: string | null;
};

export type GrammarPoint = {
  id: string;
  level?: Level;
  pattern: string;
  formation?: string[] | null;
  meaning_cn?: string | null;
  usage?: string[] | null;
  notes?: string[] | null;
  examples?: GrammarExample[] | null;
  tags?: string[] | null;
  sentenceTags?: string[] | null;
  subOrder?: string | null;
  totalOrder?: string | null;
  honorific?: string | null;
  gakkoConnectives?: string[] | null;
};

export type Stage = {
  id: string;
  level: Level;
  index: number;
  word_ids: string[];
};

export type Progress = {
  id: string;
  stage_id: string;
  correct_count: number;
  wrong_count: number;
  last_played_at: number;
  stars: number;
};

export type QuizMix = {
  mcq: number;
  spelling: number;
  listening: number;
};

export type McqModes = {
  ja_to_meaning: boolean;
  meaning_to_ja: boolean;
};

export type Settings = {
  tts_rate: number;
  tts_voice: string | null;
  quiz_mix: QuizMix;
  mcq_modes: McqModes;
  meaning_language: MeaningLanguage;
  compact_mode: boolean;
  compact_single_expand: boolean;
  lexicon_level: Level;
  font_scale: FontScale;
};

export type QuizItem =
  | {
      id: string;
      wordId: string;
      type: 'mcq_ja_to_cn' | 'mcq_cn_to_ja';
      prompt: string;
      options: string[];
      answer: string;
    }
  | {
      id: string;
      wordId: string;
      type: 'spelling';
      prompt: string;
      answer: string;
    }
  | {
      id: string;
      wordId: string;
      type: 'listening';
      audioText: string;
      options: string[];
      answer: string;
    };
