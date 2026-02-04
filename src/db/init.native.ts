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
      meaning_language TEXT
    );`
  );

  await ensureColumn('words', 'meaning_en', 'TEXT');
  await ensureColumn('settings', 'meaning_language', 'TEXT');

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
      'INSERT INTO settings (id, tts_rate, tts_voice, quiz_mix, meaning_language) VALUES (?, ?, ?, ?, ?);',
      [
        'default',
        DEFAULT_SETTINGS.tts_rate,
        DEFAULT_SETTINGS.tts_voice,
        JSON.stringify(DEFAULT_SETTINGS.quiz_mix),
        DEFAULT_SETTINGS.meaning_language,
      ]
    );
  } else if (!existing.meaning_language) {
    await run('UPDATE settings SET meaning_language = ? WHERE id = ?;', [
      DEFAULT_SETTINGS.meaning_language,
      'default',
    ]);
  }
}

export { DEFAULT_SETTINGS };
