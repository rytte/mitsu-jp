import words from '../data/words.json';
import { Word } from '../types';
import { DEFAULT_SETTINGS, STAGE_SIZE } from './constants';
import { getAll, getFirst, run } from './db';

function toWordList(data: unknown): Word[] {
  return data as Word[];
}

let initPromise: Promise<void> | null = null;

async function ensureColumn(table: string, column: string, definition: string) {
  const columns = await getAll<{ name: string }>(`PRAGMA table_info(${table});`);
  if (columns.some((item) => item.name === column)) return;
  await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}

async function runInit() {
  await run(
    `CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY NOT NULL,
      level TEXT NOT NULL,
      kana TEXT NOT NULL,
      kanji TEXT,
      meaning_cn TEXT NOT NULL,
      meaning_en TEXT NOT NULL,
      pos TEXT,
      example TEXT,
      example_cn TEXT,
      tags TEXT
    );`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY NOT NULL,
      level TEXT NOT NULL,
      stage_index INTEGER NOT NULL,
      word_ids TEXT NOT NULL
    );`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY NOT NULL,
      stage_id TEXT NOT NULL,
      correct_count INTEGER NOT NULL,
      wrong_count INTEGER NOT NULL,
      last_played_at INTEGER NOT NULL,
      stars INTEGER NOT NULL
    );`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS mistakes (
      id TEXT PRIMARY KEY NOT NULL,
      word_id TEXT NOT NULL,
      wrong_times INTEGER NOT NULL,
      last_wrong_at INTEGER NOT NULL
    );`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY NOT NULL,
      tts_rate REAL NOT NULL,
      tts_voice TEXT,
      quiz_mix TEXT NOT NULL,
      mcq_modes TEXT,
      meaning_language TEXT,
      compact_mode INTEGER,
      compact_single_expand INTEGER,
      lexicon_level TEXT,
      font_scale TEXT
    );`
  );

  await ensureColumn('words', 'meaning_en', 'TEXT');
  await ensureColumn('settings', 'meaning_language', 'TEXT');
  await ensureColumn('settings', 'mcq_modes', 'TEXT');
  await ensureColumn('settings', 'compact_mode', 'INTEGER');
  await ensureColumn('settings', 'compact_single_expand', 'INTEGER');
  await ensureColumn('settings', 'lexicon_level', 'TEXT');
  await ensureColumn('settings', 'font_scale', 'TEXT');

  const countRow = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM words');
  const count = countRow?.count ?? 0;

  if (count === 0) {
    await seedWords();
    await seedStages();
  } else {
    await run('UPDATE words SET meaning_en = meaning_cn WHERE meaning_en IS NULL OR meaning_en = "";');
  }

  await ensureDefaultSettings();
}

export async function initDb() {
  if (!initPromise) {
    initPromise = runInit();
  }
  try {
    await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

async function seedWords() {
  const list = toWordList(words);
  for (const word of list) {
    await run(
      `INSERT INTO words (id, level, kana, kanji, meaning_cn, meaning_en, pos, example, example_cn, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        word.id,
        word.level,
        word.kana,
        word.kanji ?? null,
        word.meaning_cn,
        word.meaning_en,
        word.pos ?? null,
        word.example ?? null,
        word.example_cn ?? null,
        word.tags ? JSON.stringify(word.tags) : null,
      ]
    );
  }
}

async function seedStages() {
  const list = toWordList(words);
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

  for (const level of levels) {
    const levelWords = list.filter((word) => word.level === level);
    const totalStages = Math.ceil(levelWords.length / STAGE_SIZE) || 1;

    for (let i = 0; i < totalStages; i += 1) {
      const chunk = levelWords.slice(i * STAGE_SIZE, (i + 1) * STAGE_SIZE);
      const stageId = `${level}-${i + 1}`;
      await run(
        `INSERT INTO stages (id, level, stage_index, word_ids)
         VALUES (?, ?, ?, ?);`,
        [stageId, level, i + 1, JSON.stringify(chunk.map((word) => word.id))]
      );
    }
  }
}

async function ensureDefaultSettings() {
  const existing = await getFirst<{ id: string; meaning_language?: string }>(
    'SELECT id, meaning_language FROM settings WHERE id = ?',
    ['default']
  );
  if (!existing) {
    await run(
      'INSERT INTO settings (id, tts_rate, tts_voice, quiz_mix, mcq_modes, meaning_language, compact_mode, compact_single_expand, lexicon_level, font_scale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [
        'default',
        DEFAULT_SETTINGS.tts_rate,
        DEFAULT_SETTINGS.tts_voice,
        JSON.stringify(DEFAULT_SETTINGS.quiz_mix),
        JSON.stringify(DEFAULT_SETTINGS.mcq_modes),
        DEFAULT_SETTINGS.meaning_language,
        DEFAULT_SETTINGS.compact_mode ? 1 : 0,
        DEFAULT_SETTINGS.compact_single_expand ? 1 : 0,
        DEFAULT_SETTINGS.lexicon_level,
        DEFAULT_SETTINGS.font_scale,
      ]
    );
  } else {
    if (!existing.meaning_language) {
      await run('UPDATE settings SET meaning_language = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.meaning_language,
        'default',
      ]);
    }
    const mcqModes = await getFirst<{ mcq_modes?: string | null }>(
      'SELECT mcq_modes FROM settings WHERE id = ?',
      ['default']
    );
    if (!mcqModes?.mcq_modes) {
      await run('UPDATE settings SET mcq_modes = ? WHERE id = ?;', [
        JSON.stringify(DEFAULT_SETTINGS.mcq_modes),
        'default',
      ]);
    }
    const compact = await getFirst<{ compact_mode?: number | null }>(
      'SELECT compact_mode FROM settings WHERE id = ?',
      ['default']
    );
    if (compact?.compact_mode == null) {
      await run('UPDATE settings SET compact_mode = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.compact_mode ? 1 : 0,
        'default',
      ]);
    }
    const compactSingle = await getFirst<{ compact_single_expand?: number | null }>(
      'SELECT compact_single_expand FROM settings WHERE id = ?',
      ['default']
    );
    if (compactSingle?.compact_single_expand == null) {
      await run('UPDATE settings SET compact_single_expand = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.compact_single_expand ? 1 : 0,
        'default',
      ]);
    }
    const lexicon = await getFirst<{ lexicon_level?: string | null }>(
      'SELECT lexicon_level FROM settings WHERE id = ?',
      ['default']
    );
    if (!lexicon?.lexicon_level) {
      await run('UPDATE settings SET lexicon_level = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.lexicon_level,
        'default',
      ]);
    }
    const fontScale = await getFirst<{ font_scale?: string | null }>(
      'SELECT font_scale FROM settings WHERE id = ?',
      ['default']
    );
    if (!fontScale?.font_scale) {
      await run('UPDATE settings SET font_scale = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.font_scale,
        'default',
      ]);
    }
  }
}

export { DEFAULT_SETTINGS };
