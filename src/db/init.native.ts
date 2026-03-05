import { getAllWords, getLexiconIds } from '../data/lexicons';
import { Word } from '../types';
import { DEFAULT_SETTINGS, LEXICON_VERSION, STAGE_SIZE } from './constants';
import { getFirst, run } from './db';

function toWordList(data: unknown): Word[] {
  return data as Word[];
}

function serializeExamples(word: Word) {
  if (!word.examples || word.examples.length === 0) return null;
  return JSON.stringify(word.examples);
}

let initPromise: Promise<void> | null = null;

async function runInit() {
  await run(
    `CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY NOT NULL,
      level TEXT NOT NULL,
      kana TEXT NOT NULL,
      kanji TEXT,
      audio TEXT,
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
      pronunciation_source TEXT,
      quiz_mix TEXT NOT NULL,
      mcq_modes TEXT,
      grammar_quiz_modes TEXT,
      meaning_language TEXT,
      show_example_furigana INTEGER,
      compact_mode INTEGER,
      compact_single_expand INTEGER,
      lexicon_level TEXT,
      lexicon_auto_enter INTEGER,
      font_scale TEXT,
      lexicon_version TEXT,
      nav_show_search INTEGER,
      nav_show_mistakes INTEGER,
      nav_show_vocab_book INTEGER,
      nav_show_kana INTEGER,
      nav_show_verb_conjugation INTEGER,
      nav_show_keigo INTEGER,
      nav_show_ai_hub INTEGER,
      nav_show_exam_quiz INTEGER,
      nav_show_settings INTEGER
    );`
  );

  const lexiconList = toWordList(getAllWords());
  const countRow = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM words');
  if ((countRow?.count ?? 0) === 0) {
    await insertWords(lexiconList);
  }

  const stageRow = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM stages');
  if ((stageRow?.count ?? 0) === 0) {
    await insertStagesFromList(lexiconList);
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

async function insertWords(list: Word[]) {
  for (const word of list) {
    const examplesJson = serializeExamples(word);
    await run(
      `INSERT OR REPLACE INTO words (id, level, kana, kanji, audio, meaning_cn, meaning_en, pos, pitch, examples, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        word.id,
        word.level,
        word.kana,
        word.kanji ?? null,
        word.audio ?? null,
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

async function ensureDefaultSettings() {
  const existing = await getFirst<{ id: string }>('SELECT id FROM settings WHERE id = ?', ['default']);
  if (existing) return;
  await run(
    'INSERT INTO settings (id, tts_rate, tts_voice, pronunciation_source, quiz_mix, mcq_modes, grammar_quiz_modes, meaning_language, show_example_furigana, compact_mode, compact_single_expand, lexicon_level, lexicon_auto_enter, font_scale, lexicon_version, nav_show_search, nav_show_mistakes, nav_show_vocab_book, nav_show_kana, nav_show_verb_conjugation, nav_show_keigo, nav_show_ai_hub, nav_show_exam_quiz, nav_show_settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
    [
      'default',
      DEFAULT_SETTINGS.tts_rate,
      DEFAULT_SETTINGS.tts_voice,
      DEFAULT_SETTINGS.pronunciation_source,
      JSON.stringify(DEFAULT_SETTINGS.quiz_mix),
      JSON.stringify(DEFAULT_SETTINGS.mcq_modes),
      JSON.stringify(DEFAULT_SETTINGS.grammar_quiz_modes),
      DEFAULT_SETTINGS.meaning_language,
      DEFAULT_SETTINGS.show_example_furigana ? 1 : 0,
      DEFAULT_SETTINGS.compact_mode ? 1 : 0,
      DEFAULT_SETTINGS.compact_single_expand ? 1 : 0,
      DEFAULT_SETTINGS.lexicon_level,
      DEFAULT_SETTINGS.lexicon_auto_enter ? 1 : 0,
      DEFAULT_SETTINGS.font_scale,
      LEXICON_VERSION,
      DEFAULT_SETTINGS.nav_show_search ? 1 : 0,
      DEFAULT_SETTINGS.nav_show_mistakes ? 1 : 0,
      DEFAULT_SETTINGS.nav_show_vocab_book ? 1 : 0,
      DEFAULT_SETTINGS.nav_show_kana ? 1 : 0,
      DEFAULT_SETTINGS.nav_show_verb_conjugation ? 1 : 0,
      DEFAULT_SETTINGS.nav_show_keigo ? 1 : 0,
      DEFAULT_SETTINGS.nav_show_ai_hub ? 1 : 0,
      DEFAULT_SETTINGS.nav_show_exam_quiz ? 1 : 0,
      DEFAULT_SETTINGS.nav_show_settings ? 1 : 0,
    ]
  );
}

export { DEFAULT_SETTINGS };
