import type { LexiconId } from './data/lexicons';

export type Level = LexiconId;

export type MeaningLanguage = 'zh' | 'en';

export type FontScale = 's' | 'm' | 'l';

export type BankLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export type ExamQuestionType = 'reorder_fill' | 'single_blank_fill' | 'kana_kanji_conversion';

export type TranslationDirection = 'zh_to_ja' | 'ja_to_zh';

export type TranslationFocus = 'vocab' | 'grammar' | 'mixed';

export type WritingPurpose = 'request' | 'apology' | 'invitation' | 'consultation' | 'report';

export type WritingRegister = 'polite' | 'plain';

export type RawExamItem = {
  id?: string;
  question_html?: string;
  options?: string[];
  answer_index?: number;
  question_type?: ExamQuestionType;
};

export type ExamQuizItem = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  questionType?: ExamQuestionType;
};

export type RawAiSentenceAssembleItem = {
  id?: string;
  prompt?: string;
  tokens?: string[];
  answer_tokens?: string[];
};

export type AiSentenceAssembleItem = {
  id: string;
  prompt: string;
  tokens: string[];
  answerTokens: string[];
};

export type RawAiWritingTask = {
  id?: string;
  scenario?: string;
  purpose?: string;
  audience?: string;
  register?: WritingRegister;
  prompt_cn?: string;
  must_include?: string[];
  min_sentences?: number;
  max_sentences?: number;
  min_chars?: number;
  max_chars?: number;
};

export type AiWritingTask = {
  id: string;
  level: BankLevel;
  scenario: string;
  purpose: string;
  audience: string;
  register: WritingRegister;
  promptCn: string;
  mustInclude: string[];
  minSentences: number;
  maxSentences: number;
  minChars: number;
  maxChars: number;
};

export type AiProviderConfig = {
  provider_id: string;
  provider_label: string;
  api_base_url: string;
  api_key: string;
  model: string;
  updated_at: number;
};

export type TranslationEvalResult = {
  score: number;
  level: 'excellent' | 'pass' | 'retry';
  isCorrect: boolean;
  referenceAnswer: string;
  betterAnswer?: string;
  errors: string[];
  feedbackCn: string;
};

export type WritingEvalResult = {
  score: number;
  level: 'excellent' | 'pass' | 'retry';
  goalAchieved: boolean;
  dimensionScores: {
    task: number;
    grammar: number;
    vocab: number;
    coherence: number;
    register: number;
  };
  mustIncludeCheck: Array<{
    point: string;
    covered: boolean;
    commentCn: string;
  }>;
  errors: Array<{
    fragment: string;
    type: string;
    suggestion: string;
    reasonCn: string;
  }>;
  feedbackCn: string;
  betterAnswer: string;
  nextActionCn: string;
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
  nav_show_ai_hub: boolean;
  nav_show_exam_quiz: boolean;
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

export type ListeningQuestionType = 'word_meaning' | 'sentence_spelling' | 'ai_passage';

export type ListeningQuestionItem =
  | {
      id: string;
      type: 'word_meaning';
      audioText: string;
      prompt: string;
      options: string[];
      answer: string;
      displayJa: string;
    }
  | {
      id: string;
      type: 'sentence_spelling';
      audioText: string;
      prompt: string;
      answer: string;
    }
  | {
      id: string;
      type: 'ai_passage';
      audioText: string;
      title: string;
      passage: string;
      prompt: string;
      options: string[];
      answer: string;
      explainCn?: string;
    };

export type RawAiListeningPassageItem = {
  id?: string;
  title?: string;
  passage?: string;
  question?: string;
  options?: string[];
  answer_index?: number;
  answer_text?: string;
  explain_cn?: string;
};

export type AiListeningPassageItem = {
  id: string;
  title: string;
  passage: string;
  question: string;
  options: string[];
  answerIndex: number;
  answer: string;
  explainCn?: string;
};
