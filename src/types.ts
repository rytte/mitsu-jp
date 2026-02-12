import type { LexiconId } from './data/lexicons';

export type Level = LexiconId;

export type MeaningLanguage = 'zh' | 'en';

export type FontScale = 's' | 'm' | 'l';

export type BankLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export type RawExamItem = {
  id?: string;
  question_html?: string;
  options?: string[];
  answer_index?: number;
};

export type ExamQuizItem = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
};

export type AiProviderConfig = {
  provider_id: string;
  provider_label: string;
  api_base_url: string;
  api_key: string;
  model: string;
  updated_at: number;
};

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

export type GrammarQuizModes = {
  example_to_pattern: boolean;
  meaning_to_pattern: boolean;
  pattern_to_meaning: boolean;
};

export type Settings = {
  tts_rate: number;
  tts_voice: string | null;
  quiz_mix: QuizMix;
  mcq_modes: McqModes;
  grammar_quiz_modes: GrammarQuizModes;
  meaning_language: MeaningLanguage;
  show_example_furigana: boolean;
  compact_mode: boolean;
  compact_single_expand: boolean;
  lexicon_level: Level;
  font_scale: FontScale;
  nav_show_search: boolean;
  nav_show_mistakes: boolean;
  nav_show_vocab_book: boolean;
  nav_show_kana: boolean;
  nav_show_verb_conjugation: boolean;
  nav_show_keigo: boolean;
  nav_show_settings: boolean;
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
