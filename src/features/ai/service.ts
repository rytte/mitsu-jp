import {
  AiSentenceAssembleItem,
  AiWritingTask,
  BankLevel,
  ExamQuestionType,
  RawExamItem,
  TranslationDirection,
  TranslationEvalResult,
  TranslationFocus,
  WritingEvalResult,
  WritingPurpose,
  WritingRegister,
} from '../../types';
import { DEFAULT_AI_PROVIDER_CONFIG } from './constants';
import { ConversationTurnResult, createResponsesProvider } from './provider';
import { loadAiProviderConfig } from './storage';

export async function generateExamQuizWithAi(level: BankLevel, count: number): Promise<RawExamItem[]> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.generateExamQuiz({ level, count });
}

export async function explainExamQuestionWithAi(params: {
  level: BankLevel;
  prompt: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  questionType?: ExamQuestionType;
}) {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.explainExamQuestion(params);
}

export async function startConversationWithAi(params: {
  level: BankLevel;
  scenarioTitle: string;
  scenarioDescription: string;
  goal: string;
}): Promise<ConversationTurnResult> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.startConversation(params);
}

export async function replyConversationWithAi(params: {
  level: BankLevel;
  scenarioTitle: string;
  scenarioDescription: string;
  goal: string;
  userInput: string;
  history: Array<{ role: 'assistant' | 'user'; text: string }>;
  turnIndex: number;
}): Promise<ConversationTurnResult> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.replyConversation(params);
}

export async function askDictionaryWithAi(params: {
  entry: string;
  followUp?: string;
  history?: Array<{ role: 'assistant' | 'user'; text: string }>;
}): Promise<string> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.askDictionary(params);
}

export async function generateSentenceAssembleWithAi(level: BankLevel, count: number): Promise<AiSentenceAssembleItem[]> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.generateSentenceAssemble({ level, count });
}

export async function generateWritingTasksWithAi(params: {
  level: BankLevel;
  count: number;
  purpose?: WritingPurpose;
  scenario?: string;
  register?: WritingRegister;
}): Promise<AiWritingTask[]> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.generateWritingTasks(params);
}

export async function askDictionaryStreamWithAi(params: {
  entry: string;
  followUp?: string;
  history?: Array<{ role: 'assistant' | 'user'; text: string }>;
  onDelta?: (chunk: string) => void;
}): Promise<string> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.askDictionaryStream(params);
}

export async function evaluateTranslationAnswerWithAi(params: {
  level: BankLevel;
  direction: TranslationDirection;
  focus?: TranslationFocus;
  sourceText: string;
  hint?: string;
  referenceAnswer: string;
  userAnswer: string;
}): Promise<TranslationEvalResult> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.evaluateTranslationAnswer(params);
}

export async function evaluateWritingAnswerWithAi(params: {
  task: AiWritingTask;
  userAnswer: string;
}): Promise<WritingEvalResult> {
  const config = await loadAiProviderConfig();
  if (config.provider_id !== DEFAULT_AI_PROVIDER_CONFIG.provider_id) {
    throw new Error(`暂不支持的 Provider：${config.provider_id}`);
  }
  const provider = createResponsesProvider(config);
  return provider.evaluateWritingAnswer(params);
}
