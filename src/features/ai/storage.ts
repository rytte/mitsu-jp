import { Platform } from 'react-native';
import { AiProviderConfig } from '../../types';
import { DEFAULT_AI_PROVIDER_CONFIG } from './constants';

const STORAGE_KEY = 'jp_vocab_ai_provider_config';

let secureStoreModulePromise: Promise<
  | {
      getItemAsync: (key: string) => Promise<string | null>;
      setItemAsync: (key: string, value: string) => Promise<void>;
      deleteItemAsync: (key: string) => Promise<void>;
    }
  | null
> | null = null;

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
  const secureStore = await getSecureStore();
  if (secureStore) {
    return secureStore.getItemAsync(STORAGE_KEY);
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(STORAGE_KEY);
  }
  return null;
}

async function writeRaw(value: string) {
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.setItemAsync(STORAGE_KEY, value);
    return;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, value);
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

