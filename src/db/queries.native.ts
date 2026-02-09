import {
  FontScale,
  GrammarPoint,
  GrammarQuizModes,
  Level,
  McqModes,
  MeaningLanguage,
  Progress,
  Settings,
  Stage,
  Word,
} from '../types';
import { getAllGrammars } from '../data/grammars';
import { isLexiconId } from '../data/lexicons';
import { DEFAULT_SETTINGS } from './constants';
import { getAll, getFirst, run } from './db';

function safeParseJson<T>(value: unknown): T | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

function normalizeMeaningLanguage(value?: string): MeaningLanguage {
  return value === 'en' ? 'en' : 'zh';
}

function normalizeCompactMode(value: unknown) {
  return value === 1 || value === true || value === '1';
}

function normalizeCompactSingleExpand(value: unknown) {
  return value === 1 || value === true || value === '1';
}

function normalizeLexiconLevel(value: unknown): Level {
  const v = String(value || '').toUpperCase();
  if (isLexiconId(v)) return v as Level;
  return DEFAULT_SETTINGS.lexicon_level;
}

function normalizeFontScale(value: unknown): FontScale {
  return value === 's' || value === 'm' || value === 'l' ? value : DEFAULT_SETTINGS.font_scale;
}

function normalizeMcqModes(value: unknown): McqModes {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS.mcq_modes;
  const raw = value as Partial<McqModes>;
  return {
    ja_to_meaning: Boolean(raw.ja_to_meaning),
    meaning_to_ja: Boolean(raw.meaning_to_ja),
  };
}

function normalizeGrammarQuizModes(value: unknown): GrammarQuizModes {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS.grammar_quiz_modes;
  const raw = value as Partial<GrammarQuizModes>;
  return {
    example_to_pattern: Boolean(raw.example_to_pattern),
    meaning_to_pattern: Boolean(raw.meaning_to_pattern),
    pattern_to_meaning: Boolean(raw.pattern_to_meaning),
  };
}

export async function getStagesByLevel(level: Level): Promise<Stage[]> {
  const rows = await getAll<{
    id: string;
    level: Level;
    stage_index: number;
    word_ids: string;
  }>('SELECT * FROM stages WHERE level = ? ORDER BY stage_index ASC', [level]);

  return rows.map((row) => ({
    id: row.id,
    level: row.level,
    index: row.stage_index,
    word_ids: JSON.parse(row.word_ids),
  }));
}

export async function getStage(stageId: string): Promise<Stage | null> {
  const row = await getFirst<{ id: string; level: Level; stage_index: number; word_ids: string }>(
    'SELECT * FROM stages WHERE id = ? LIMIT 1',
    [stageId]
  );
  if (!row) return null;
  return {
    id: row.id,
    level: row.level,
    index: row.stage_index,
    word_ids: JSON.parse(row.word_ids),
  };
}

export async function getProgressMapByLevel(level: Level): Promise<Record<string, Progress>> {
  const rows = await getAll<Progress>(
    `SELECT p.* FROM progress p
     JOIN stages s ON s.id = p.stage_id
     WHERE s.level = ?`,
    [level]
  );
  return rows.reduce<Record<string, Progress>>((acc, item) => {
    acc[item.stage_id] = item;
    return acc;
  }, {});
}

export async function saveProgress(stageId: string, correct: number, wrong: number, stars: number) {
  const now = Date.now();
  await run(
    `INSERT OR REPLACE INTO progress (id, stage_id, correct_count, wrong_count, last_played_at, stars)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [stageId, stageId, correct, wrong, now, stars]
  );
}

export async function recordMistake(wordId: string) {
  const existing = await getFirst<{ id: string; wrong_times: number }>(
    'SELECT id, wrong_times FROM mistakes WHERE word_id = ? LIMIT 1',
    [wordId]
  );
  const now = Date.now();
  if (!existing) {
    await run(
      'INSERT INTO mistakes (id, word_id, wrong_times, last_wrong_at) VALUES (?, ?, ?, ?);',
      [`mistake-${wordId}`, wordId, 1, now]
    );
  } else {
    await run(
      'UPDATE mistakes SET wrong_times = ?, last_wrong_at = ? WHERE id = ?;',
      [existing.wrong_times + 1, now, existing.id]
    );
  }
}

export async function clearAllMistakes() {
  await run('DELETE FROM mistakes');
}

export async function recordGrammarMistake(grammarId: string) {
  const existing = await getFirst<{ id: string; wrong_times: number }>(
    'SELECT id, wrong_times FROM grammar_mistakes WHERE grammar_id = ? LIMIT 1',
    [grammarId]
  );
  const now = Date.now();
  if (!existing) {
    await run(
      'INSERT INTO grammar_mistakes (id, grammar_id, wrong_times, last_wrong_at) VALUES (?, ?, ?, ?);',
      [`grammar-mistake-${grammarId}`, grammarId, 1, now]
    );
  } else {
    await run(
      'UPDATE grammar_mistakes SET wrong_times = ?, last_wrong_at = ? WHERE id = ?;',
      [existing.wrong_times + 1, now, existing.id]
    );
  }
}

export async function clearAllGrammarMistakes() {
  await run('DELETE FROM grammar_mistakes');
}

export async function getMistakeWords(): Promise<(Word & { wrong_times: number })[]> {
  const rows = await getAll<Word & { wrong_times: number }>(
    `SELECT w.*, m.wrong_times FROM mistakes m
     JOIN words w ON w.id = m.word_id
     ORDER BY m.wrong_times DESC, m.last_wrong_at DESC`
  );
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as unknown as string) : null,
    examples: safeParseJson(row.examples) ?? null,
  }));
}

export async function getGrammarMistakes(): Promise<(GrammarPoint & { wrong_times: number })[]> {
  const rows = await getAll<{ grammar_id: string; wrong_times: number }>(
    `SELECT grammar_id, wrong_times FROM grammar_mistakes
     ORDER BY wrong_times DESC, last_wrong_at DESC`
  );
  const grammars = getAllGrammars();
  const map = new Map(grammars.map((item) => [item.id, item]));
  return rows
    .map((row) => {
      const grammar = map.get(row.grammar_id);
      if (!grammar) return null;
      return { ...grammar, wrong_times: row.wrong_times };
    })
    .filter(Boolean) as (GrammarPoint & { wrong_times: number })[];
}

export async function getMistakeWordIdsByLevel(level: Level): Promise<string[]> {
  const rows = await getAll<{ id: string }>(
    `SELECT w.id FROM mistakes m
     JOIN words w ON w.id = m.word_id
     WHERE w.level = ?`,
    [level]
  );
  return rows.map((row) => row.id);
}

export async function addToVocabBook(ids: string[]) {
  if (ids.length === 0) return;
  const now = Date.now();
  for (const id of ids) {
    await run('INSERT OR REPLACE INTO vocab_book (word_id, added_at) VALUES (?, ?);', [id, now]);
  }
}

export async function removeFromVocabBook(ids: string[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await run(`DELETE FROM vocab_book WHERE word_id IN (${placeholders});`, ids);
}

export async function getVocabBookWords(): Promise<Word[]> {
  const rows = await getAll<Word>(
    `SELECT w.* FROM vocab_book v
     JOIN words w ON w.id = v.word_id
     ORDER BY v.added_at DESC`
  );
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as unknown as string) : null,
    examples: safeParseJson(row.examples) ?? null,
  }));
}

export async function getWordsByIds(ids: string[]): Promise<Word[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await getAll<Word>(`SELECT * FROM words WHERE id IN (${placeholders})`, ids);
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as unknown as string) : null,
    examples: safeParseJson(row.examples) ?? null,
  }));
}

export async function getAllWords(): Promise<Word[]> {
  const rows = await getAll<Word>('SELECT * FROM words');
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as unknown as string) : null,
    examples: safeParseJson(row.examples) ?? null,
  }));
}

export async function getAllWordsByLevel(level: Level): Promise<Word[]> {
  const rows = await getAll<Word>('SELECT * FROM words WHERE level = ?', [level]);
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as unknown as string) : null,
    examples: safeParseJson(row.examples) ?? null,
  }));
}

export async function getSettings(): Promise<Settings> {
  const row = await getFirst<{
    tts_rate: number;
    tts_voice: string | null;
    quiz_mix: string;
    mcq_modes?: string | null;
    grammar_quiz_modes?: string | null;
    meaning_language?: string;
    compact_mode?: number | null;
    compact_single_expand?: number | null;
    lexicon_level?: string | null;
    font_scale?: string | null;
    nav_show_search?: number | null;
    nav_show_mistakes?: number | null;
    nav_show_vocab_book?: number | null;
    nav_show_kana?: number | null;
    nav_show_verb_conjugation?: number | null;
    nav_show_keigo?: number | null;
    nav_show_settings?: number | null;
  }>(
    'SELECT * FROM settings WHERE id = ? LIMIT 1',
    ['default']
  );
  if (!row) return DEFAULT_SETTINGS;
  return {
    tts_rate: row.tts_rate,
    tts_voice: row.tts_voice,
    quiz_mix: row.quiz_mix ? JSON.parse(row.quiz_mix) : DEFAULT_SETTINGS.quiz_mix,
    mcq_modes: normalizeMcqModes(
      row.mcq_modes ? (JSON.parse(row.mcq_modes) as McqModes) : DEFAULT_SETTINGS.mcq_modes
    ),
    grammar_quiz_modes: normalizeGrammarQuizModes(
      row.grammar_quiz_modes
        ? (JSON.parse(row.grammar_quiz_modes) as GrammarQuizModes)
        : DEFAULT_SETTINGS.grammar_quiz_modes
    ),
    meaning_language: normalizeMeaningLanguage(row.meaning_language ?? DEFAULT_SETTINGS.meaning_language),
    compact_mode: normalizeCompactMode(row.compact_mode ?? (DEFAULT_SETTINGS.compact_mode ? 1 : 0)),
    compact_single_expand: normalizeCompactSingleExpand(
      row.compact_single_expand ?? (DEFAULT_SETTINGS.compact_single_expand ? 1 : 0)
    ),
    lexicon_level: normalizeLexiconLevel(row.lexicon_level ?? DEFAULT_SETTINGS.lexicon_level),
    font_scale: normalizeFontScale(row.font_scale ?? DEFAULT_SETTINGS.font_scale),
    nav_show_search: normalizeCompactMode(
      row.nav_show_search ?? (DEFAULT_SETTINGS.nav_show_search ? 1 : 0)
    ),
    nav_show_mistakes: normalizeCompactMode(
      row.nav_show_mistakes ?? (DEFAULT_SETTINGS.nav_show_mistakes ? 1 : 0)
    ),
    nav_show_vocab_book: normalizeCompactMode(
      row.nav_show_vocab_book ?? (DEFAULT_SETTINGS.nav_show_vocab_book ? 1 : 0)
    ),
    nav_show_kana: normalizeCompactMode(
      row.nav_show_kana ?? (DEFAULT_SETTINGS.nav_show_kana ? 1 : 0)
    ),
    nav_show_verb_conjugation: normalizeCompactMode(
      row.nav_show_verb_conjugation ?? (DEFAULT_SETTINGS.nav_show_verb_conjugation ? 1 : 0)
    ),
    nav_show_keigo: normalizeCompactMode(
      row.nav_show_keigo ?? (DEFAULT_SETTINGS.nav_show_keigo ? 1 : 0)
    ),
    nav_show_settings: normalizeCompactMode(
      row.nav_show_settings ?? (DEFAULT_SETTINGS.nav_show_settings ? 1 : 0)
    ),
  };
}

export async function updateSettings(settings: Settings) {
  await run(
    'UPDATE settings SET tts_rate = ?, tts_voice = ?, quiz_mix = ?, mcq_modes = ?, grammar_quiz_modes = ?, meaning_language = ?, compact_mode = ?, compact_single_expand = ?, lexicon_level = ?, font_scale = ?, nav_show_search = ?, nav_show_mistakes = ?, nav_show_vocab_book = ?, nav_show_kana = ?, nav_show_verb_conjugation = ?, nav_show_keigo = ?, nav_show_settings = ? WHERE id = ?;',
    [
      settings.tts_rate,
      settings.tts_voice,
      JSON.stringify(settings.quiz_mix),
      JSON.stringify(settings.mcq_modes),
      JSON.stringify(settings.grammar_quiz_modes),
      settings.meaning_language,
      settings.compact_mode ? 1 : 0,
      settings.compact_single_expand ? 1 : 0,
      settings.lexicon_level,
      settings.font_scale,
      settings.nav_show_search ? 1 : 0,
      settings.nav_show_mistakes ? 1 : 0,
      settings.nav_show_vocab_book ? 1 : 0,
      settings.nav_show_kana ? 1 : 0,
      settings.nav_show_verb_conjugation ? 1 : 0,
      settings.nav_show_keigo ? 1 : 0,
      settings.nav_show_settings ? 1 : 0,
      'default',
    ]
  );
}

export async function getStats() {
  const stageRow = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM stages');
  const completedRow = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM progress WHERE stars >= 1');
  const totalsRow = await getFirst<{ correct: number | null; wrong: number | null }>(
    'SELECT SUM(correct_count) as correct, SUM(wrong_count) as wrong FROM progress'
  );
  return {
    stageCount: stageRow?.count ?? 0,
    completed: completedRow?.count ?? 0,
    correct: totalsRow?.correct ?? 0,
    wrong: totalsRow?.wrong ?? 0,
  };
}

export async function getTodayStats() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startTs = start.getTime();
  const stageRow = await getFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM progress WHERE last_played_at >= ?',
    [startTs]
  );
  const lastRow = await getFirst<{ last: number | null }>(
    'SELECT MAX(last_played_at) as last FROM progress WHERE last_played_at >= ?',
    [startTs]
  );
  return {
    stages: stageRow?.count ?? 0,
    last_played_at: lastRow?.last ?? null,
  };
}
