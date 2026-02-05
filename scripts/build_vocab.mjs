import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { parse } from 'csv-parse/sync';
import chainPkg from 'stream-chain';
import streamJsonPkg from 'stream-json';
import pickPkg from 'stream-json/filters/Pick.js';
import streamArrayPkg from 'stream-json/streamers/StreamArray.js';

const { chain } = chainPkg;
const { parser } = streamJsonPkg;
const { pick } = pickPkg;
const { streamArray } = streamArrayPkg;

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'scripts', 'data');
const WORDS_DIR = path.join(ROOT, 'src', 'data');
const OUT_FILE = path.join(WORDS_DIR, 'words.json');
const CHINESE_GLOSSARY_CSV = path.join(DATA_DIR, 'jlpt-zh.csv');
const CHINESE_GLOSSARY_JSON = path.join(DATA_DIR, 'jlpt-zh.json');

const JLPT_SOURCES = {
  N5: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n5.csv',
  N4: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n4.csv',
  N3: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n3.csv',
  N2: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n2.csv',
  N1: 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n1.csv',
};

const JMDICT_RELEASE_API = 'https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest, minSize = 1) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      const size = fs.statSync(dest).size;
      if (size >= minSize) {
        resolve();
        return;
      }
    }
    const client = url.startsWith('https') ? https : http;
    const request = client.get(
      url,
      {
        headers: {
          'User-Agent': 'jp-vocab-builder',
          Accept: 'application/octet-stream',
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Download failed: ${url} (${res.statusCode})`));
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
      }
    );
    request.on('error', reject);
  });
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'jp-vocab-builder',
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk.toString('utf8')));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
  });
}

function findLocalJmdictAll() {
  const files = fs.readdirSync(DATA_DIR).filter((name) => name.startsWith('jmdict-all-') && name.endsWith('.json'));
  if (files.length === 0) return null;
  return path.join(DATA_DIR, files.sort().pop());
}

async function ensureJmdictAllJson() {
  const existing = findLocalJmdictAll();
  if (existing) return existing;

  const release = await fetchJson(JMDICT_RELEASE_API);
  const asset = release.assets.find((item) => String(item.name).startsWith('jmdict-all-') && String(item.name).endsWith('.json.tgz'));
  if (!asset) {
    throw new Error('Could not find jmdict-all asset');
  }
  const tgzPath = path.join(DATA_DIR, 'jmdict-all.json.tgz');
  await download(asset.browser_download_url, tgzPath, 10000000);
  execFileSync('tar', ['-xzf', tgzPath, '-C', DATA_DIR]);
  const jsonPath = findLocalJmdictAll();
  if (!jsonPath) {
    throw new Error('Extracted archive but no jmdict-all JSON found');
  }
  return jsonPath;
}

function hasKanji(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function normalizeMeaning(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function makeId(level, index) {
  return `${level}-${String(index + 1).padStart(4, '0')}`;
}

function parseJlptCsv(filePath, level) {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
  return records.map((row) => ({
    level,
    expression: String(row.expression || '').trim(),
    reading: String(row.reading || '').trim(),
    meaning: normalizeMeaning(String(row.meaning || '')),
    tags: String(row.tags || '')
      .split(/\s+/)
      .filter(Boolean),
  }));
}

function pickFirst(row, keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return String(row[key]).trim();
  }
  return '';
}

function toGlossaryKey(expression, reading) {
  return `${expression}|${reading}`;
}

function loadChineseGlossaryFromJson(filePath) {
  const map = new Map();
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const expression = pickFirst(item, ['expression', 'kanji', 'word', 'term']);
      const reading = pickFirst(item, ['reading', 'kana', 'yomi', 'furigana', 'pronunciation']);
      const meaning = pickFirst(item, ['meaning_cn', 'meaning_zh', 'meaning', 'definition', 'zh']);
      const finalExpression = expression || reading;
      const finalReading = reading || expression;
      if (!finalExpression || !finalReading || !meaning) continue;
      map.set(toGlossaryKey(finalExpression, finalReading), normalizeMeaning(meaning));
    }
    return map;
  }

  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      if (!key || value == null) continue;
      if (typeof value === 'string') {
        map.set(key, normalizeMeaning(value));
        continue;
      }
      if (typeof value === 'object') {
        const meaning = pickFirst(value, ['meaning_cn', 'meaning_zh', 'meaning', 'definition', 'zh']);
        if (meaning) map.set(key, normalizeMeaning(meaning));
      }
    }
  }

  return map;
}

function loadChineseGlossaryFromCsv(filePath) {
  const map = new Map();
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  for (const row of records) {
    const expression = pickFirst(row, ['expression', 'kanji', 'word', 'term']);
    const reading = pickFirst(row, ['reading', 'kana', 'yomi', 'furigana', 'pronunciation']);
    const meaning = pickFirst(row, ['meaning_cn', 'meaning_zh', 'meaning', 'definition', 'zh']);
    const finalExpression = expression || reading;
    const finalReading = reading || expression;
    if (!finalExpression || !finalReading || !meaning) continue;
    map.set(toGlossaryKey(finalExpression, finalReading), normalizeMeaning(meaning));
  }

  return map;
}

function loadChineseGlossary() {
  if (fs.existsSync(CHINESE_GLOSSARY_JSON)) {
    return { source: CHINESE_GLOSSARY_JSON, map: loadChineseGlossaryFromJson(CHINESE_GLOSSARY_JSON) };
  }
  if (fs.existsSync(CHINESE_GLOSSARY_CSV)) {
    return { source: CHINESE_GLOSSARY_CSV, map: loadChineseGlossaryFromCsv(CHINESE_GLOSSARY_CSV) };
  }
  return { source: null, map: new Map() };
}

function isChineseLang(lang) {
  if (!lang) return false;
  const v = String(lang).toLowerCase();
  return v.startsWith('zh') || v.startsWith('chi') || v.startsWith('zho') || v.startsWith('cmn');
}

async function buildJMDictMap(jlptKeySet) {
  const jsonPath = await ensureJmdictAllJson();
  const map = new Map();
  const remainingKeys = new Set(jlptKeySet);

  await new Promise((resolve, reject) => {
    const pipeline = chain([
      fs.createReadStream(jsonPath),
      parser(),
      pick({ filter: 'words' }),
      streamArray(),
    ]);

    pipeline.on('data', ({ value }) => {
      const kebs = (value.kanji || []).map((item) => item.text);
      const rebs = (value.kana || []).map((item) => item.text);
      if (rebs.length === 0) return;

      const glossEn = [];
      const glossZh = [];
      for (const sense of value.sense || []) {
        for (const gloss of sense.gloss || []) {
          const lang = gloss.lang || 'eng';
          const text = String(gloss.text || '').trim();
          if (!text) continue;
          if (!lang || lang === 'eng') {
            glossEn.push(text);
          } else if (isChineseLang(lang)) {
            glossZh.push(text);
          }
        }
      }

      const kanjiList = kebs.length ? kebs : rebs;
      const keys = new Set();
      for (const reb of rebs) {
        if (remainingKeys.has(`${reb}|${reb}`)) keys.add(`${reb}|${reb}`);
        for (const keb of kanjiList) {
          const key = `${keb}|${reb}`;
          if (remainingKeys.has(key)) keys.add(key);
        }
      }
      if (keys.size === 0) return;

      const en = glossEn.length ? glossEn.join('; ') : '';
      const zh = glossZh.length ? glossZh.join('; ') : '';

      for (const key of keys) {
        remainingKeys.delete(key);
        const existing = map.get(key) || { en: '', zh: '' };
        map.set(key, {
          en: existing.en || en,
          zh: existing.zh || zh,
        });
      }

      if (remainingKeys.size === 0) {
        pipeline.destroy();
      }
    });

    pipeline.on('end', resolve);
    pipeline.on('close', resolve);
    pipeline.on('error', reject);
  });

  return map;
}

async function main() {
  ensureDir(DATA_DIR);
  ensureDir(WORDS_DIR);

  const jlptEntries = [];
  const jlptKeySet = new Set();
  const seenLevelKeys = new Set();

  for (const [level, url] of Object.entries(JLPT_SOURCES)) {
    const filePath = path.join(DATA_DIR, `${level}.csv`);
    await download(url, filePath, 1000);
    const list = parseJlptCsv(filePath, level);
    for (const item of list) {
      const expression = item.expression || item.reading;
      const reading = item.reading || item.expression;
      if (!expression || !reading) continue;
      const levelKey = `${level}|${expression}|${reading}`;
      if (seenLevelKeys.has(levelKey)) continue;
      seenLevelKeys.add(levelKey);

      const key = `${expression}|${reading}`;
      jlptKeySet.add(key);
      jlptKeySet.add(`${reading}|${reading}`);
      jlptEntries.push({ ...item, expression, reading });
    }
  }

  const jmdictMap = await buildJMDictMap(jlptKeySet);
  const { source: zhSource, map: zhGlossary } = loadChineseGlossary();
  if (zhSource) {
    console.log(`Loaded Chinese glossary: ${zhSource} (${zhGlossary.size} entries)`);
  }

  let zhMatched = 0;
  const words = jlptEntries.map((entry, index) => {
    const level = entry.level;
    const expression = entry.expression;
    const reading = entry.reading;
    const key = `${expression}|${reading}`;
    const fallbackKey = `${reading}|${reading}`;
    const dict = jmdictMap.get(key) || jmdictMap.get(fallbackKey) || { en: '', zh: '' };

    const meaningEn = entry.meaning || dict.en || '';
    const customZh = zhGlossary.get(key) || zhGlossary.get(fallbackKey) || '';
    const meaningZh = customZh || dict.zh || '';
    if (customZh) zhMatched += 1;

    return {
      id: makeId(level, index),
      level,
      kana: reading,
      kanji: hasKanji(expression) ? expression : null,
      meaning_cn: meaningZh || meaningEn,
      meaning_en: meaningEn,
      pos: null,
      example: null,
      example_cn: null,
      tags: entry.tags.length ? entry.tags : null,
    };
  });

  if (zhSource) {
    console.log(`Chinese glossary matched: ${zhMatched} / ${words.length}`);
  }

  const byLevel = new Map();
  for (const word of words) {
    const list = byLevel.get(word.level) || [];
    list.push(word);
    byLevel.set(word.level, list);
  }

  for (const [level, list] of byLevel.entries()) {
    const out = path.join(WORDS_DIR, `words-${String(level).toLowerCase()}.json`);
    fs.writeFileSync(out, JSON.stringify(list, null, 2), 'utf8');
    console.log(`Generated ${list.length} words -> ${out}`);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(words, null, 2), 'utf8');
  console.log(`Generated ${words.length} words -> ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
