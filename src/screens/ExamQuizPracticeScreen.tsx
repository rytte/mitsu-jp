import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeaderBackButton } from '@react-navigation/elements';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import OptionButton from '../components/OptionButton';
import PrimaryButton from '../components/PrimaryButton';
import { explainExamQuestionWithAi } from '../features/ai/service';
import { getQuestionBank, SESSION_SIZE } from '../features/exam/examBank';
import { ExamQuizStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { ExamQuizItem } from '../types';
import { shuffle } from '../utils/random';

type Props = NativeStackScreenProps<ExamQuizStackParamList, 'ExamQuizPractice'>;

function buildItems(level: Props['route']['params']['level'], aiItems?: ExamQuizItem[]) {
  const hasAiItems = Array.isArray(aiItems) && aiItems.length > 0;
  if (hasAiItems) {
    return aiItems.slice(0, Math.min(SESSION_SIZE, aiItems.length));
  }
  return shuffle(getQuestionBank(level)).slice(0, Math.min(SESSION_SIZE, getQuestionBank(level).length));
}

export default function ExamQuizPracticeScreen({ navigation, route }: Props) {
  const { level, aiItems } = route.params;
  const hasAiItems = Array.isArray(aiItems) && aiItems.length > 0;
  const practiceTitle = hasAiItems ? 'AI 练习' : '真题练习';
  const [items, setItems] = useState<ExamQuizItem[]>(() => buildItems(level, aiItems));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [aiExplainLoading, setAiExplainLoading] = useState(false);
  const [aiExplainText, setAiExplainText] = useState('');
  const [aiExplainError, setAiExplainError] = useState('');

  const currentItem = items[currentIndex];
  const progressText = useMemo(() => {
    if (!items.length) return '';
    return `${currentIndex + 1} / ${items.length}`;
  }, [currentIndex, items.length]);
  const sessionSize = hasAiItems
    ? Math.min(SESSION_SIZE, aiItems.length)
    : Math.min(SESSION_SIZE, getQuestionBank(level).length);

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    const parentType = (parent?.getState() as { type?: string } | undefined)?.type;
    const parentCanGoBack = parent?.canGoBack?.() ?? false;
    const canGoBackSelf = navigation.canGoBack();
    navigation.setOptions({
      title: practiceTitle,
      headerLeft:
        !canGoBackSelf && parentType === 'stack' && parentCanGoBack
          ? (props) => <HeaderBackButton {...props} onPress={() => parent?.goBack()} />
          : undefined,
    });
  }, [navigation, practiceTitle]);

  const resetState = (nextItems: ExamQuizItem[]) => {
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

  useEffect(() => {
    resetState(buildItems(level, aiItems));
  }, [aiItems, level]);

  const resetQuiz = () => {
    if (hasAiItems) {
      resetState(shuffle(aiItems).slice(0, Math.min(SESSION_SIZE, aiItems.length)));
      return;
    }
    resetState(shuffle(getQuestionBank(level)).slice(0, Math.min(SESSION_SIZE, getQuestionBank(level).length)));
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
        <Text style={styles.loadingText}>
          {hasAiItems ? 'AI 题单为空，暂无可练习题目' : `${level} 题库为空，暂无可练习题目`}
        </Text>
        <PrimaryButton title={hasAiItems ? '返回 AI 学习中心' : '返回题库'} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const finished = currentIndex + 1 >= items.length && showResult;
  const accuracy =
    items.length === 0 ? 0 : Math.round((correctCount / Math.max(1, correctCount + wrongCount)) * 100);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.tip}>
        {progressText} · {hasAiItems ? `本次由 AI 生成，共 ${sessionSize} 题` : `${level} 题库，每次随机抽取 ${sessionSize} 题`}
      </Text>

      <View style={styles.card}>
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
          <PrimaryButton title="再来一组" onPress={resetQuiz} style={styles.summaryButton} />
          <PrimaryButton
            title={hasAiItems ? '返回 AI 学习中心' : '返回题库'}
            onPress={() => navigation.goBack()}
            style={styles.summaryButton}
          />
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
});
