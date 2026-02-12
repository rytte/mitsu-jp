import { BankLevel, RawExamItem } from '../../types';
import { DEFAULT_AI_PROVIDER_CONFIG } from './constants';
import { createResponsesProvider } from './provider';
import { loadAiProviderConfig } from './storage';

export async function generateExamQuizWithAi(level: BankLevel, count: number): Promise<RawExamItem[]> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.generateExamQuiz({ level, count });
}

