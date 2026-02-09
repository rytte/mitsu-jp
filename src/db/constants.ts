import { LEXICONS } from '../data/lexicons';
import { Settings } from '../types';

export const STAGE_SIZE = 15;
export const LEXICON_VERSION = '2026-02-06-1';

export const DEFAULT_SETTINGS: Settings = {
  tts_rate: 1.0,
  tts_voice: null,
  quiz_mix: { mcq: 1 / 3, spelling: 1 / 3, listening: 1 / 3 },
  mcq_modes: { ja_to_meaning: true, meaning_to_ja: true },
  grammar_quiz_modes: { example_to_pattern: true, meaning_to_pattern: true, pattern_to_meaning: true },
  meaning_language: 'zh',
  compact_mode: false,
  compact_single_expand: true,
  lexicon_level: LEXICONS[0].id,
  font_scale: 'm',
  nav_show_search: true,
  nav_show_mistakes: true,
  nav_show_vocab_book: false,
  nav_show_kana: false,
  nav_show_verb_conjugation: false,
  nav_show_keigo: false,
  nav_show_settings: false,
};
