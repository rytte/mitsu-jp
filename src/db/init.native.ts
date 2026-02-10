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
    `CREATE TABLE IF NOT EXISTS grammar_mistakes (
      id TEXT PRIMARY KEY NOT NULL,
      grammar_id TEXT NOT NULL,
      wrong_times INTEGER NOT NULL,
      last_wrong_at INTEGER NOT NULL
    );`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS vocab_book (
      word_id TEXT PRIMARY KEY NOT NULL,
      added_at INTEGER NOT NULL
    );`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY NOT NULL,
      tts_rate REAL NOT NULL,
      tts_voice TEXT,
      quiz_mix TEXT NOT NULL,
      mcq_modes TEXT,
      grammar_quiz_modes TEXT,
      meaning_language TEXT,
      show_example_furigana INTEGER,
      compact_mode INTEGER,
      compact_single_expand INTEGER,
      lexicon_level TEXT,
      font_scale TEXT,
      lexicon_version TEXT,
      nav_show_search INTEGER,
      nav_show_mistakes INTEGER,
      nav_show_vocab_book INTEGER,
      nav_show_kana INTEGER,
      nav_show_verb_conjugation INTEGER,
      nav_show_keigo INTEGER,
      nav_show_settings INTEGER
    );`
  );

  await ensureColumn('words', 'meaning_en', 'TEXT');
  await ensureColumn('words', 'examples', 'TEXT');
  await ensureColumn('words', 'pitch', 'TEXT');
  await migrateWordsTable();
  await ensureColumn('settings', 'meaning_language', 'TEXT');
  await ensureColumn('settings', 'mcq_modes', 'TEXT');
  await ensureColumn('settings', 'grammar_quiz_modes', 'TEXT');
  await ensureColumn('settings', 'show_example_furigana', 'INTEGER');
  await ensureColumn('settings', 'compact_mode', 'INTEGER');
  await ensureColumn('settings', 'compact_single_expand', 'INTEGER');
  await ensureColumn('settings', 'lexicon_level', 'TEXT');
  await ensureColumn('settings', 'font_scale', 'TEXT');
  await ensureColumn('settings', 'lexicon_version', 'TEXT');
  await ensureColumn('settings', 'nav_show_search', 'INTEGER');
  await ensureColumn('settings', 'nav_show_mistakes', 'INTEGER');
  await ensureColumn('settings', 'nav_show_vocab_book', 'INTEGER');
  await ensureColumn('settings', 'nav_show_kana', 'INTEGER');
  await ensureColumn('settings', 'nav_show_verb_conjugation', 'INTEGER');
  await ensureColumn('settings', 'nav_show_keigo', 'INTEGER');
  await ensureColumn('settings', 'nav_show_settings', 'INTEGER');

  const countRow = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM words');
  const count = countRow?.count ?? 0;
  const stageRow = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM stages');
  const stageCount = stageRow?.count ?? 0;
  const storedLexiconVersion = await getStoredLexiconVersion();
  const hasStoredVersion = storedLexiconVersion != null && storedLexiconVersion !== '';
  const shouldReseedByVersion = hasStoredVersion && storedLexiconVersion !== LEXICON_VERSION;

  if (count === 0) {
    const lexiconList = toWordList(getAllWords());
    await insertWords(lexiconList);
    await insertStagesFromList(lexiconList);
    await run('UPDATE words SET meaning_en = meaning_cn WHERE meaning_en IS NULL OR meaning_en = "";');
  } else if (stageCount === 0) {
    const lexiconList = toWordList(getAllWords());
    await insertStagesFromList(lexiconList);
  } else if (shouldReseedByVersion) {
    const lexiconList = toWordList(getAllWords());
    await reseedWordsAndStagesPreserveProgress(lexiconList);
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
  const list = toWordList(getAllWords());
  await insertWords(list);
}

async function seedStages() {
  const list = toWordList(getAllWords());
  await insertStagesFromList(list);
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
  await insertStagesFromList(list);
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
  await insertStagesFromList(list);
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

async function insertStagesFromList(list: Word[]) {
  const levels = getLexiconIds();
  for (const level of levels) {
    const levelWords = list.filter((word) => word.level === level);
    await insertStages(level, levelWords);
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
  const existing = await getFirst<{
    id: string;
    meaning_language?: string;
    lexicon_version?: string | null;
    nav_show_search?: number | null;
    nav_show_mistakes?: number | null;
    nav_show_vocab_book?: number | null;
    nav_show_kana?: number | null;
    nav_show_verb_conjugation?: number | null;
    nav_show_keigo?: number | null;
    nav_show_settings?: number | null;
  }>(
    'SELECT id, meaning_language, lexicon_version, nav_show_search, nav_show_mistakes, nav_show_vocab_book, nav_show_kana, nav_show_verb_conjugation, nav_show_keigo, nav_show_settings FROM settings WHERE id = ?',
    ['default']
  );
  if (!existing) {
    await run(
      'INSERT INTO settings (id, tts_rate, tts_voice, quiz_mix, mcq_modes, grammar_quiz_modes, meaning_language, show_example_furigana, compact_mode, compact_single_expand, lexicon_level, font_scale, lexicon_version, nav_show_search, nav_show_mistakes, nav_show_vocab_book, nav_show_kana, nav_show_verb_conjugation, nav_show_keigo, nav_show_settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
      [
        'default',
        DEFAULT_SETTINGS.tts_rate,
        DEFAULT_SETTINGS.tts_voice,
        JSON.stringify(DEFAULT_SETTINGS.quiz_mix),
        JSON.stringify(DEFAULT_SETTINGS.mcq_modes),
        JSON.stringify(DEFAULT_SETTINGS.grammar_quiz_modes),
        DEFAULT_SETTINGS.meaning_language,
        DEFAULT_SETTINGS.show_example_furigana ? 1 : 0,
        DEFAULT_SETTINGS.compact_mode ? 1 : 0,
        DEFAULT_SETTINGS.compact_single_expand ? 1 : 0,
        DEFAULT_SETTINGS.lexicon_level,
        DEFAULT_SETTINGS.font_scale,
        LEXICON_VERSION,
        DEFAULT_SETTINGS.nav_show_search ? 1 : 0,
        DEFAULT_SETTINGS.nav_show_mistakes ? 1 : 0,
        DEFAULT_SETTINGS.nav_show_vocab_book ? 1 : 0,
        DEFAULT_SETTINGS.nav_show_kana ? 1 : 0,
        DEFAULT_SETTINGS.nav_show_verb_conjugation ? 1 : 0,
        DEFAULT_SETTINGS.nav_show_keigo ? 1 : 0,
        DEFAULT_SETTINGS.nav_show_settings ? 1 : 0,
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
    const grammarModes = await getFirst<{ grammar_quiz_modes?: string | null }>(
      'SELECT grammar_quiz_modes FROM settings WHERE id = ?',
      ['default']
    );
    if (!grammarModes?.grammar_quiz_modes) {
      await run('UPDATE settings SET grammar_quiz_modes = ? WHERE id = ?;', [
        JSON.stringify(DEFAULT_SETTINGS.grammar_quiz_modes),
        'default',
      ]);
    }
    const exampleFurigana = await getFirst<{ show_example_furigana?: number | null }>(
      'SELECT show_example_furigana FROM settings WHERE id = ?',
      ['default']
    );
    if (exampleFurigana?.show_example_furigana == null) {
      await run('UPDATE settings SET show_example_furigana = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.show_example_furigana ? 1 : 0,
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
    const navSearch = await getFirst<{ nav_show_search?: number | null }>(
      'SELECT nav_show_search FROM settings WHERE id = ?',
      ['default']
    );
    if (navSearch?.nav_show_search == null) {
      await run('UPDATE settings SET nav_show_search = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.nav_show_search ? 1 : 0,
        'default',
      ]);
    }
    const navMistakes = await getFirst<{ nav_show_mistakes?: number | null }>(
      'SELECT nav_show_mistakes FROM settings WHERE id = ?',
      ['default']
    );
    if (navMistakes?.nav_show_mistakes == null) {
      await run('UPDATE settings SET nav_show_mistakes = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.nav_show_mistakes ? 1 : 0,
        'default',
      ]);
    }
    const navVocabBook = await getFirst<{ nav_show_vocab_book?: number | null }>(
      'SELECT nav_show_vocab_book FROM settings WHERE id = ?',
      ['default']
    );
    if (navVocabBook?.nav_show_vocab_book == null) {
      await run('UPDATE settings SET nav_show_vocab_book = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.nav_show_vocab_book ? 1 : 0,
        'default',
      ]);
    }
    const navKana = await getFirst<{ nav_show_kana?: number | null }>(
      'SELECT nav_show_kana FROM settings WHERE id = ?',
      ['default']
    );
    if (navKana?.nav_show_kana == null) {
      await run('UPDATE settings SET nav_show_kana = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.nav_show_kana ? 1 : 0,
        'default',
      ]);
    }
    const navVerb = await getFirst<{ nav_show_verb_conjugation?: number | null }>(
      'SELECT nav_show_verb_conjugation FROM settings WHERE id = ?',
      ['default']
    );
    if (navVerb?.nav_show_verb_conjugation == null) {
      await run('UPDATE settings SET nav_show_verb_conjugation = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.nav_show_verb_conjugation ? 1 : 0,
        'default',
      ]);
    }
    const navKeigo = await getFirst<{ nav_show_keigo?: number | null }>(
      'SELECT nav_show_keigo FROM settings WHERE id = ?',
      ['default']
    );
    if (navKeigo?.nav_show_keigo == null) {
      await run('UPDATE settings SET nav_show_keigo = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.nav_show_keigo ? 1 : 0,
        'default',
      ]);
    }
    const navSettings = await getFirst<{ nav_show_settings?: number | null }>(
      'SELECT nav_show_settings FROM settings WHERE id = ?',
      ['default']
    );
    if (navSettings?.nav_show_settings == null) {
      await run('UPDATE settings SET nav_show_settings = ? WHERE id = ?;', [
        DEFAULT_SETTINGS.nav_show_settings ? 1 : 0,
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
