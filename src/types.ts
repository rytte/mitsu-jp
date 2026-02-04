export type Level = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type MeaningLanguage = 'zh' | 'en';

export type Word = {
  id: string;
  level: Level;
  kana: string;
  kanji?: string | null;
  meaning_cn: string;
  meaning_en: string;
  pos?: string | null;
  example?: string | null;
  example_cn?: string | null;
  tags?: string[] | null;
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

export type Settings = {
  tts_rate: number;
  tts_voice: string | null;
  quiz_mix: QuizMix;
  meaning_language: MeaningLanguage;
  compact_mode: boolean;
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
