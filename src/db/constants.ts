import { LEXICONS } from '../data/lexicons';
import { Settings } from '../types';

export const STAGE_SIZE = 15;

export const DEFAULT_SETTINGS: Settings = {
  tts_rate: 1.0,
  tts_voice: null,
  quiz_mix: { mcq: 1 / 3, spelling: 1 / 3, listening: 1 / 3 },
  mcq_modes: { ja_to_meaning: true, meaning_to_ja: true },
  meaning_language: 'zh',
  compact_mode: false,
  compact_single_expand: false,
  lexicon_level: LEXICONS[0].id,
  font_scale: 'm',
};
