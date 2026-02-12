import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import OptionButton from '../components/OptionButton';
import PrimaryButton from '../components/PrimaryButton';
import { explainExamQuestionWithAi, generateExamQuizWithAi } from '../features/ai/service';
import { sanitizeRawExamItems, SESSION_SIZE } from '../features/exam/examBank';
import { getQuestionTypeInfo, getReorderFillTip } from '../features/exam/questionType';
import { MyStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { ExamQuizItem } from '../types';
import { shuffle } from '../utils/random';

type Props = NativeStackScreenProps<MyStackParamList, 'AiExamQuizPractice'>;

function buildItems(aiItems: ExamQuizItem[]) {
  return aiItems.slice(0, Math.min(SESSION_SIZE, aiItems.length));
}

export default function AiExamQuizPracticeScreen({ navigation, route }: Props) {
  const { level, aiItems } = route.params;
  const [items, setItems] = useState<ExamQuizItem[]>(() => buildItems(aiItems));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [aiExplainLoading, setAiExplainLoading] = useState(false);
  const [aiExplainText, setAiExplainText] = useState('');
  const [aiExplainError, setAiExplainError] = useState('');
  const [aiRegenerateLoading, setAiRegenerateLoading] = useState(false);
  const [aiRegenerateError, setAiRegenerateError] = useState('');

  const currentItem = items[currentIndex];
  const progressText = useMemo(() => {
    if (!items.length) return '';
    return `${currentIndex + 1} / ${items.length}`;
  }, [currentIndex, items.length]);
  const sessionSize = Math.min(SESSION_SIZE, aiItems.length);
  const questionTypeInfo = useMemo(() => {
    const base = getQuestionTypeInfo(currentItem?.questionType);
    if (currentItem?.questionType !== 'reorder_fill') {
      return base;
    }
    return {
      ...base,
      tip: getReorderFillTip(currentItem.prompt.includes('★')),
    };
  }, [currentItem?.prompt, currentItem?.questionType]);

  useEffect(() => {
    navigation.setOptions({ title: 'AI 练习' });
    setItems(buildItems(aiItems));
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
    setAiExplainLoading(false);
    setAiExplainText('');
    setAiExplainError('');
    setAiRegenerateLoading(false);
    setAiRegenerateError('');
  }, [aiItems, navigation]);

  const resetWithItems = (nextItems: ExamQuizItem[]) => {
    setItems(nextItems);
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
    setAiExplainLoading(false);
    setAiExplainText('');
    setAiExplainError('');
  };

  const resetQuiz = async () => {
    if (aiRegenerateLoading) return;
    setAiRegenerateLoading(true);
    setAiRegenerateError('');
    try {
      const rawItems = await generateExamQuizWithAi(level, SESSION_SIZE);
      const nextItems = sanitizeRawExamItems(rawItems).slice(0, SESSION_SIZE);
      if (!nextItems.length) {
        throw new Error('AI 返回题目为空或校验失败，请重试');
      }
      if (nextItems.length < SESSION_SIZE) {
        throw new Error(`AI 仅返回 ${nextItems.length} 题，未达到 ${SESSION_SIZE} 题要求，请重试`);
      }
      resetWithItems(nextItems);
    } catch (error) {
      setAiRegenerateError(error instanceof Error ? error.message : String(error));
      // 兜底：保持当前体验，不让用户卡死在完成页
      resetWithItems(shuffle(aiItems).slice(0, Math.min(SESSION_SIZE, aiItems.length)));
    } finally {
      setAiRegenerateLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!currentItem || showResult) return;
    setSelected(answer);
    const correct = answer === currentItem.answer;
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
    setSelected(null);
    setShowResult(false);
    setIsCorrect(null);
    setAiExplainLoading(false);
    setAiExplainText('');
    setAiExplainError('');
  };

  const handleAiExplain = async () => {
    if (!currentItem || !selected || !showResult || aiExplainLoading) return;
    setAiExplainLoading(true);
    setAiExplainError('');
    try {
      const text = await explainExamQuestionWithAi({
        level,
        prompt: currentItem.prompt,
        options: currentItem.options,
        correctAnswer: currentItem.answer,
        userAnswer: selected,
        isCorrect: selected === currentItem.answer,
        questionType: currentItem.questionType,
      });
      setAiExplainText(text.trim());
    } catch (error) {
      setAiExplainError(error instanceof Error ? error.message : String(error));
    } finally {
      setAiExplainLoading(false);
    }
  };

  if (!currentItem) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>AI 题单为空，暂无可练习题目</Text>
        <PrimaryButton title="返回 AI 学习中心" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const finished = currentIndex + 1 >= items.length && showResult;
  const accuracy =
    items.length === 0 ? 0 : Math.round((correctCount / Math.max(1, correctCount + wrongCount)) * 100);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.tip}>{progressText} · 本次由 AI 生成，共 {sessionSize} 题</Text>

      <View style={styles.card}>
        <View style={styles.questionTypeRow}>
          <View style={styles.questionTypeChip}>
            <Text style={styles.questionTypeChipText}>题型：{questionTypeInfo.label}</Text>
          </View>
          <Text style={styles.questionTypeTip}>{questionTypeInfo.tip}</Text>
        </View>
        <Text style={styles.prompt}>{currentItem.prompt}</Text>
        {currentItem.options.map((option, optionIndex) => (
          <OptionButton
            key={`${currentItem.id}-${optionIndex}`}
            title={option}
            selected={selected === option}
            correct={showResult ? option === currentItem.answer : null}
            onPress={() => handleAnswer(option)}
          />
        ))}
      </View>

      {showResult ? (
        <View style={styles.resultBox}>
          <Text style={[styles.resultText, isCorrect ? styles.correct : styles.wrong]}>
            {isCorrect ? '回答正确！' : `回答错误，正确答案：${currentItem.answer}`}
          </Text>
          <Pressable
            onPress={handleAiExplain}
            disabled={aiExplainLoading}
            style={({ pressed }) => [
              styles.aiExplainBtn,
              pressed && !aiExplainLoading ? styles.aiExplainBtnPressed : null,
              aiExplainLoading ? styles.aiExplainBtnDisabled : null,
            ]}
          >
            <Text style={styles.aiExplainBtnText}>{aiExplainLoading ? 'AI 解析生成中...' : 'AI 解析'}</Text>
          </Pressable>
          {aiExplainError ? <Text style={styles.aiExplainError}>解析失败：{aiExplainError}</Text> : null}
          {aiExplainText ? (
            <View style={styles.aiExplainCard}>
              <Text style={styles.aiExplainTitle}>AI 解析</Text>
              <Text style={styles.aiExplainText}>{aiExplainText}</Text>
            </View>
          ) : null}
          {!finished ? <PrimaryButton title="下一题" onPress={handleNext} style={styles.nextButton} /> : null}
        </View>
      ) : null}

      {finished ? (
        <View style={styles.resultBox}>
          <Text style={styles.summaryTitle}>练习完成</Text>
          <Text style={styles.summaryText}>
            正确 {correctCount}，错误 {wrongCount}，准确率 {accuracy}%
          </Text>
          <PrimaryButton title={aiRegenerateLoading ? 'AI 出题中...' : '再来一组'} onPress={resetQuiz} style={styles.summaryButton} />
          {aiRegenerateLoading ? (
            <View style={styles.aiRegenerateRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.aiRegenerateText}>正在向 AI 请求新题...</Text>
            </View>
          ) : null}
          {aiRegenerateError ? <Text style={styles.aiRegenerateError}>AI 出题失败：{aiRegenerateError}</Text> : null}
          <PrimaryButton title="返回 AI 学习中心" onPress={() => navigation.goBack()} style={styles.summaryButton} />
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
  questionTypeRow: {
    marginBottom: spacing.s,
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
  questionTypeTip: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  prompt: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.m,
    lineHeight: 28,
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
  nextButton: {
    marginTop: spacing.m,
  },
  aiExplainBtn: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#7c3aed',
    borderRadius: radius.m,
    backgroundColor: '#f5f3ff',
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  aiExplainBtnPressed: {
    opacity: 0.9,
  },
  aiExplainBtnDisabled: {
    opacity: 0.6,
  },
  aiExplainBtnText: {
    color: '#6d28d9',
    fontWeight: '700',
  },
  aiExplainError: {
    marginTop: spacing.s,
    color: colors.danger,
    fontSize: 12,
  },
  aiExplainCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
    borderRadius: radius.m,
    padding: spacing.s,
  },
  aiExplainTitle: {
    fontWeight: '700',
    color: '#6d28d9',
    marginBottom: spacing.xs,
  },
  aiExplainText: {
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
    marginBottom: spacing.m,
  },
  summaryButton: {
    marginBottom: spacing.s,
  },
  aiRegenerateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  aiRegenerateText: {
    marginLeft: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  aiRegenerateError: {
    marginBottom: spacing.s,
    color: colors.danger,
    fontSize: 12,
  },
});
