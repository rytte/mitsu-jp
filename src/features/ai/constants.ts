export const OPENAI_RESPONSES_PROVIDER_ID = 'openai_responses';

export const DEFAULT_AI_PROVIDER_CONFIG = {
  provider_id: OPENAI_RESPONSES_PROVIDER_ID,
  provider_label: 'OpenAI Compatible (Responses)',
  api_base_url: 'https://api.openai.com/v1',
  api_key: '',
  model: 'gpt-4.1-mini',
  updated_at: 0,
} as const;

