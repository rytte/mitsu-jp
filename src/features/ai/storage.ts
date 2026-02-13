import { Platform } from 'react-native';
import { AiProviderConfig } from '../../types';
import { DEFAULT_AI_PROVIDER_CONFIG } from './constants';

const STORAGE_KEY = 'jp_vocab_ai_provider_config';
const TOKEN_USAGE_STORAGE_KEY = 'jp_vocab_ai_token_usage_stats';

export type AiTokenUsageStats = {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  updated_at: number;
};

type AiTokenUsageDelta = {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
};

let secureStoreModulePromise: Promise<
  | {
      getItemAsync: (key: string) => Promise<string | null>;
      setItemAsync: (key: string, value: string) => Promise<void>;
      deleteItemAsync: (key: string) => Promise<void>;
    }
  | null
> | null = null;
let tokenUsageCache: AiTokenUsageStats | null = null;
let tokenUsageMutateQueue: Promise<void> = Promise.resolve();

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function normalizeConfig(value?: Partial<AiProviderConfig> | null): AiProviderConfig {
  const merged = {
    ...DEFAULT_AI_PROVIDER_CONFIG,
    ...(value ?? {}),
  };
  return {
    provider_id: String(merged.provider_id || DEFAULT_AI_PROVIDER_CONFIG.provider_id),
    provider_label: String(merged.provider_label || DEFAULT_AI_PROVIDER_CONFIG.provider_label),
    api_base_url: normalizeBaseUrl(String(merged.api_base_url || DEFAULT_AI_PROVIDER_CONFIG.api_base_url)),
    api_key: String(merged.api_key || ''),
    model: String(merged.model || DEFAULT_AI_PROVIDER_CONFIG.model),
    updated_at: Number.isFinite(Number(merged.updated_at)) ? Number(merged.updated_at) : 0,
  };
}

async function getSecureStore() {
  if (Platform.OS === 'web') return null;
  if (!secureStoreModulePromise) {
    secureStoreModulePromise = import('expo-secure-store')
      .then((mod) => ({
        getItemAsync: mod.getItemAsync,
        setItemAsync: mod.setItemAsync,
        deleteItemAsync: mod.deleteItemAsync,
      }))
      .catch(() => null);
  }
  return secureStoreModulePromise;
}

async function readRaw() {
  return readRawByKey(STORAGE_KEY);
}

async function readRawByKey(key: string) {
  const secureStore = await getSecureStore();
  if (secureStore) {
    return secureStore.getItemAsync(key);
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return null;
}

async function writeRaw(value: string) {
  return writeRawByKey(STORAGE_KEY, value);
}

async function writeRawByKey(key: string, value: string) {
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.setItemAsync(key, value);
    return;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
  }
}

export async function loadAiProviderConfig(): Promise<AiProviderConfig> {
  const raw = await readRaw();
  if (!raw) return normalizeConfig();
  try {
    const parsed = JSON.parse(raw) as Partial<AiProviderConfig>;
    return normalizeConfig(parsed);
  } catch {
    return normalizeConfig();
  }
}

export async function saveAiProviderConfig(config: AiProviderConfig) {
  const normalized = normalizeConfig({
    ...config,
    updated_at: Date.now(),
  });
  await writeRaw(JSON.stringify(normalized));
  return normalized;
}

export async function clearAiProviderConfig() {
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.deleteItemAsync(STORAGE_KEY);
    return;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function normalizeTokenUsageStats(value?: Partial<AiTokenUsageStats> | null): AiTokenUsageStats {
  return {
    input_tokens: Number.isFinite(Number(value?.input_tokens)) ? Number(value?.input_tokens) : 0,
    cached_input_tokens: Number.isFinite(Number(value?.cached_input_tokens)) ? Number(value?.cached_input_tokens) : 0,
    output_tokens: Number.isFinite(Number(value?.output_tokens)) ? Number(value?.output_tokens) : 0,
    updated_at: Number.isFinite(Number(value?.updated_at)) ? Number(value?.updated_at) : 0,
  };
}

async function writeTokenUsageStats(next: AiTokenUsageStats) {
  tokenUsageCache = normalizeTokenUsageStats(next);
  await writeRawByKey(TOKEN_USAGE_STORAGE_KEY, JSON.stringify(tokenUsageCache));
  return tokenUsageCache;
}

export async function loadAiTokenUsageStats(): Promise<AiTokenUsageStats> {
  if (tokenUsageCache) return tokenUsageCache;
  const raw = await readRawByKey(TOKEN_USAGE_STORAGE_KEY);
  if (!raw) {
    tokenUsageCache = normalizeTokenUsageStats();
    return tokenUsageCache;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AiTokenUsageStats>;
    tokenUsageCache = normalizeTokenUsageStats(parsed);
    return tokenUsageCache;
  } catch {
    tokenUsageCache = normalizeTokenUsageStats();
    return tokenUsageCache;
  }
}

export async function addAiTokenUsageStats(delta: AiTokenUsageDelta): Promise<AiTokenUsageStats> {
  let result = normalizeTokenUsageStats();
  await (tokenUsageMutateQueue = tokenUsageMutateQueue.then(async () => {
    const current = await loadAiTokenUsageStats();
    const next = normalizeTokenUsageStats({
      input_tokens: current.input_tokens + Math.max(0, Number(delta.input_tokens ?? 0)),
      cached_input_tokens: current.cached_input_tokens + Math.max(0, Number(delta.cached_input_tokens ?? 0)),
      output_tokens: current.output_tokens + Math.max(0, Number(delta.output_tokens ?? 0)),
      updated_at: Date.now(),
    });
    result = await writeTokenUsageStats(next);
  }));
  return result;
}

export async function clearAiTokenUsageStats() {
  tokenUsageCache = normalizeTokenUsageStats({ updated_at: Date.now() });
  await writeRawByKey(TOKEN_USAGE_STORAGE_KEY, JSON.stringify(tokenUsageCache));
  return tokenUsageCache;
}

