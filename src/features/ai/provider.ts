import { BankLevel, RawExamItem } from '../../types';
import { AiProviderConfig } from '../../types';

type GenerateExamQuizParams = {
  level: BankLevel;
  count: number;
};

type ExplainExamQuestionParams = {
  level: BankLevel;
  prompt: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
};

export type AiQuizProvider = {
  generateExamQuiz: (params: GenerateExamQuizParams) => Promise<RawExamItem[]>;
  explainExamQuestion: (params: ExplainExamQuestionParams) => Promise<string>;
};

const LEVEL_GUIDE: Record<BankLevel, string> = {
  N1: '高级：抽象议题、书面语、细微语感区分，干扰项相近。',
  N2: '中高级：新闻/说明文常见表达，语法和词汇辨析并重。',
  N3: '中级：生活和学习场景，兼顾常见语法与词义辨析。',
  N4: '初中级：基础句型和常见生活词汇，难度适中。',
  N5: '初级：最常见基础词汇和句型，句子短而清晰。',
};

const RESPONSES_SCHEMA = {
  type: 'json_schema',
  name: 'exam_items_schema',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'question_html', 'options', 'answer_index'],
          properties: {
            id: { type: 'string', minLength: 1 },
            question_html: { type: 'string', minLength: 1 },
            options: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: { type: 'string', minLength: 1 },
            },
            answer_index: {
              type: 'integer',
              minimum: 1,
              maximum: 4,
            },
          },
        },
      },
    },
  },
  strict: true,
} as const;

function buildSystemPrompt() {
  return [
    'You are a JLPT exam-item generator for Japanese learners.',
    'Produce machine-readable quiz items for a mobile app.',
    'Hard constraints:',
    '1) Output must strictly follow the JSON Schema.',
    '2) options must contain exactly 4 unique choices.',
    '3) answer_index must be an integer from 1 to 4 and match the correct option.',
    '4) question_html can be plain text or simple HTML; for cloze questions mark the answer slot as <font color="#ef3461">{{c1::correct_answer}}</font>.',
    '5) Every item must be single-choice.',
    '6) Use natural Japanese in stems and options.',
    '7) Do not output explanations, markdown, comments, or extra fields.',
  ].join('\n');
}

function buildUserPrompt(level: BankLevel, count: number) {
  return [
    `Generate ${count} JLPT ${level} single-choice questions.`,
    `Difficulty guide: ${LEVEL_GUIDE[level]}`,
    'Style requirements:',
    '- Mix vocabulary, grammar, and contextual cloze questions.',
    '- Distractors should be plausible but still wrong.',
    '- Keep stems concise for mobile reading.',
    '- Each question must have exactly one correct answer.',
    '- Use id format ai-LEVEL-INDEX, e.g. ai-N5-1.',
  ].join('\n');
}

function buildExplainSystemPrompt() {
  return [
    '你是日语老师，需要为单选题提供简洁、可读的中文解析。',
    '请严格遵守：',
    '1) 只输出纯文本，不要 Markdown。',
    '2) 内容控制在 3-5 行。',
    '3) 必须包含：正确答案、为什么正确、其他选项为什么不选。',
    '4) 语气友好、结论明确。',
  ].join('\n');
}

function buildExplainUserPrompt(params: ExplainExamQuestionParams) {
  const payload = {
    level: params.level,
    prompt: params.prompt,
    options: params.options,
    correct_answer: params.correctAnswer,
    user_answer: params.userAnswer,
    is_correct: params.isCorrect,
  };
  return [
    '请基于下面题目信息输出中文解析：',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

function extractOutputText(payload: unknown): string {
  const data = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }
  const chunks = data?.output ?? [];
  const textParts: string[] = [];
  for (const block of chunks) {
    for (const item of block?.content ?? []) {
      if (item?.type === 'output_text' && typeof item.text === 'string') {
        textParts.push(item.text);
      }
    }
  }
  return textParts.join('\n').trim();
}

function sanitizeItems(rawItems: RawExamItem[]) {
  return rawItems
    .map((item, index) => {
      const options = Array.isArray(item.options)
        ? item.options.map((option) => String(option).trim()).filter(Boolean)
        : [];
      const dedupedOptions = Array.from(new Set(options));
      const answerIndex = Number(item.answer_index ?? 0);
      if (dedupedOptions.length !== 4) return null;
      if (!Number.isInteger(answerIndex) || answerIndex < 1 || answerIndex > 4) return null;
      const answer = dedupedOptions[answerIndex - 1];
      if (!answer) return null;
      const questionHtml = String(item.question_html ?? '').trim();
      if (!questionHtml) return null;
      return {
        id: String(item.id || `ai-${index + 1}`),
        question_html: questionHtml,
        options: dedupedOptions,
        answer_index: answerIndex,
      } satisfies RawExamItem;
    })
    .filter(Boolean) as RawExamItem[];
}

export function createResponsesProvider(config: AiProviderConfig): AiQuizProvider {
  const baseUrl = normalizeBaseUrl(config.api_base_url);
  const apiKey = config.api_key.trim();
  const model = config.model.trim();

  function ensureConfigReady() {
    if (!apiKey) {
      throw new Error('请先配置 API Key');
    }
    if (!baseUrl) {
      throw new Error('请先配置 API Base URL');
    }
    if (!model) {
      throw new Error('请先配置模型名称');
    }
  }

  return {
    async generateExamQuiz({ level, count }: GenerateExamQuizParams) {
      ensureConfigReady();

      const response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: buildSystemPrompt() }],
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildUserPrompt(level, count) }],
            },
          ],
          max_output_tokens: 4000,
          text: {
            format: RESPONSES_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI 请求失败（${response.status}）：${errText || response.statusText}`);
      }

      const payload = (await response.json()) as unknown;
      const outputText = extractOutputText(payload);
      if (!outputText) {
        throw new Error('AI 返回为空，请调整模型或稍后重试');
      }

      let parsed: { items?: RawExamItem[] } | null = null;
      try {
        parsed = JSON.parse(outputText) as { items?: RawExamItem[] };
      } catch {
        throw new Error('AI 返回不是有效 JSON，请调整模型或 Base URL');
      }

      const items = sanitizeItems(Array.isArray(parsed?.items) ? parsed.items : []);
      if (!items.length) {
        throw new Error('AI 返回题目未通过校验，请重试');
      }
      return items;
    },
    async explainExamQuestion(params: ExplainExamQuestionParams) {
      ensureConfigReady();

      const response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: buildExplainSystemPrompt() }],
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildExplainUserPrompt(params) }],
            },
          ],
          max_output_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI 解析失败（${response.status}）：${errText || response.statusText}`);
      }

      const payload = (await response.json()) as unknown;
      const outputText = extractOutputText(payload);
      if (!outputText) {
        throw new Error('AI 未返回解析内容，请稍后重试');
      }

      return outputText;
    },
  };
}
