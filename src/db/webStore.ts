import { DEFAULT_SETTINGS } from './constants';

const SETTINGS_KEY = 'jp_vocab_settings';
const PROGRESS_KEY = 'jp_vocab_progress';
const MISTAKES_KEY = 'jp_vocab_mistakes';
const GRAMMAR_MISTAKES_KEY = 'jp_grammar_mistakes';

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function ensureWebStorage() {
  if (!safeGet(SETTINGS_KEY)) {
    safeSet(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!safeGet(PROGRESS_KEY)) {
    safeSet(PROGRESS_KEY, JSON.stringify({}));
  }
  if (!safeGet(MISTAKES_KEY)) {
    safeSet(MISTAKES_KEY, JSON.stringify({}));
  }
  if (!safeGet(GRAMMAR_MISTAKES_KEY)) {
    safeSet(GRAMMAR_MISTAKES_KEY, JSON.stringify({}));
  }
}

export function loadSettings() {
  const raw = safeGet(SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: unknown) {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadProgressMap() {
  const raw = safeGet(PROGRESS_KEY);
  if (!raw) return {} as Record<string, unknown>;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export function saveProgressMap(map: Record<string, unknown>) {
  safeSet(PROGRESS_KEY, JSON.stringify(map));
}

export function loadMistakeMap() {
  const raw = safeGet(MISTAKES_KEY);
  if (!raw) return {} as Record<string, unknown>;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export function saveMistakeMap(map: Record<string, unknown>) {
  safeSet(MISTAKES_KEY, JSON.stringify(map));
}

export function loadGrammarMistakeMap() {
  const raw = safeGet(GRAMMAR_MISTAKES_KEY);
  if (!raw) return {} as Record<string, unknown>;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export function saveGrammarMistakeMap(map: Record<string, unknown>) {
  safeSet(GRAMMAR_MISTAKES_KEY, JSON.stringify(map));
}
