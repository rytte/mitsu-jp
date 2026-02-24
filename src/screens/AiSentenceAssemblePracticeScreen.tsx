import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { generateSentenceAssembleWithAi } from '../features/ai/service';
import { SESSION_SIZE } from '../features/exam/examBank';
import { MyStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { AiSentenceAssembleItem } from '../types';
import { shuffle } from '../utils/random';

type Props = NativeStackScreenProps<MyStackParamList, 'AiSentenceAssemblePractice'>;
type TokenPiece = { id: string; text: string };

function stripSentenceAssemblePromptPrefix(prompt: string) {
  let text = prompt.trim();
  if (!text) return text;

  const prefixPatterns = [
    /^(?:请)?把词块(?:按正确顺序)?(?:排成|组成)(?:正确|完整|通顺)?句子[：:，,\s]*/u,
    /^(?:请)?把句子(?:拼好|拼完整|补全|还原)(?:即可)?[：:，,\s]*/u,
    /^(?:请)?将(?:下列|下面|以下)?词块(?:按正确顺序)?(?:组成|排列成)(?:正确|完整|通顺)?句子[：:，,\s]*/u,
    /^(?:连词成句|句子重组|词块重组|词语重组)[：:，,\s]*/u,
    /^(?:题干|提示|要求)\s*[：:]\s*/u,
  ];

  for (const pattern of prefixPatterns) {
    text = text.replace(pattern, '').trim();
  }

  return text.replace(/^[“"「『\s]+|[”"」』\s]+$/gu, '').trim();
}

function buildItems(aiItems: AiSentenceAssembleItem[]) {
  return aiItems.slice(0, Math.min(SESSION_SIZE, aiItems.length));
}

function formatSentence(tokens: string[]) {
  return tokens.join('');
}

export default function AiSentenceAssemblePracticeScreen({ navigation, route }: Props) {
  const { level, aiItems } = route.params;
  const [items, setItems] = useState<AiSentenceAssembleItem[]>(() => buildItems(aiItems));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [aiRegenerateLoading, setAiRegenerateLoading] = useState(false);
  const [aiRegenerateError, setAiRegenerateError] = useState('');

  const currentItem = items[currentIndex];
  const promptText = useMemo(() => stripSentenceAssemblePromptPrefix(currentItem?.prompt ?? ''), [currentItem?.prompt]);
  const sessionSize = Math.min(SESSION_SIZE, aiItems.length);
  const progressText = useMemo(() => {
    if (!items.length) return '';
    return `${currentIndex + 1} / ${items.length}`;
  }, [currentIndex, items.length]);

  const tokenPieces = useMemo<TokenPiece[]>(() => {
    if (!currentItem) return [];
    return currentItem.tokens.map((text, index) => ({
      id: `${currentItem.id}-${index}`,
      text,
    }));
  }, [currentItem]);

  const tokenMap = useMemo(() => new Map(tokenPieces.map((piece) => [piece.id, piece.text])), [tokenPieces]);
  const selectedPieces = selectedTokenIds
    .map((id) => {
      const text = tokenMap.get(id);
      return text ? { id, text } : null;
    })
    .filter(Boolean) as TokenPiece[];
  const availablePieces = tokenPieces.filter((piece) => !selectedTokenIds.includes(piece.id));

  const resetRoundState = () => {
    setSelectedTokenIds([]);
    setShowResult(false);
    setIsCorrect(null);
    setCheckError('');
  };

  useEffect(() => {
    navigation.setOptions({ title: 'AI 连词成句' });
    setItems(buildItems(aiItems));
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAiRegenerateLoading(false);
    setAiRegenerateError('');
    resetRoundState();
  }, [aiItems, navigation]);

  const resetWithItems = (nextItems: AiSentenceAssembleItem[]) => {
    setItems(nextItems);
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAiRegenerateError('');
    resetRoundState();
  };

  const handleSelectToken = (tokenId: string) => {
    if (!currentItem || showResult) return;
    if (selectedTokenIds.includes(tokenId)) return;
    setCheckError('');
    setSelectedTokenIds((value) => [...value, tokenId]);
  };

  const handleRemoveSelected = (tokenId: string) => {
    if (showResult) return;
    setCheckError('');
    setSelectedTokenIds((value) => value.filter((id) => id !== tokenId));
  };

  const handleResetCurrent = () => {
    if (showResult) return;
    setCheckError('');
    setSelectedTokenIds([]);
  };

  const handleCheckAnswer = () => {
    if (!currentItem || showResult) return;

    if (selectedPieces.length !== currentItem.answerTokens.length) {
      setCheckError('请先用完全部词块再检查答案');
      return;
    }

    const userTokens = selectedPieces.map((piece) => piece.text);
    const correct = userTokens.every((token, index) => token === currentItem.answerTokens[index]);
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) {
      setCorrectCount((value) => value + 1);
    } else {
      setWrongCount((value) => value + 1);
    }
  };

  const handleNext = () => {
    if (!showResult) return;
    if (currentIndex + 1 >= items.length) return;
    setCurrentIndex((index) => index + 1);
    resetRoundState();
  };

  const handleRegenerate = async () => {
    if (aiRegenerateLoading) return;
    setAiRegenerateLoading(true);
    setAiRegenerateError('');
    try {
      const nextItems = await generateSentenceAssembleWithAi(level, SESSION_SIZE);
      if (!nextItems.length) {
        throw new Error('AI 返回题目为空或校验失败，请重试');
      }
      if (nextItems.length < SESSION_SIZE) {
        throw new Error(`AI 仅返回 ${nextItems.length} 题，未达到 ${SESSION_SIZE} 题要求，请重试`);
      }
      resetWithItems(nextItems);
    } catch (error) {
      setAiRegenerateError(error instanceof Error ? error.message : String(error));
      resetWithItems(shuffle(aiItems).slice(0, Math.min(SESSION_SIZE, aiItems.length)));
    } finally {
      setAiRegenerateLoading(false);
    }
  };

  if (!currentItem) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>AI 连词成句练习为空，暂无可练习内容</Text>
        <PrimaryButton title="返回 AI 学习中心" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const finished = currentIndex + 1 >= items.length && showResult;
  const accuracy = items.length === 0 ? 0 : Math.round((correctCount / Math.max(1, correctCount + wrongCount)) * 100);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.tip}>{progressText} · 本次由 AI 生成，共 {sessionSize} 题</Text>

      <View style={styles.card}>
        <View style={styles.questionTypeChip}>
          <Text style={styles.questionTypeChipText}>题型：连词成句</Text>
        </View>
        {promptText ? <Text style={styles.prompt}>{promptText}</Text> : null}

        <Text style={styles.sectionLabel}>你的句子</Text>
        <View style={styles.tokenWrap}>
          {selectedPieces.length ? (
            selectedPieces.map((piece) => (
              <Pressable key={piece.id} onPress={() => handleRemoveSelected(piece.id)} style={styles.selectedToken}>
                <Text style={styles.selectedTokenText}>{piece.text}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.placeholderText}>点击下方词块开始组句</Text>
          )}
        </View>

        <Text style={[styles.sectionLabel, styles.poolLabel]}>词块池</Text>
        <View style={styles.tokenWrap}>
          {availablePieces.length ? (
            availablePieces.map((piece) => (
              <Pressable key={piece.id} onPress={() => handleSelectToken(piece.id)} style={styles.poolToken}>
                <Text style={styles.poolTokenText}>{piece.text}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.placeholderText}>已全部选入上方句子</Text>
          )}
        </View>

        {checkError ? <Text style={styles.checkError}>{checkError}</Text> : null}
        <PrimaryButton title="检查答案" onPress={handleCheckAnswer} disabled={showResult} style={styles.actionBtn} />
        {!showResult ? <PrimaryButton title="重置本题" onPress={handleResetCurrent} style={styles.actionBtn} /> : null}
      </View>

      {showResult ? (
        <View style={styles.resultBox}>
          <Text style={[styles.resultText, isCorrect ? styles.correct : styles.wrong]}>
            {isCorrect ? '回答正确！' : '回答错误'}
          </Text>
          {!isCorrect ? (
            <Text style={styles.answerText}>正确句子：{formatSentence(currentItem.answerTokens)}</Text>
          ) : null}
          {!finished ? <PrimaryButton title="下一题" onPress={handleNext} style={styles.actionBtn} /> : null}
        </View>
      ) : null}

      {finished ? (
        <View style={styles.resultBox}>
          <Text style={styles.summaryTitle}>练习完成</Text>
          <Text style={styles.summaryText}>
            正确 {correctCount}，错误 {wrongCount}，准确率 {accuracy}%
          </Text>
          <PrimaryButton title={aiRegenerateLoading ? 'AI 出题中...' : '再来一组'} onPress={handleRegenerate} style={styles.actionBtn} />
          {aiRegenerateLoading ? (
            <View style={styles.aiRegenerateRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.aiRegenerateText}>正在向 AI 请求新题...</Text>
            </View>
          ) : null}
          {aiRegenerateError ? <Text style={styles.aiRegenerateError}>AI 出题失败：{aiRegenerateError}</Text> : null}
          <PrimaryButton title="返回 AI 学习中心" onPress={() => navigation.goBack()} style={styles.actionBtn} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.m,
  },
  loadingText: {
    color: colors.muted,
    marginBottom: spacing.m,
  },
  container: {
    backgroundColor: colors.background,
    padding: spacing.m,
    paddingBottom: spacing.l,
  },
  tip: {
    color: colors.muted,
    marginBottom: spacing.m,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionTypeChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
  },
  questionTypeChipText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  prompt: {
    marginTop: spacing.s,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  sectionLabel: {
    marginTop: spacing.m,
    marginBottom: spacing.xs,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  poolLabel: {
    marginTop: spacing.s,
  },
  tokenWrap: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.s,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  selectedToken: {
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
  },
  selectedTokenText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  poolToken: {
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
  },
  poolTokenText: {
    color: colors.text,
    fontWeight: '600',
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 12,
  },
  checkError: {
    marginTop: spacing.s,
    color: colors.danger,
    fontSize: 12,
  },
  actionBtn: {
    marginTop: spacing.s,
  },
  resultBox: {
    marginTop: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
  },
  correct: {
    color: colors.success,
  },
  wrong: {
    color: colors.danger,
  },
  answerText: {
    marginTop: spacing.s,
    color: colors.text,
    lineHeight: 22,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  summaryText: {
    color: colors.muted,
  },
  aiRegenerateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.s,
  },
  aiRegenerateText: {
    marginLeft: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  aiRegenerateError: {
    marginTop: spacing.s,
    color: colors.danger,
    fontSize: 12,
  },
});
