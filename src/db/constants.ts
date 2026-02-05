import { Settings } from '../types';

export const STAGE_SIZE = 15;

export const DEFAULT_SETTINGS: Settings = {
  tts_rate: 1.0,
  tts_voice: null,
  quiz_mix: { mcq: 0.6, spelling: 0.2, listening: 0.2 },
  meaning_language: 'zh',
  compact_mode: false,
  compact_single_expand: false,
  lexicon_level: 'N5',
  font_scale: 'm',
};
