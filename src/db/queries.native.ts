import { FontScale, Level, McqModes, MeaningLanguage, Progress, Settings, Stage, Word } from '../types';
import { DEFAULT_SETTINGS } from './constants';
import { getAll, getFirst, run } from './db';

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
  if (v === 'N1' || v === 'N2' || v === 'N3' || v === 'N4' || v === 'N5') return v as Level;
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

export async function getMistakeWords(): Promise<(Word & { wrong_times: number })[]> {
  const rows = await getAll<Word & { wrong_times: number }>(
    `SELECT w.*, m.wrong_times FROM mistakes m
     JOIN words w ON w.id = m.word_id
     ORDER BY m.wrong_times DESC, m.last_wrong_at DESC`
  );
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as unknown as string) : null,
  }));
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

export async function getWordsByIds(ids: string[]): Promise<Word[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await getAll<Word>(`SELECT * FROM words WHERE id IN (${placeholders})`, ids);
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as unknown as string) : null,
  }));
}

export async function getAllWordsByLevel(level: Level): Promise<Word[]> {
  const rows = await getAll<Word>('SELECT * FROM words WHERE level = ?', [level]);
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags as unknown as string) : null,
  }));
}

export async function getSettings(): Promise<Settings> {
  const row = await getFirst<{
    tts_rate: number;
    tts_voice: string | null;
    quiz_mix: string;
    mcq_modes?: string | null;
    meaning_language?: string;
    compact_mode?: number | null;
    compact_single_expand?: number | null;
    lexicon_level?: string | null;
    font_scale?: string | null;
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
    meaning_language: normalizeMeaningLanguage(row.meaning_language ?? DEFAULT_SETTINGS.meaning_language),
    compact_mode: normalizeCompactMode(row.compact_mode ?? (DEFAULT_SETTINGS.compact_mode ? 1 : 0)),
    compact_single_expand: normalizeCompactSingleExpand(
      row.compact_single_expand ?? (DEFAULT_SETTINGS.compact_single_expand ? 1 : 0)
    ),
    lexicon_level: normalizeLexiconLevel(row.lexicon_level ?? DEFAULT_SETTINGS.lexicon_level),
    font_scale: normalizeFontScale(row.font_scale ?? DEFAULT_SETTINGS.font_scale),
  };
}

export async function updateSettings(settings: Settings) {
  await run(
    'UPDATE settings SET tts_rate = ?, tts_voice = ?, quiz_mix = ?, mcq_modes = ?, meaning_language = ?, compact_mode = ?, compact_single_expand = ?, lexicon_level = ?, font_scale = ? WHERE id = ?;',
    [
      settings.tts_rate,
      settings.tts_voice,
      JSON.stringify(settings.quiz_mix),
      JSON.stringify(settings.mcq_modes),
      settings.meaning_language,
      settings.compact_mode ? 1 : 0,
      settings.compact_single_expand ? 1 : 0,
      settings.lexicon_level,
      settings.font_scale,
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
