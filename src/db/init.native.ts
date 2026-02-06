import { getAllWords, getLexiconIds } from '../data/lexicons';
import { Word } from '../types';
import { DEFAULT_SETTINGS, LEXICON_VERSION, STAGE_SIZE } from './constants';
import { getAll, getFirst, run } from './db';

function toWordList(data: unknown): Word[] {
  return data as Word[];
}

function serializeExamples(word: Word) {
  if (!word.examples || word.examples.length === 0) return null;
  return JSON.stringify(word.examples);
}

let initPromise: Promise<void> | null = null;

async function ensureColumn(table: string, column: string, definition: string) {
  const columns = await getAll<{ name: string }>(`PRAGMA table_info(${table});`);
  if (columns.some((item) => item.name === column)) return;
  await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}

async function runInit() {
  const lexiconList = toWordList(getAllWords());
  await run(
    `CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY NOT NULL,
      level TEXT NOT NULL,
      kana TEXT NOT NULL,
      kanji TEXT,
      meaning_cn TEXT NOT NULL,
      meaning_en TEXT NOT NULL,
      pos TEXT,
      pitch TEXT,
      examples TEXT,
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
      font_scale TEXT,
      lexicon_version TEXT
    );`
  );

  await ensureColumn('words', 'meaning_en', 'TEXT');
  await ensureColumn('words', 'examples', 'TEXT');
  await ensureColumn('words', 'pitch', 'TEXT');
  await migrateWordsTable();
  await ensureColumn('settings', 'meaning_language', 'TEXT');
  await ensureColumn('settings', 'mcq_modes', 'TEXT');
  await ensureColumn('settings', 'compact_mode', 'INTEGER');
  await ensureColumn('settings', 'compact_single_expand', 'INTEGER');
  await ensureColumn('settings', 'lexicon_level', 'TEXT');
  await ensureColumn('settings', 'font_scale', 'TEXT');
  await ensureColumn('settings', 'lexicon_version', 'TEXT');

  const countRow = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM words');
  const count = countRow?.count ?? 0;
  const storedLexiconVersion = await getStoredLexiconVersion();
  const shouldReseedByVersion = storedLexiconVersion !== LEXICON_VERSION;

  if (count === 0) {
    await seedWords();
    await seedStages();
  } else {
    const shouldReseed = await needsReseedWords(lexiconList);
    if (shouldReseedByVersion) {
      await reseedWordsAndStagesPreserveProgress(lexiconList);
    } else if (shouldReseed) {
      await reseedWordsAndStages(lexiconList);
    } else {
      await run('UPDATE words SET meaning_en = meaning_cn WHERE meaning_en IS NULL OR meaning_en = "";');
      await seedMissingLexicons();
      await backfillPitch(lexiconList);
    }
  }

  if (count === 0) {
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
  const list = toWordList(getAllWords());
  await insertWords(list);
}

async function seedStages() {
  const list = toWordList(getAllWords());
  const levels = getLexiconIds();
  for (const level of levels) {
    const levelWords = list.filter((word) => word.level === level);
    await insertStages(level, levelWords);
  }
}

async function seedMissingLexicons() {
  const list = toWordList(getAllWords());
  const levels = getLexiconIds();
  for (const level of levels) {
    const row = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM words WHERE level = ?', [level]);
    const levelCount = row?.count ?? 0;
    const levelWords = list.filter((word) => word.level === level);
    if (levelWords.length === 0) continue;
    if (levelCount === 0) {
      await insertWords(levelWords);
    }
    const stageRow = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM stages WHERE level = ?', [level]);
    const stageCount = stageRow?.count ?? 0;
    if (stageCount === 0) {
      await insertStages(level, levelWords);
    }
  }
}

async function migrateWordsTable() {
  const columns = await getAll<{ name: string }>('PRAGMA table_info(words);');
  const hasLegacyExample = columns.some((item) => item.name === 'example' || item.name === 'example_cn');
  if (!hasLegacyExample) return;
  const hasExamples = columns.some((item) => item.name === 'examples');
  const rows = await getAll<Record<string, unknown>>('SELECT * FROM words');
  await run(
    `CREATE TABLE IF NOT EXISTS words_new (
      id TEXT PRIMARY KEY NOT NULL,
      level TEXT NOT NULL,
      kana TEXT NOT NULL,
      kanji TEXT,
      meaning_cn TEXT NOT NULL,
      meaning_en TEXT NOT NULL,
      pos TEXT,
      pitch TEXT,
      examples TEXT,
      tags TEXT
    );`
  );

  for (const row of rows) {
    const example = row.example ? String(row.example) : '';
    const exampleCn = row.example_cn ? String(row.example_cn) : '';
    let examples = hasExamples ? (row.examples as string | null) : null;
    if ((!examples || examples === '') && (example || exampleCn)) {
      examples = JSON.stringify([
        {
          ja_furigana: example || null,
          zh_cn: exampleCn || null,
        },
      ]);
    }
    await run(
      `INSERT OR REPLACE INTO words_new (id, level, kana, kanji, meaning_cn, meaning_en, pos, pitch, examples, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        row.id,
        row.level,
        row.kana,
        row.kanji ?? null,
        row.meaning_cn,
        row.meaning_en,
        row.pos ?? null,
        row.pitch ?? null,
        examples ?? null,
        row.tags ?? null,
      ]
    );
  }

  await run('DROP TABLE words;');
  await run('ALTER TABLE words_new RENAME TO words;');
}

async function backfillPitch(list: Word[]) {
  const candidates = list.filter((word) => word.pitch != null && String(word.pitch).trim() !== '');
  if (candidates.length === 0) return;
  for (const word of candidates) {
    await run('UPDATE words SET pitch = ? WHERE id = ? AND (pitch IS NULL OR pitch = "")', [
      word.pitch,
      word.id,
    ]);
  }
}

async function needsReseedWords(list: Word[]) {
  if (list.length === 0) return false;
  const sample = list.slice(0, 10);
  const placeholders = sample.map(() => '?').join(',');
  const row = await getFirst<{ count: number }>(
    `SELECT COUNT(*) as count FROM words WHERE id IN (${placeholders})`,
    sample.map((item) => item.id)
  );
  return (row?.count ?? 0) === 0;
}

async function reseedWordsAndStages(list: Word[]) {
  await run('DELETE FROM words;');
  await run('DELETE FROM stages;');
  await run('DELETE FROM mistakes;');
  await insertWords(list);
  const levels = getLexiconIds();
  for (const level of levels) {
    const levelWords = list.filter((word) => word.level === level);
    await insertStages(level, levelWords);
  }
  await run('UPDATE words SET meaning_en = meaning_cn WHERE meaning_en IS NULL OR meaning_en = "";');
}

async function reseedWordsAndStagesPreserveProgress(list: Word[]) {
  const existingWords = await getAll<{ id: string; level: string; kana: string; kanji: string | null }>(
    'SELECT id, level, kana, kanji FROM words'
  );
  const mapping = buildWordIdMapping(existingWords, list);
  await run('DELETE FROM words;');
  await run('DELETE FROM stages;');
  await insertWords(list);
  const levels = getLexiconIds();
  for (const level of levels) {
    const levelWords = list.filter((word) => word.level === level);
    await insertStages(level, levelWords);
  }
  await updateMistakeWordIds(mapping);
  await run('UPDATE words SET meaning_en = meaning_cn WHERE meaning_en IS NULL OR meaning_en = "";');
}

async function insertWords(list: Word[]) {
  for (const word of list) {
    const examplesJson = serializeExamples(word);
    await run(
      `INSERT OR REPLACE INTO words (id, level, kana, kanji, meaning_cn, meaning_en, pos, pitch, examples, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        word.id,
        word.level,
        word.kana,
        word.kanji ?? null,
        word.meaning_cn,
        word.meaning_en,
        word.pos ?? null,
        word.pitch ?? null,
        examplesJson,
        word.tags ? JSON.stringify(word.tags) : null,
      ]
    );
  }
}

async function insertStages(level: string, levelWords: Word[]) {
  const totalStages = Math.ceil(levelWords.length / STAGE_SIZE) || 1;

  for (let i = 0; i < totalStages; i += 1) {
    const chunk = levelWords.slice(i * STAGE_SIZE, (i + 1) * STAGE_SIZE);
    const stageId = `${level}-${i + 1}`;
    await run(
      `INSERT OR REPLACE INTO stages (id, level, stage_index, word_ids)
       VALUES (?, ?, ?, ?);`,
      [stageId, level, i + 1, JSON.stringify(chunk.map((word) => word.id))]
    );
  }
}

function makeWordKey(level: string, kana: string, kanji?: string | null) {
  return `${level}||${kana}||${kanji ?? ''}`;
}

function buildWordIdMapping(
  existingWords: Array<{ id: string; level: string; kana: string; kanji: string | null }>,
  newWords: Word[]
) {
  const buckets = new Map<string, string[]>();
  for (const word of existingWords) {
    const key = makeWordKey(word.level, word.kana, word.kanji);
    const list = buckets.get(key) ?? [];
    list.push(word.id);
    buckets.set(key, list);
  }

  const mapping = new Map<string, string>();
  for (const word of newWords) {
    const key = makeWordKey(word.level, word.kana, word.kanji);
    const list = buckets.get(key);
    if (!list || list.length === 0) continue;
    const oldId = list.shift();
    if (oldId) mapping.set(oldId, word.id);
  }

  return mapping;
}

async function updateMistakeWordIds(mapping: Map<string, string>) {
  if (mapping.size === 0) return;
  const rows = await getAll<{ word_id: string }>('SELECT DISTINCT word_id FROM mistakes');
  for (const row of rows) {
    const nextId = mapping.get(row.word_id);
    if (!nextId || nextId === row.word_id) continue;
    await run('UPDATE mistakes SET word_id = ? WHERE word_id = ?;', [nextId, row.word_id]);
  }
}

async function ensureDefaultSettings() {
  const existing = await getFirst<{ id: string; meaning_language?: string; lexicon_version?: string | null }>(
    'SELECT id, meaning_language, lexicon_version FROM settings WHERE id = ?',
    ['default']
  );
  if (!existing) {
    await run(
      'INSERT INTO settings (id, tts_rate, tts_voice, quiz_mix, mcq_modes, meaning_language, compact_mode, compact_single_expand, lexicon_level, font_scale, lexicon_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
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
        LEXICON_VERSION,
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
    if (!existing.lexicon_version || existing.lexicon_version !== LEXICON_VERSION) {
      await run('UPDATE settings SET lexicon_version = ? WHERE id = ?;', [LEXICON_VERSION, 'default']);
    }
  }
}

export { DEFAULT_SETTINGS };

async function getStoredLexiconVersion() {
  const row = await getFirst<{ lexicon_version?: string | null }>(
    'SELECT lexicon_version FROM settings WHERE id = ?',
    ['default']
  );
  return row?.lexicon_version ?? null;
}
