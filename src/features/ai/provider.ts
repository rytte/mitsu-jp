import {
  AiSentenceAssembleItem,
  AiWritingTask,
  AiProviderConfig,
  BankLevel,
  ExamQuestionType,
  RawAiWritingTask,
  RawExamItem,
  RawAiSentenceAssembleItem,
  TranslationDirection,
  TranslationEvalResult,
  TranslationFocus,
  WritingEvalResult,
  WritingPurpose,
  WritingRegister,
} from '../../types';
import { Platform } from 'react-native';
import { addAiTokenUsageStats } from './storage';

type GenerateExamQuizParams = {
  level: BankLevel;
  count: number;
};

type GenerateSentenceAssembleParams = {
  level: BankLevel;
  count: number;
};

type GenerateWritingTasksParams = {
  level: BankLevel;
  count: number;
  purpose?: WritingPurpose;
  scenario?: string;
  register?: WritingRegister;
};

type ExplainExamQuestionParams = {
  level: BankLevel;
  prompt: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  questionType?: ExamQuestionType;
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

type EvaluateTranslationAnswerParams = {
  level: BankLevel;
  direction: TranslationDirection;
  focus?: TranslationFocus;
  sourceText: string;
  hint?: string;
  referenceAnswer: string;
  userAnswer: string;
};

type EvaluateWritingAnswerParams = {
  task: AiWritingTask;
  userAnswer: string;
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
  generateSentenceAssemble: (params: GenerateSentenceAssembleParams) => Promise<AiSentenceAssembleItem[]>;
  generateWritingTasks: (params: GenerateWritingTasksParams) => Promise<AiWritingTask[]>;
  explainExamQuestion: (params: ExplainExamQuestionParams) => Promise<string>;
  startConversation: (params: StartConversationParams) => Promise<ConversationTurnResult>;
  replyConversation: (params: ReplyConversationParams) => Promise<ConversationTurnResult>;
  askDictionary: (params: AskDictionaryParams) => Promise<string>;
  askDictionaryStream: (params: AskDictionaryStreamParams) => Promise<string>;
  evaluateTranslationAnswer: (params: EvaluateTranslationAnswerParams) => Promise<TranslationEvalResult>;
  evaluateWritingAnswer: (params: EvaluateWritingAnswerParams) => Promise<WritingEvalResult>;
};

const LEVEL_GUIDE: Record<BankLevel, string> = {
  N1: '高级：抽象议题、书面语、细微语感区分，干扰项相近。',
  N2: '中高级：新闻/说明文常见表达，语法和词汇辨析并重。',
  N3: '中级：生活和学习场景，兼顾常见语法与词义辨析。',
  N4: '初中级：基础句型和常见生活词汇，难度适中。',
  N5: '初级：最常见基础词汇和句型，句子短而清晰。',
};

const WRITING_PURPOSE_LABEL: Record<WritingPurpose, string> = {
  request: '请求',
  apology: '道歉',
  invitation: '邀请',
  consultation: '咨询',
  report: '汇报',
};

const WRITING_REGISTER_LABEL: Record<WritingRegister, string> = {
  polite: 'です・ます体',
  plain: '普通体',
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

const SENTENCE_ASSEMBLE_SCHEMA = {
  type: 'json_schema',
  name: 'sentence_assemble_items_schema',
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
          required: ['id', 'prompt', 'tokens', 'answer_tokens'],
          properties: {
            id: { type: 'string', minLength: 1 },
            prompt: { type: 'string', minLength: 1 },
            tokens: {
              type: 'array',
              minItems: 4,
              maxItems: 10,
              items: { type: 'string', minLength: 1 },
            },
            answer_tokens: {
              type: 'array',
              minItems: 4,
              maxItems: 10,
              items: { type: 'string', minLength: 1 },
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

const TRANSLATION_EVAL_SCHEMA = {
  type: 'json_schema',
  name: 'translation_eval_schema',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['score', 'level', 'is_correct', 'reference_answer', 'better_answer', 'errors', 'feedback_cn'],
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100 },
      level: { type: 'string', enum: ['excellent', 'pass', 'retry'] },
      is_correct: { type: 'boolean' },
      reference_answer: { type: 'string', minLength: 1 },
      better_answer: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      },
      errors: {
        type: 'array',
        items: { type: 'string' },
      },
      feedback_cn: { type: 'string', minLength: 1 },
    },
  },
  strict: true,
} as const;

const WRITING_TASK_SCHEMA = {
  type: 'json_schema',
  name: 'writing_task_schema',
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
          required: [
            'id',
            'scenario',
            'purpose',
            'audience',
            'register',
            'prompt_cn',
            'must_include',
            'min_sentences',
            'max_sentences',
            'min_chars',
            'max_chars',
          ],
          properties: {
            id: { type: 'string', minLength: 1 },
            scenario: { type: 'string', minLength: 1 },
            purpose: { type: 'string', minLength: 1 },
            audience: { type: 'string', minLength: 1 },
            register: { type: 'string', enum: ['polite', 'plain'] },
            prompt_cn: { type: 'string', minLength: 1 },
            must_include: {
              type: 'array',
              minItems: 2,
              maxItems: 4,
              items: { type: 'string', minLength: 1 },
            },
            min_sentences: { type: 'integer', minimum: 2, maximum: 8 },
            max_sentences: { type: 'integer', minimum: 2, maximum: 8 },
            min_chars: { type: 'integer', minimum: 20, maximum: 300 },
            max_chars: { type: 'integer', minimum: 20, maximum: 320 },
          },
        },
      },
    },
  },
  strict: true,
} as const;

const WRITING_EVAL_SCHEMA = {
  type: 'json_schema',
  name: 'writing_eval_schema',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'score',
      'level',
      'goal_achieved',
      'dimension_scores',
      'must_include_check',
      'errors',
      'feedback_cn',
      'better_answer',
      'next_action_cn',
    ],
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100 },
      level: { type: 'string', enum: ['excellent', 'pass', 'retry'] },
      goal_achieved: { type: 'boolean' },
      dimension_scores: {
        type: 'object',
        additionalProperties: false,
        required: ['task', 'grammar', 'vocab', 'coherence', 'register'],
        properties: {
          task: { type: 'integer', minimum: 0, maximum: 35 },
          grammar: { type: 'integer', minimum: 0, maximum: 25 },
          vocab: { type: 'integer', minimum: 0, maximum: 20 },
          coherence: { type: 'integer', minimum: 0, maximum: 10 },
          register: { type: 'integer', minimum: 0, maximum: 10 },
        },
      },
      must_include_check: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['point', 'covered', 'comment_cn'],
          properties: {
            point: { type: 'string', minLength: 1 },
            covered: { type: 'boolean' },
            comment_cn: { type: 'string', minLength: 1 },
          },
        },
      },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['fragment', 'type', 'suggestion', 'reason_cn'],
          properties: {
            fragment: { type: 'string', minLength: 1 },
            type: { type: 'string', minLength: 1 },
            suggestion: { type: 'string', minLength: 1 },
            reason_cn: { type: 'string', minLength: 1 },
          },
        },
      },
      feedback_cn: { type: 'string', minLength: 1 },
      better_answer: { type: 'string', minLength: 1 },
      next_action_cn: { type: 'string', minLength: 1 },
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

function buildSentenceAssembleSystemPrompt() {
  return [
    'You are a JLPT sentence-assembly item generator for Japanese learners.',
    'Produce machine-readable sentence assembly items for a mobile app.',
    'Hard constraints:',
    '1) Output must strictly follow the JSON Schema.',
    '2) Each item must have exactly one valid answer order.',
    '3) tokens and answer_tokens must contain the same elements and length.',
    '4) Do not include duplicate tokens in a single item.',
    '5) tokens must be shuffled and should not be in the same order as answer_tokens.',
    '6) Use natural Japanese sentence chunks (particles can be attached to nearby words).',
    '7) prompt should be concise and in Chinese for learners, and must only contain clue text (no instruction prefixes like "把词块排成正确句子" or "请把句子拼好").',
    '8) Do not output explanations, markdown, comments, or extra fields.',
  ].join('\n');
}

function buildSentenceAssembleUserPrompt(level: BankLevel, count: number) {
  return [
    `Generate ${count} JLPT ${level} sentence-assembly items.`,
    `Difficulty guide: ${LEVEL_GUIDE[level]}`,
    'Style requirements:',
    '- Focus on practical, natural Japanese sentences.',
    '- Keep item length mobile-friendly (4-10 chunks).',
    '- Use id format assemble-LEVEL-INDEX, e.g. assemble-N5-1.',
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
    '5) 若 question_type 为 reorder_fill：先给出 options 的参考排序；若 has_target_slot=true 再解释“★”位置，否则解释多空之间的语法搭配关系。',
    '6) 若 question_type 为 kana_kanji_conversion：先指出“【xxx】”词形（汉字/假名），再说明应选对应读法或写法。',
    '7) 若 question_type 为 single_blank_fill：按普通单选填空解析语法和语义依据。',
  ].join('\n');
}

function buildExplainUserPrompt(params: ExplainExamQuestionParams) {
  const hasTargetSlot = params.prompt.includes('★');
  const fallbackType: ExamQuestionType = params.prompt.includes('★')
    ? 'reorder_fill'
    : /【[^】]+】|[(（)[^()（）]+[)）]/.test(params.prompt)
    ? 'kana_kanji_conversion'
    : 'single_blank_fill';
  const questionType = params.questionType ?? fallbackType;
  const payload = {
    level: params.level,
    prompt: params.prompt,
    options: params.options,
    correct_answer: params.correctAnswer,
    user_answer: params.userAnswer,
    is_correct: params.isCorrect,
    question_type: questionType,
    has_target_slot: hasTargetSlot,
  };
  return [
    '请基于下面题目信息输出中文解析：',
    questionType === 'reorder_fill'
      ? hasTargetSlot
        ? '题型补充：这是排序填空题，options 需要先按语法语义排序成完整句子，“★”是当前题目要求作答的位置。'
        : '题型补充：这是多空排序/搭配题，先说明空格间语法关系，再解释当前正确选项为什么成立。'
      : questionType === 'kana_kanji_conversion'
      ? '题型补充：这是汉字/假名转换题，需根据“【xxx】”中的词形判断应选读音或写法。'
      : '题型补充：这是单选填空题，直接对比选项并说明正确答案依据。',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function buildConversationSystemPrompt() {
  return [
    '你是日语会话教练，正在进行 JLPT 分级场景对话。',
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
    '请开始一段新的日语场景对话。',
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

function buildTranslationEvalSystemPrompt() {
  return [
    '你是日语翻译批改老师，需要对学习者的译文做严格、可读的中文评估。',
    '严格遵守：',
    '1) 仅输出符合 JSON Schema 的内容，不要 Markdown。',
    '2) score 范围 0-100，按语义准确、语法、搭配、自然度综合评分。',
    '3) level 仅可为 excellent / pass / retry。',
    '4) is_correct 仅在译文整体可接受时设为 true。',
    '5) reference_answer 给出标准参考译文。',
    '6) better_answer 在汉译日时尽量给出更自然版本；日译汉可为 null。',
    '7) errors 使用短语数组列出主要问题，如“漏译时间信息”“助词错误”“语气不自然”。',
    '8) feedback_cn 给出 2-4 句中文反馈，结论明确、可执行。',
  ].join('\n');
}

function buildTranslationEvalUserPrompt(params: EvaluateTranslationAnswerParams) {
  const directionLabel = params.direction === 'zh_to_ja' ? '汉译日' : '日译汉';
  const focusLabel =
    params.focus === 'vocab' ? '词汇向' : params.focus === 'grammar' ? '文法向' : '综合向';
  const payload = {
    level: params.level,
    direction: params.direction,
    focus: params.focus ?? 'mixed',
    source_text: params.sourceText,
    source_hint: params.hint ?? '',
    reference_answer: params.referenceAnswer,
    user_answer: params.userAnswer,
  };
  return [
    `题型：${directionLabel}`,
    `训练方向：${focusLabel}`,
    '请根据以下信息进行翻译批改：',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function getWritingRangeByLevel(level: BankLevel) {
  if (level === 'N5') {
    return { minSentences: 2, maxSentences: 3, minChars: 25, maxChars: 60 };
  }
  if (level === 'N4') {
    return { minSentences: 3, maxSentences: 4, minChars: 40, maxChars: 90 };
  }
  if (level === 'N3') {
    return { minSentences: 4, maxSentences: 5, minChars: 70, maxChars: 130 };
  }
  if (level === 'N2') {
    return { minSentences: 5, maxSentences: 6, minChars: 100, maxChars: 180 };
  }
  return { minSentences: 6, maxSentences: 8, minChars: 140, maxChars: 260 };
}

function buildWritingTaskSystemPrompt() {
  return [
    '你是日语写作训练出题老师，需要为学习者生成“带明确目的的短文写作题”。',
    '请严格遵守：',
    '1) 仅输出符合 JSON Schema 的内容，不要 Markdown。',
    '2) 每题必须给出：场景、目的、对象、文体、中文题干、必须覆盖点、句数与字数范围。',
    '3) prompt_cn 必须清晰指向“达成某个沟通目的”，不能只有泛泛写作。',
    '4) must_include 只写关键信息点，2-4 条，短句表达。',
    '5) register 只能是 polite 或 plain。',
    '6) 题目语义自然，贴近日常/学习/工作场景，不要重复。',
  ].join('\n');
}

function buildWritingTaskUserPrompt(params: GenerateWritingTasksParams) {
  const range = getWritingRangeByLevel(params.level);
  const purpose = WRITING_PURPOSE_LABEL[params.purpose ?? 'request'];
  const register = WRITING_REGISTER_LABEL[params.register ?? 'polite'];
  return [
    `请生成 ${params.count} 道 JLPT ${params.level} 写作训练题。`,
    `难度参考：${LEVEL_GUIDE[params.level]}`,
    `写作目的偏好：${purpose}`,
    `文体偏好：${register}`,
    params.scenario?.trim() ? `场景偏好：${params.scenario.trim()}` : '场景偏好：不限，请覆盖多样生活场景',
    `句数范围：${range.minSentences}-${range.maxSentences} 句`,
    `字数范围：${range.minChars}-${range.maxChars} 字（按日语字符数估计）`,
    'ID 格式：writing-LEVEL-INDEX，例如 writing-N4-1。',
  ].join('\n');
}

function buildWritingEvalSystemPrompt() {
  return [
    '你是日语写作批改老师，请对学习者短文进行严格、可执行的中文反馈。',
    '请严格遵守：',
    '1) 仅输出符合 JSON Schema 的内容，不要 Markdown。',
    '2) 总分 100，维度分数必须对应：task 35、grammar 25、vocab 20、coherence 10、register 10。',
    '3) level 仅可为 excellent / pass / retry。',
    '4) goal_achieved 仅在核心沟通目的达成且关键信息覆盖时为 true。',
    '5) must_include_check 必须逐条评估题目要求是否覆盖。',
    '6) errors 仅保留关键错误，优先高影响问题。',
    '7) better_answer 给出可直接参考的优化短文。',
    '8) next_action_cn 给出一句下一步训练建议。',
  ].join('\n');
}

function buildWritingEvalUserPrompt(params: EvaluateWritingAnswerParams) {
  const task = params.task;
  const payload = {
    level: task.level,
    scenario: task.scenario,
    purpose: task.purpose,
    audience: task.audience,
    register: task.register,
    prompt_cn: task.promptCn,
    must_include: task.mustInclude,
    sentence_range: [task.minSentences, task.maxSentences],
    char_range: [task.minChars, task.maxChars],
    user_answer: params.userAnswer,
  };
  return ['请根据以下写作题与学习者答案进行批改：', JSON.stringify(payload, null, 2)].join('\n');
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

function toSafeNonNegativeInt(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.floor(num));
}

function extractUsageFromPayload(payload: unknown) {
  const data = payload as {
    usage?: {
      input_tokens?: number;
      prompt_tokens?: number;
      output_tokens?: number;
      completion_tokens?: number;
      cached_tokens?: number;
      input_tokens_details?: { cached_tokens?: number };
      prompt_tokens_details?: { cached_tokens?: number };
    };
    response?: {
      usage?: {
        input_tokens?: number;
        prompt_tokens?: number;
        output_tokens?: number;
        completion_tokens?: number;
        cached_tokens?: number;
        input_tokens_details?: { cached_tokens?: number };
        prompt_tokens_details?: { cached_tokens?: number };
      };
    };
  };

  const usage = data?.usage ?? data?.response?.usage;
  if (!usage) return null;

  const hasKnownField =
    usage.input_tokens != null ||
    usage.prompt_tokens != null ||
    usage.output_tokens != null ||
    usage.completion_tokens != null ||
    usage.cached_tokens != null ||
    usage.input_tokens_details?.cached_tokens != null ||
    usage.prompt_tokens_details?.cached_tokens != null;

  if (!hasKnownField) return null;

  const inputTokens = toSafeNonNegativeInt(usage.input_tokens ?? usage.prompt_tokens);
  const cachedInputTokens = toSafeNonNegativeInt(
    usage.cached_tokens ?? usage.input_tokens_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens
  );
  const outputTokens = toSafeNonNegativeInt(usage.output_tokens ?? usage.completion_tokens);

  return {
    input_tokens: inputTokens,
    cached_input_tokens: cachedInputTokens,
    output_tokens: outputTokens,
  };
}

function trackUsageSnapshot(snapshot: { input_tokens: number; cached_input_tokens: number; output_tokens: number } | null) {
  if (!snapshot) return;
  void addAiTokenUsageStats(snapshot).catch(() => {
    // ignore usage persistence errors
  });
}

function trackUsageFromPayload(payload: unknown) {
  trackUsageSnapshot(extractUsageFromPayload(payload));
}

function trackUsageFromRawSse(raw: string) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const frames = normalized.split('\n\n');
  let found = false;
  const best = {
    input_tokens: 0,
    cached_input_tokens: 0,
    output_tokens: 0,
  };

  for (const frame of frames) {
    const dataLine = parseSseDataFrame(frame);
    if (!dataLine || dataLine === '[DONE]') continue;
    try {
      const payload = JSON.parse(dataLine) as unknown;
      const usage = extractUsageFromPayload(payload);
      if (!usage) continue;
      found = true;
      best.input_tokens = Math.max(best.input_tokens, usage.input_tokens);
      best.cached_input_tokens = Math.max(best.cached_input_tokens, usage.cached_input_tokens);
      best.output_tokens = Math.max(best.output_tokens, usage.output_tokens);
    } catch {
      // ignore non-JSON frames
    }
  }

  if (found) {
    trackUsageSnapshot(best);
    return;
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const payload = JSON.parse(trimmed) as unknown;
      trackUsageFromPayload(payload);
    } catch {
      // ignore invalid JSON
    }
  }
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

async function extractOutputTextFromHttpResponse(response: Response): Promise<string> {
  const raw = await response.text();
  trackUsageFromRawSse(raw);
  return extractOutputTextFromRaw(raw);
}

function isNativeRuntime() {
  return Platform.OS !== 'web';
}

function tryConsumeSseFrames(
  chunk: string,
  state: { buffer: string; outputText: string; hasDelta: boolean },
  onDelta?: (chunk: string) => void
) {
  if (!chunk) return;
  state.buffer += chunk.replace(/\r\n/g, '\n');
  const frames = state.buffer.split('\n\n');
  state.buffer = frames.pop() ?? '';

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
      state.hasDelta = true;
      state.outputText += piece.delta;
      onDelta?.(piece.delta);
      continue;
    }
    if (piece.doneText && !state.hasDelta) {
      state.outputText += piece.doneText;
      onDelta?.(piece.doneText);
    }
  }
}

function requestDictionaryViaXhrSse(params: {
  url: string;
  apiKey: string;
  body: Record<string, unknown>;
  onDelta?: (chunk: string) => void;
}) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let readOffset = 0;
    const streamState = {
      buffer: '',
      outputText: '',
      hasDelta: false,
    };

    const settleResolve = (value: string) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const settleReject = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const consumeUnreadText = () => {
      const responseText = xhr.responseText ?? '';
      if (responseText.length <= readOffset) return;
      const unread = responseText.slice(readOffset);
      readOffset = responseText.length;
      tryConsumeSseFrames(unread, streamState, params.onDelta);
    };

    xhr.open('POST', params.url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${params.apiKey}`);

    xhr.onprogress = consumeUnreadText;
    xhr.onerror = () => {
      settleReject(new Error('AI 辞典请求失败：网络异常，请稍后重试'));
    };
    xhr.ontimeout = () => {
      settleReject(new Error('AI 辞典请求超时，请稍后重试'));
    };
    xhr.onload = () => {
      consumeUnreadText();
      const rawText = xhr.responseText ?? '';
      if (xhr.status < 200 || xhr.status >= 300) {
        settleReject(new Error(`AI 辞典请求失败（${xhr.status}）：${rawText || xhr.statusText}`));
        return;
      }
      trackUsageFromRawSse(rawText);

      if (streamState.buffer.trim()) {
        const trailingFrameState = {
          buffer: '',
          outputText: streamState.outputText,
          hasDelta: streamState.hasDelta,
        };
        tryConsumeSseFrames(`${streamState.buffer}\n\n`, trailingFrameState, params.onDelta);
        streamState.outputText = trailingFrameState.outputText;
        streamState.hasDelta = trailingFrameState.hasDelta;
      }

      const finalText = streamState.outputText.trim() || extractOutputTextFromRaw(rawText);
      if (!finalText) {
        settleReject(new Error('AI 未返回解释内容，请稍后重试'));
        return;
      }
      if (!streamState.outputText.trim()) {
        params.onDelta?.(finalText);
      }
      settleResolve(finalText);
    };

    try {
      xhr.send(JSON.stringify(params.body));
    } catch (error) {
      settleReject(error instanceof Error ? error : new Error('AI 辞典请求发送失败'));
    }
  });
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

function arrayEquals(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function shuffleTextArray(items: string[]) {
  const next = items.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function hasSameUniqueTokens(tokens: string[], answerTokens: string[]) {
  if (tokens.length !== answerTokens.length) return false;
  const tokenSet = new Set(tokens);
  const answerSet = new Set(answerTokens);
  if (tokenSet.size !== tokens.length || answerSet.size !== answerTokens.length) {
    return false;
  }
  if (tokenSet.size !== answerSet.size) return false;
  for (const token of answerSet) {
    if (!tokenSet.has(token)) return false;
  }
  return true;
}

function sanitizeSentenceAssembleItems(rawItems: RawAiSentenceAssembleItem[]) {
  return rawItems
    .map((item, index) => {
      const prompt = String(item.prompt ?? '').trim();
      const tokens = Array.isArray(item.tokens) ? item.tokens.map((token) => String(token).trim()).filter(Boolean) : [];
      const answerTokens = Array.isArray(item.answer_tokens)
        ? item.answer_tokens.map((token) => String(token).trim()).filter(Boolean)
        : [];

      if (!prompt) return null;
      if (tokens.length < 4 || tokens.length > 10) return null;
      if (answerTokens.length !== tokens.length) return null;
      if (!hasSameUniqueTokens(tokens, answerTokens)) return null;

      let shuffledTokens = tokens.slice();
      if (arrayEquals(shuffledTokens, answerTokens)) {
        for (let i = 0; i < 5; i += 1) {
          const candidate = shuffleTextArray(answerTokens);
          if (!arrayEquals(candidate, answerTokens)) {
            shuffledTokens = candidate;
            break;
          }
        }
      }

      return {
        id: String(item.id || `assemble-${index + 1}`),
        prompt,
        tokens: shuffledTokens,
        answerTokens,
      } satisfies AiSentenceAssembleItem;
    })
    .filter(Boolean) as AiSentenceAssembleItem[];
}

function normalizeWritingRegister(value: unknown, fallback: WritingRegister): WritingRegister {
  return value === 'plain' || value === 'polite' ? value : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const next = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : fallback;
  return Math.max(min, Math.min(max, next));
}

function sanitizeWritingTasks(
  rawItems: RawAiWritingTask[],
  params: { level: BankLevel; purpose: WritingPurpose; scenario?: string; register: WritingRegister }
) {
  const range = getWritingRangeByLevel(params.level);
  return rawItems
    .map((item, index) => {
      const scenario = String(item.scenario ?? '').trim() || params.scenario?.trim() || '日常生活';
      const purpose = String(item.purpose ?? '').trim() || WRITING_PURPOSE_LABEL[params.purpose];
      const audience = String(item.audience ?? '').trim() || '对方';
      const promptCn = String(item.prompt_cn ?? '').trim();
      const register = normalizeWritingRegister(item.register, params.register);
      const mustInclude = Array.isArray(item.must_include)
        ? item.must_include.map((point) => String(point ?? '').trim()).filter(Boolean)
        : [];

      if (!promptCn) return null;
      if (mustInclude.length < 2) return null;

      const minSentences = clampInt(item.min_sentences, range.minSentences, range.maxSentences, range.minSentences);
      const maxSentences = clampInt(item.max_sentences, minSentences, range.maxSentences, range.maxSentences);
      const minChars = clampInt(item.min_chars, range.minChars, range.maxChars, range.minChars);
      const maxChars = clampInt(item.max_chars, minChars, range.maxChars, range.maxChars);

      return {
        id: String(item.id || `writing-${params.level}-${index + 1}`),
        level: params.level,
        scenario,
        purpose,
        audience,
        register,
        promptCn,
        mustInclude: mustInclude.slice(0, 4),
        minSentences,
        maxSentences,
        minChars,
        maxChars,
      } satisfies AiWritingTask;
    })
    .filter(Boolean) as AiWritingTask[];
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

function normalizeTranslationEvalResult(payload: unknown): TranslationEvalResult {
  const data = payload as {
    score?: number;
    level?: 'excellent' | 'pass' | 'retry';
    is_correct?: boolean;
    reference_answer?: string;
    better_answer?: string | null;
    errors?: unknown;
    feedback_cn?: string;
  };

  const score = Number.isFinite(Number(data.score)) ? Number(data.score) : 0;
  const level = data.level === 'excellent' || data.level === 'pass' || data.level === 'retry' ? data.level : 'retry';
  const errors = Array.isArray(data.errors)
    ? data.errors.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];

  return {
    score: Math.max(0, Math.min(100, score)),
    level,
    isCorrect: Boolean(data.is_correct),
    referenceAnswer: String(data.reference_answer ?? '').trim(),
    betterAnswer: data.better_answer == null ? undefined : String(data.better_answer).trim(),
    errors,
    feedbackCn: String(data.feedback_cn ?? '').trim(),
  };
}

function normalizeWritingEvalResult(payload: unknown): WritingEvalResult {
  const data = payload as {
    score?: number;
    level?: 'excellent' | 'pass' | 'retry';
    goal_achieved?: boolean;
    dimension_scores?: {
      task?: number;
      grammar?: number;
      vocab?: number;
      coherence?: number;
      register?: number;
    };
    must_include_check?: unknown;
    errors?: unknown;
    feedback_cn?: string;
    better_answer?: string;
    next_action_cn?: string;
  };

  const level = data.level === 'excellent' || data.level === 'pass' || data.level === 'retry' ? data.level : 'retry';
  const score = Number.isFinite(Number(data.score)) ? Number(data.score) : 0;
  const dimensions = data.dimension_scores ?? {};
  const mustIncludeCheck = Array.isArray(data.must_include_check)
    ? data.must_include_check
        .map((item) => {
          const value = item as { point?: string; covered?: boolean; comment_cn?: string };
          const point = String(value?.point ?? '').trim();
          const commentCn = String(value?.comment_cn ?? '').trim();
          if (!point || !commentCn) return null;
          return {
            point,
            covered: Boolean(value?.covered),
            commentCn,
          };
        })
        .filter(Boolean)
    : [];
  const errors = Array.isArray(data.errors)
    ? data.errors
        .map((item) => {
          const value = item as { fragment?: string; type?: string; suggestion?: string; reason_cn?: string };
          const fragment = String(value?.fragment ?? '').trim();
          const type = String(value?.type ?? '').trim();
          const suggestion = String(value?.suggestion ?? '').trim();
          const reasonCn = String(value?.reason_cn ?? '').trim();
          if (!fragment || !type || !suggestion || !reasonCn) return null;
          return {
            fragment,
            type,
            suggestion,
            reasonCn,
          };
        })
        .filter(Boolean)
    : [];

  return {
    score: Math.max(0, Math.min(100, score)),
    level,
    goalAchieved: Boolean(data.goal_achieved),
    dimensionScores: {
      task: clampInt(dimensions.task, 0, 35, 0),
      grammar: clampInt(dimensions.grammar, 0, 25, 0),
      vocab: clampInt(dimensions.vocab, 0, 20, 0),
      coherence: clampInt(dimensions.coherence, 0, 10, 0),
      register: clampInt(dimensions.register, 0, 10, 0),
    },
    mustIncludeCheck: mustIncludeCheck as WritingEvalResult['mustIncludeCheck'],
    errors: errors as WritingEvalResult['errors'],
    feedbackCn: String(data.feedback_cn ?? '').trim(),
    betterAnswer: String(data.better_answer ?? '').trim(),
    nextActionCn: String(data.next_action_cn ?? '').trim(),
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

    const requestBody = {
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
    } satisfies Record<string, unknown>;

    if (options.stream && isNativeRuntime() && typeof XMLHttpRequest === 'function') {
      return requestDictionaryViaXhrSse({
        url: `${baseUrl}/responses`,
        apiKey,
        body: requestBody,
        onDelta: options.onDelta,
      });
    }

    const response = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI 辞典请求失败（${response.status}）：${errText || response.statusText}`);
    }

    if (!options.stream) {
      const outputText = await extractOutputTextFromHttpResponse(response);
      if (!outputText) {
        throw new Error('AI 未返回解释内容，请稍后重试');
      }
      return outputText;
    }

    const decoder = typeof TextDecoder === 'function' ? new TextDecoder() : null;
    if (!decoder) {
      const raw = await response.text();
      trackUsageFromRawSse(raw);
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
      trackUsageFromRawSse(raw);
      const outputText = extractOutputTextFromRaw(raw);
      if (!outputText) {
        throw new Error('AI 未返回解释内容，请稍后重试');
      }
      if (typeof options.onDelta === 'function') {
        options.onDelta(outputText);
      }
      return outputText;
    }

    const streamState = {
      buffer: '',
      outputText: '',
      hasDelta: false,
    };
    let rawText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      rawText += chunk;
      tryConsumeSseFrames(chunk, streamState, options.onDelta);
    }

    const flushChunk = decoder.decode();
    if (flushChunk) {
      rawText += flushChunk;
      tryConsumeSseFrames(flushChunk, streamState, options.onDelta);
    }

    if (streamState.buffer.trim()) {
      const dataLine = parseSseDataFrame(streamState.buffer);
      if (dataLine && dataLine !== '[DONE]') {
        try {
          const payload = JSON.parse(dataLine) as unknown;
          const piece = extractStreamDelta(payload);
          if (piece.delta) {
            streamState.outputText += piece.delta;
            options.onDelta?.(piece.delta);
          } else if (piece.doneText && !streamState.hasDelta) {
            streamState.outputText += piece.doneText;
            options.onDelta?.(piece.doneText);
          }
        } catch {
          // ignore trailing non-JSON frame
        }
      }
    }

    if (!streamState.outputText.trim()) {
      const fallbackText = extractOutputTextFromRaw(rawText);
      if (fallbackText) {
        trackUsageFromRawSse(rawText);
        options.onDelta?.(fallbackText);
        return fallbackText;
      }
    }

    if (!streamState.outputText.trim()) {
      throw new Error('AI 未返回解释内容，请稍后重试');
    }
    trackUsageFromRawSse(rawText);
    return streamState.outputText;
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
          stream: false,
          text: {
            format: RESPONSES_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI 请求失败（${response.status}）：${errText || response.statusText}`);
      }

      const outputText = await extractOutputTextFromHttpResponse(response);
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
    async generateSentenceAssemble({ level, count }: GenerateSentenceAssembleParams) {
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
              content: [{ type: 'input_text', text: buildSentenceAssembleSystemPrompt() }],
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildSentenceAssembleUserPrompt(level, count) }],
            },
          ],
          max_output_tokens: 4000,
          stream: false,
          text: {
            format: SENTENCE_ASSEMBLE_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI 请求失败（${response.status}）：${errText || response.statusText}`);
      }

      const outputText = await extractOutputTextFromHttpResponse(response);
      if (!outputText) {
        throw new Error('AI 返回为空，请调整模型或稍后重试');
      }

      let parsed: { items?: RawAiSentenceAssembleItem[] } | null = null;
      try {
        parsed = JSON.parse(outputText) as { items?: RawAiSentenceAssembleItem[] };
      } catch {
        throw new Error('AI 返回不是有效 JSON，请调整模型或 Base URL');
      }

      const items = sanitizeSentenceAssembleItems(Array.isArray(parsed?.items) ? parsed.items : []);
      if (!items.length) {
        throw new Error('AI 返回连词成句未通过校验，请重试');
      }
      return items;
    },
    async generateWritingTasks(params: GenerateWritingTasksParams) {
      ensureConfigReady();

      const purpose = params.purpose ?? 'request';
      const register = params.register ?? 'polite';
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
              content: [{ type: 'input_text', text: buildWritingTaskSystemPrompt() }],
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildWritingTaskUserPrompt(params) }],
            },
          ],
          max_output_tokens: 2400,
          stream: false,
          text: {
            format: WRITING_TASK_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI 写作出题失败（${response.status}）：${errText || response.statusText}`);
      }

      const outputText = await extractOutputTextFromHttpResponse(response);
      if (!outputText) {
        throw new Error('AI 返回写作题为空，请稍后重试');
      }

      let parsed: { items?: RawAiWritingTask[] } | null = null;
      try {
        parsed = JSON.parse(outputText) as { items?: RawAiWritingTask[] };
      } catch {
        throw new Error('AI 返回不是有效 JSON，请调整模型或 Base URL');
      }

      const items = sanitizeWritingTasks(Array.isArray(parsed?.items) ? parsed.items : [], {
        level: params.level,
        purpose,
        scenario: params.scenario,
        register,
      });
      if (!items.length) {
        throw new Error('AI 返回写作题未通过校验，请重试');
      }
      return items.slice(0, params.count);
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
          stream: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI 解析失败（${response.status}）：${errText || response.statusText}`);
      }

      const outputText = await extractOutputTextFromHttpResponse(response);
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
          stream: false,
          text: {
            format: CONVERSATION_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`对话启动失败（${response.status}）：${errText || response.statusText}`);
      }

      const outputText = await extractOutputTextFromHttpResponse(response);
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
          stream: false,
          text: {
            format: CONVERSATION_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`对话回复失败（${response.status}）：${errText || response.statusText}`);
      }

      const outputText = await extractOutputTextFromHttpResponse(response);
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
    async evaluateTranslationAnswer(params: EvaluateTranslationAnswerParams) {
      ensureConfigReady();

      const sourceText = params.sourceText.trim();
      const referenceAnswer = params.referenceAnswer.trim();
      const userAnswer = params.userAnswer.trim();
      if (!sourceText) {
        throw new Error('题干为空，请重新生成题目');
      }
      if (!referenceAnswer) {
        throw new Error('参考答案为空，请重新生成题目');
      }
      if (!userAnswer) {
        throw new Error('请输入你的翻译答案');
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
              content: [{ type: 'input_text', text: buildTranslationEvalSystemPrompt() }],
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildTranslationEvalUserPrompt(params) }],
            },
          ],
          max_output_tokens: 900,
          stream: false,
          text: {
            format: TRANSLATION_EVAL_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`翻译批改失败（${response.status}）：${errText || response.statusText}`);
      }

      const outputText = await extractOutputTextFromHttpResponse(response);
      if (!outputText) {
        throw new Error('AI 未返回批改结果，请稍后重试');
      }

      try {
        const parsed = JSON.parse(outputText) as unknown;
        const result = normalizeTranslationEvalResult(parsed);
        if (!result.referenceAnswer || !result.feedbackCn) {
          throw new Error('批改关键字段为空');
        }
        return result;
      } catch {
        throw new Error('AI 批改结果格式无效，请重试');
      }
    },
    async evaluateWritingAnswer(params: EvaluateWritingAnswerParams) {
      ensureConfigReady();

      const userAnswer = params.userAnswer.trim();
      if (!userAnswer) {
        throw new Error('请输入你的写作答案');
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
              content: [{ type: 'input_text', text: buildWritingEvalSystemPrompt() }],
            },
            {
              role: 'user',
              content: [{ type: 'input_text', text: buildWritingEvalUserPrompt({ ...params, userAnswer }) }],
            },
          ],
          max_output_tokens: 1200,
          stream: false,
          text: {
            format: WRITING_EVAL_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`写作批改失败（${response.status}）：${errText || response.statusText}`);
      }

      const outputText = await extractOutputTextFromHttpResponse(response);
      if (!outputText) {
        throw new Error('AI 未返回写作批改结果，请稍后重试');
      }

      try {
        const parsed = JSON.parse(outputText) as unknown;
        const result = normalizeWritingEvalResult(parsed);
        if (!result.feedbackCn || !result.betterAnswer || !result.nextActionCn) {
          throw new Error('写作批改关键字段为空');
        }
        return result;
      } catch {
        throw new Error('AI 写作批改结果格式无效，请重试');
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
