import { AiProviderConfig, BankLevel, RawExamItem } from '../../types';

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

type ConversationHistoryItem = {
  role: 'assistant' | 'user';
  text: string;
};

type StartConversationParams = {
  level: BankLevel;
  scenarioTitle: string;
  scenarioDescription: string;
  goal: string;
};

type ReplyConversationParams = {
  level: BankLevel;
  scenarioTitle: string;
  scenarioDescription: string;
  goal: string;
  userInput: string;
  history: ConversationHistoryItem[];
  turnIndex: number;
};

type DictionaryHistoryItem = {
  role: 'assistant' | 'user';
  text: string;
};

type AskDictionaryParams = {
  entry: string;
  followUp?: string;
  history?: DictionaryHistoryItem[];
};

type AskDictionaryStreamParams = AskDictionaryParams & {
  onDelta?: (chunk: string) => void;
};

export type ConversationTurnResult = {
  assistantReplyJa: string;
  assistantReplyZh: string;
  correction: {
    original: string;
    better: string;
    reasonCn: string;
  } | null;
  nextHintCn: string;
  score: number;
  isGoalCompleted: boolean;
  completionCommentCn: string;
};

export type AiQuizProvider = {
  generateExamQuiz: (params: GenerateExamQuizParams) => Promise<RawExamItem[]>;
  explainExamQuestion: (params: ExplainExamQuestionParams) => Promise<string>;
  startConversation: (params: StartConversationParams) => Promise<ConversationTurnResult>;
  replyConversation: (params: ReplyConversationParams) => Promise<ConversationTurnResult>;
  askDictionary: (params: AskDictionaryParams) => Promise<string>;
  askDictionaryStream: (params: AskDictionaryStreamParams) => Promise<string>;
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

const CONVERSATION_SCHEMA = {
  type: 'json_schema',
  name: 'conversation_turn_schema',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'assistant_reply_ja',
      'assistant_reply_zh',
      'correction',
      'next_hint_cn',
      'score',
      'is_goal_completed',
      'completion_comment_cn',
    ],
    properties: {
      assistant_reply_ja: { type: 'string', minLength: 1 },
      assistant_reply_zh: { type: 'string' },
      correction: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['original', 'better', 'reason_cn'],
            properties: {
              original: { type: 'string' },
              better: { type: 'string' },
              reason_cn: { type: 'string' },
            },
          },
          { type: 'null' },
        ],
      },
      next_hint_cn: { type: 'string' },
      score: { type: 'integer', minimum: 0, maximum: 100 },
      is_goal_completed: { type: 'boolean' },
      completion_comment_cn: { type: 'string' },
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
    '5) 若题干包含“【目标空】”，按“排序填空题”处理：先给出 options 的参考排序，再解释目标空为什么应填正确答案。',
  ].join('\n');
}

function buildExplainUserPrompt(params: ExplainExamQuestionParams) {
  const isReorderFill = params.prompt.includes('【目标空】');
  const payload = {
    level: params.level,
    prompt: params.prompt,
    options: params.options,
    correct_answer: params.correctAnswer,
    user_answer: params.userAnswer,
    is_correct: params.isCorrect,
    question_type_hint: isReorderFill ? 'reorder_fill_with_target_slot' : 'normal_single_choice',
  };
  return [
    '请基于下面题目信息输出中文解析：',
    isReorderFill
      ? '题型补充：这是排序填空题，options 需要先按语法语义排序成完整句子，“【目标空】”是当前题目要求作答的位置。'
      : '题型补充：这是普通单选题，直接对比选项并说明正确答案依据。',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function buildConversationSystemPrompt() {
  return [
    '你是日语会话教练，正在进行 JLPT 分级对话训练。',
    '你需要扮演场景中的对话角色，并提供学习反馈。',
    '严格遵守：',
    '1) assistant_reply_ja 用自然日语，长度 1-2 句。',
    '2) assistant_reply_zh 用简短中文解释该句意思。',
    '3) correction 仅针对用户上一句；如果用户句子很自然可返回 null。',
    '4) next_hint_cn 给出下一句可说什么（不超过 20 字）。',
    '5) score 为当前轮建议分（0-100）。',
    '6) 当用户已达成目标时，is_goal_completed 设为 true 并给 completion_comment_cn。',
    '7) 仅输出符合 JSON Schema 的结果。',
  ].join('\n');
}

function buildConversationStartUserPrompt(params: StartConversationParams) {
  return [
    '请开始一段新的日语对话训练。',
    `等级：${params.level}`,
    `场景：${params.scenarioTitle}`,
    `场景说明：${params.scenarioDescription}`,
    `用户目标：${params.goal}`,
    '要求：先由你输出第一句开场白，鼓励用户回复。',
  ].join('\n');
}

function buildConversationReplyUserPrompt(params: ReplyConversationParams) {
  const history = params.history.slice(-12);
  return [
    `等级：${params.level}`,
    `场景：${params.scenarioTitle}`,
    `场景说明：${params.scenarioDescription}`,
    `用户目标：${params.goal}`,
    `当前轮次：${params.turnIndex}`,
    '最近对话历史（JSON）：',
    JSON.stringify(history, null, 2),
    '用户本轮输入：',
    params.userInput,
  ].join('\n');
}

function buildDictionarySystemPrompt() {
  return [
    '你是一名面向中文用户的日语学习辞典助手。',
    '目标：帮助用户理解日语词汇、文法点和常见表达，并支持连续追问。',
    '请严格遵守：',
    '1) 只输出纯文本，不要 Markdown，不要 JSON。',
    '2) 优先给出简洁结论，再补充关键细节。',
    '3) 默认结构：核心含义；使用场景；1-2个自然例句（含中文释义）；常见易错点。',
    '4) 如果是追问，只回答用户当前追问并与历史保持一致，避免重复整段解释。',
    '5) 内容务实、易懂，避免过度学术化。',
  ].join('\n');
}

function buildDictionaryUserPrompt(params: AskDictionaryParams) {
  const entry = params.entry.trim();
  const followUp = params.followUp?.trim() ?? '';
  const history = Array.isArray(params.history) ? params.history.slice(-12) : [];

  if (!followUp) {
    return [
      '请解释下面这个日语词条或文法点：',
      entry,
      '要求：输出简洁、实用、适合备考 JLPT 的说明。',
    ].join('\n');
  }

  return [
    `当前词条/文法点：${entry}`,
    '历史对话（JSON）：',
    JSON.stringify(history, null, 2),
    '用户当前追问：',
    followUp,
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

function extractStreamDelta(payload: unknown): { delta?: string; doneText?: string } {
  const data = payload as {
    type?: string;
    delta?: string;
    text?: string;
  };

  if (data.type === 'response.output_text.delta' && typeof data.delta === 'string') {
    return { delta: data.delta };
  }

  if (data.type === 'response.output_text.done' && typeof data.text === 'string') {
    return { doneText: data.text };
  }

  return {};
}

function parseSseDataFrame(frame: string) {
  const lines = frame.split('\n');
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (!dataLines.length) return '';
  return dataLines.join('\n');
}

function extractOutputTextFromSseRaw(raw: string): string {
  const normalized = raw.replace(/\r\n/g, '\n');
  const frames = normalized.split('\n\n');
  let outputText = '';
  let hasDelta = false;

  for (const frame of frames) {
    const dataLine = parseSseDataFrame(frame);
    if (!dataLine || dataLine === '[DONE]') continue;
    let payload: unknown = null;
    try {
      payload = JSON.parse(dataLine) as unknown;
    } catch {
      continue;
    }
    const piece = extractStreamDelta(payload);
    if (piece.delta) {
      hasDelta = true;
      outputText += piece.delta;
      continue;
    }
    if (piece.doneText && !hasDelta) {
      outputText += piece.doneText;
    }
  }

  return outputText.trim();
}

function extractOutputTextFromRaw(raw: string): string {
  const sseText = extractOutputTextFromSseRaw(raw);
  if (sseText) return sseText;

  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return '';

  try {
    const payload = JSON.parse(trimmed) as unknown;
    return extractOutputText(payload).trim();
  } catch {
    return '';
  }
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

function normalizeConversationTurn(payload: unknown): ConversationTurnResult {
  const data = payload as {
    assistant_reply_ja?: string;
    assistant_reply_zh?: string;
    correction?: { original?: string; better?: string; reason_cn?: string } | null;
    next_hint_cn?: string;
    score?: number;
    is_goal_completed?: boolean;
    completion_comment_cn?: string;
  };

  const correction = data.correction
    ? {
        original: String(data.correction.original ?? '').trim(),
        better: String(data.correction.better ?? '').trim(),
        reasonCn: String(data.correction.reason_cn ?? '').trim(),
      }
    : null;

  return {
    assistantReplyJa: String(data.assistant_reply_ja ?? '').trim(),
    assistantReplyZh: String(data.assistant_reply_zh ?? '').trim(),
    correction,
    nextHintCn: String(data.next_hint_cn ?? '').trim(),
    score: Number.isFinite(Number(data.score)) ? Number(data.score) : 0,
    isGoalCompleted: Boolean(data.is_goal_completed),
    completionCommentCn: String(data.completion_comment_cn ?? '').trim(),
  };
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

  async function requestDictionary(
    params: AskDictionaryParams,
    options: { stream?: boolean; onDelta?: (chunk: string) => void } = {}
  ) {
    ensureConfigReady();

    const entry = params.entry.trim();
    if (!entry) {
      throw new Error('请输入要查询的词汇或文法点');
    }

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
            content: [{ type: 'input_text', text: buildDictionarySystemPrompt() }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: buildDictionaryUserPrompt(params) }],
          },
        ],
        max_output_tokens: 900,
        stream: Boolean(options.stream),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI 辞典请求失败（${response.status}）：${errText || response.statusText}`);
    }

    if (!options.stream) {
      const payload = (await response.json()) as unknown;
      const outputText = extractOutputText(payload);
      if (!outputText) {
        throw new Error('AI 未返回解释内容，请稍后重试');
      }
      return outputText;
    }

    const decoder = typeof TextDecoder === 'function' ? new TextDecoder() : null;
    if (!decoder) {
      const raw = await response.text();
      const outputText = extractOutputTextFromRaw(raw);
      if (!outputText) {
        throw new Error('当前环境不支持流式输出');
      }
      if (typeof options.onDelta === 'function') {
        options.onDelta(outputText);
      }
      return outputText;
    }

    const reader = response.body?.getReader?.();
    if (!reader) {
      const raw = await response.text();
      const outputText = extractOutputTextFromRaw(raw);
      if (!outputText) {
        throw new Error('AI 未返回解释内容，请稍后重试');
      }
      if (typeof options.onDelta === 'function') {
        options.onDelta(outputText);
      }
      return outputText;
    }

    let rawText = '';
    let buffer = '';
    let outputText = '';
    let hasDelta = false;
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      rawText += chunk;
      buffer += chunk;

      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const dataLine = parseSseDataFrame(frame);
        if (!dataLine) continue;
        if (dataLine === '[DONE]') {
          streamDone = true;
          break;
        }
        let payload: unknown = null;
        try {
          payload = JSON.parse(dataLine) as unknown;
        } catch {
          continue;
        }
        const piece = extractStreamDelta(payload);
        if (piece.delta) {
          hasDelta = true;
          outputText += piece.delta;
          options.onDelta?.(piece.delta);
          continue;
        }
        if (piece.doneText && !hasDelta) {
          outputText += piece.doneText;
          options.onDelta?.(piece.doneText);
        }
      }
    }

    const flushChunk = decoder.decode().replace(/\r\n/g, '\n');
    if (flushChunk) {
      rawText += flushChunk;
      buffer += flushChunk;
    }

    if (buffer.trim()) {
      const dataLine = parseSseDataFrame(buffer);
      if (dataLine && dataLine !== '[DONE]') {
        try {
          const payload = JSON.parse(dataLine) as unknown;
          const piece = extractStreamDelta(payload);
          if (piece.delta) {
            outputText += piece.delta;
            options.onDelta?.(piece.delta);
          } else if (piece.doneText && !hasDelta) {
            outputText += piece.doneText;
            options.onDelta?.(piece.doneText);
          }
        } catch {
          // ignore trailing non-JSON frame
        }
      }
    }

    if (!outputText.trim()) {
      const fallbackText = extractOutputTextFromRaw(rawText);
      if (fallbackText) {
        options.onDelta?.(fallbackText);
        return fallbackText;
      }
    }

    if (!outputText.trim()) {
      throw new Error('AI 未返回解释内容，请稍后重试');
    }
    return outputText;
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
    async startConversation(params: StartConversationParams) {
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
              content: [{ type: 'input_text', text: buildConversationSystemPrompt() }],
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildConversationStartUserPrompt(params) }],
            },
          ],
          max_output_tokens: 1200,
          text: {
            format: CONVERSATION_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`对话启动失败（${response.status}）：${errText || response.statusText}`);
      }

      const payload = (await response.json()) as unknown;
      const outputText = extractOutputText(payload);
      if (!outputText) {
        throw new Error('AI 未返回开场内容，请稍后重试');
      }

      try {
        const parsed = JSON.parse(outputText) as unknown;
        const result = normalizeConversationTurn(parsed);
        if (!result.assistantReplyJa) {
          throw new Error('开场白为空');
        }
        return result;
      } catch {
        throw new Error('AI 开场返回格式无效，请重试');
      }
    },
    async replyConversation(params: ReplyConversationParams) {
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
              content: [{ type: 'input_text', text: buildConversationSystemPrompt() }],
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildConversationReplyUserPrompt(params) }],
            },
          ],
          max_output_tokens: 1200,
          text: {
            format: CONVERSATION_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`对话回复失败（${response.status}）：${errText || response.statusText}`);
      }

      const payload = (await response.json()) as unknown;
      const outputText = extractOutputText(payload);
      if (!outputText) {
        throw new Error('AI 未返回回复内容，请稍后重试');
      }

      try {
        const parsed = JSON.parse(outputText) as unknown;
        const result = normalizeConversationTurn(parsed);
        if (!result.assistantReplyJa) {
          throw new Error('回复为空');
        }
        return result;
      } catch {
        throw new Error('AI 回复格式无效，请重试');
      }
    },
    async askDictionary(params: AskDictionaryParams) {
      return requestDictionary(params, { stream: false });
    },
    async askDictionaryStream(params: AskDictionaryStreamParams) {
      return requestDictionary(params, { stream: true, onDelta: params.onDelta });
    },
  };
}
