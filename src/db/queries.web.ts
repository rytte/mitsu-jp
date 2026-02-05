import { getAllWords, getLexiconIds, isLexiconId } from '../data/lexicons';
import { FontScale, Level, McqModes, MeaningLanguage, Progress, Settings, Stage, Word } from '../types';
import { DEFAULT_SETTINGS, STAGE_SIZE } from './constants';
import {
  ensureWebStorage,
  loadMistakeMap,
  loadProgressMap,
  loadSettings,
  saveMistakeMap,
  saveProgressMap,
  saveSettings,
} from './webStore';

const LEVELS: Level[] = getLexiconIds();

function toWordList(data: unknown): Word[] {
  return data as Word[];
}

function normalizeMeaningLanguage(value?: string): MeaningLanguage {
  return value === 'en' ? 'en' : 'zh';
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

const wordList = toWordList(getAllWords());
let stageCache: Record<Level, Stage[]> | null = null;

function buildStages(): Record<Level, Stage[]> {
  if (stageCache) return stageCache;
  const map = {} as Record<Level, Stage[]>;
  for (const level of LEVELS) {
    const levelWords = wordList.filter((word) => word.level === level);
    const totalStages = Math.ceil(levelWords.length / STAGE_SIZE) || 1;
    map[level] = [];
    for (let i = 0; i < totalStages; i += 1) {
      const chunk = levelWords.slice(i * STAGE_SIZE, (i + 1) * STAGE_SIZE);
      map[level].push({
        id: `${level}-${i + 1}`,
        level,
        index: i + 1,
        word_ids: chunk.map((word) => word.id),
      });
    }
  }
  stageCache = map;
  return map;
}

export async function initDb() {
  ensureWebStorage();
}

export async function getStagesByLevel(level: Level): Promise<Stage[]> {
  const stages = buildStages();
  return stages[level];
}

export async function getStage(stageId: string): Promise<Stage | null> {
  const [level] = stageId.split('-') as [Level];
  const stages = buildStages();
  return stages[level]?.find((stage) => stage.id === stageId) ?? null;
}

export async function getProgressMapByLevel(level: Level): Promise<Record<string, Progress>> {
  const progressMap = loadProgressMap() as Record<string, Progress>;
  const stages = buildStages()[level] ?? [];
  const result: Record<string, Progress> = {};
  for (const stage of stages) {
    if (progressMap[stage.id]) {
      result[stage.id] = progressMap[stage.id];
    }
  }
  return result;
}

export async function saveProgress(stageId: string, correct: number, wrong: number, stars: number) {
  const progressMap = loadProgressMap() as Record<string, Progress>;
  progressMap[stageId] = {
    id: stageId,
    stage_id: stageId,
    correct_count: correct,
    wrong_count: wrong,
    last_played_at: Date.now(),
    stars,
  };
  saveProgressMap(progressMap);
}

export async function recordMistake(wordId: string) {
  const map = loadMistakeMap() as Record<string, { word_id: string; wrong_times: number; last_wrong_at: number }>;
  const existing = map[wordId];
  if (!existing) {
    map[wordId] = { word_id: wordId, wrong_times: 1, last_wrong_at: Date.now() };
  } else {
    map[wordId] = {
      ...existing,
      wrong_times: existing.wrong_times + 1,
      last_wrong_at: Date.now(),
    };
  }
  saveMistakeMap(map);
}

export async function clearAllMistakes() {
  saveMistakeMap({});
}

export async function getMistakeWords(): Promise<(Word & { wrong_times: number })[]> {
  const map = loadMistakeMap() as Record<string, { word_id: string; wrong_times: number; last_wrong_at: number }>;
  const list = Object.values(map)
    .sort((a, b) => b.wrong_times - a.wrong_times || b.last_wrong_at - a.last_wrong_at)
    .map((item) => {
      const word = wordList.find((w) => w.id === item.word_id);
      if (!word) return null;
      return { ...word, wrong_times: item.wrong_times };
    })
    .filter(Boolean) as (Word & { wrong_times: number })[];
  return list;
}

export async function getMistakeWordIdsByLevel(level: Level): Promise<string[]> {
  const map = loadMistakeMap() as Record<string, { word_id: string }>; 
  const ids = Object.keys(map);
  return wordList.filter((word) => word.level === level && ids.includes(word.id)).map((word) => word.id);
}

export async function getWordsByIds(ids: string[]): Promise<Word[]> {
  const idSet = new Set(ids);
  return wordList.filter((word) => idSet.has(word.id));
}

export async function getAllWordsByLevel(level: Level): Promise<Word[]> {
  return wordList.filter((word) => word.level === level);
}

export async function getSettings(): Promise<Settings> {
  const settings = { ...DEFAULT_SETTINGS, ...(loadSettings() as Partial<Settings>) };
  return {
    ...settings,
    mcq_modes: normalizeMcqModes(settings.mcq_modes),
    meaning_language: normalizeMeaningLanguage(settings.meaning_language),
    compact_mode: Boolean(settings.compact_mode),
    compact_single_expand: Boolean(settings.compact_single_expand),
    lexicon_level: normalizeLexiconLevel(settings.lexicon_level),
    font_scale: normalizeFontScale(settings.font_scale),
  };
}

export async function updateSettings(settings: Settings) {
  saveSettings(settings);
}

export async function getStats() {
  const stages = buildStages();
  const stageCount = LEVELS.reduce((sum, level) => sum + stages[level].length, 0);
  const progressMap = loadProgressMap() as Record<string, Progress>;
  const completed = Object.values(progressMap).filter((item) => item.stars >= 1).length;
  const correct = Object.values(progressMap).reduce((sum, item) => sum + item.correct_count, 0);
  const wrong = Object.values(progressMap).reduce((sum, item) => sum + item.wrong_count, 0);
  return { stageCount, completed, correct, wrong };
}
