import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import OptionButton from '../components/OptionButton';
import PrimaryButton from '../components/PrimaryButton';
import { BANK_LEVELS, getQuestionBank, SESSION_SIZE } from '../features/exam/examBank';
import { MyStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { BankLevel, ExamQuizItem } from '../types';
import { shuffle } from '../utils/random';

type Props = NativeStackScreenProps<MyStackParamList, 'ExamQuiz'>;

export default function ExamQuizScreen({ navigation, route }: Props) {
  const aiItems = route.params?.aiItems;
  const aiLevel = route.params?.aiLevel;
  const hasAiItems = Array.isArray(aiItems) && aiItems.length > 0;
  const practiceTitle = hasAiItems ? 'AI 练习' : '真题练习';
  const bankTitle = hasAiItems ? 'AI 题单' : '真题题库';
  const [selectedLevel, setSelectedLevel] = useState<BankLevel | null>(hasAiItems ? aiLevel ?? 'N5' : null);
  const [items, setItems] = useState<ExamQuizItem[]>(
    hasAiItems ? aiItems.slice(0, Math.min(SESSION_SIZE, aiItems.length)) : []
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const currentItem = items[currentIndex];
  const progressText = useMemo(() => {
    if (!items.length) return '';
    return `${currentIndex + 1} / ${items.length}`;
  }, [currentIndex, items.length]);

  const questionBank = useMemo(() => (selectedLevel ? getQuestionBank(selectedLevel) : []), [selectedLevel]);
  const sessionSize = hasAiItems
    ? Math.min(SESSION_SIZE, aiItems.length)
    : Math.min(SESSION_SIZE, questionBank.length);

  useEffect(() => {
    if (!hasAiItems) return;
    setSelectedLevel(aiLevel ?? 'N5');
    setItems(aiItems.slice(0, Math.min(SESSION_SIZE, aiItems.length)));
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
  }, [aiItems, aiLevel, hasAiItems]);

  useEffect(() => {
    navigation.setOptions({ title: practiceTitle });
  }, [navigation, practiceTitle]);

  const startQuiz = (level: BankLevel) => {
    const bank = getQuestionBank(level);
    const nextItems = shuffle(bank).slice(0, Math.min(SESSION_SIZE, bank.length));
    setSelectedLevel(level);
    setItems(nextItems);
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
  };

  const resetQuiz = () => {
    if (!selectedLevel) return;
    if (hasAiItems) {
      setItems(shuffle(aiItems).slice(0, Math.min(SESSION_SIZE, aiItems.length)));
      setCurrentIndex(0);
      setSelected(null);
      setShowResult(false);
      setIsCorrect(null);
      setCorrectCount(0);
      setWrongCount(0);
      return;
    }
    const bank = getQuestionBank(selectedLevel);
    setItems(shuffle(bank).slice(0, Math.min(SESSION_SIZE, bank.length)));
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
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
  };

  const backToBankSelect = () => {
    if (hasAiItems) {
      navigation.setParams({ aiItems: undefined, aiLevel: undefined });
    }
    setSelectedLevel(null);
    setItems([]);
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
  };

  if (!selectedLevel) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>{practiceTitle}</Text>
          <Text style={styles.tip}>先选择题库，再开始练习</Text>
        </View>
        {BANK_LEVELS.map((level) => {
          const count = getQuestionBank(level).length;
          const disabled = count === 0;
          const drawCount = Math.min(SESSION_SIZE, count);
          return (
            <Pressable
              key={level}
              onPress={() => (disabled ? undefined : startQuiz(level))}
              disabled={disabled}
              style={({ pressed }) => [
                styles.bankCard,
                pressed && !disabled ? styles.bankCardPressed : null,
                disabled ? styles.bankCardDisabled : null,
              ]}
            >
              <View style={styles.bankMain}>
                <View style={styles.bankTopRow}>
                  <View style={styles.bankBadge}>
                    <Text style={styles.bankBadgeText}>{level}</Text>
                  </View>
                  <Text style={styles.bankTitle}>{bankTitle}</Text>
                </View>
                <View style={styles.bankMetaRow}>
                  <View style={styles.bankMetaChip}>
                    <Text style={styles.bankMetaText}>共 {count} 题</Text>
                  </View>
                  <View style={styles.bankMetaChip}>
                    <Text style={styles.bankMetaText}>每组 {drawCount} 题</Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.muted}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  if (!currentItem) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{selectedLevel} 题库为空，暂无可练习题目</Text>
        <PrimaryButton title="重新选题库" onPress={backToBankSelect} />
        <PrimaryButton title="返回" onPress={() => navigation.goBack()} style={styles.summaryButton} />
      </View>
    );
  }

  const finished = currentIndex + 1 >= items.length && showResult;
  const accuracy =
    items.length === 0 ? 0 : Math.round((correctCount / Math.max(1, correctCount + wrongCount)) * 100);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{selectedLevel} {practiceTitle}</Text>
        <Text style={styles.headerSubtitle}>{progressText}</Text>
      </View>

      <Text style={styles.tip}>
        {hasAiItems ? `本次由 AI 生成，共 ${sessionSize} 题` : `每次随机抽取 ${sessionSize} 题`}
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

      {showResult && !finished ? (
        <View style={styles.resultBox}>
          <Text style={[styles.resultText, isCorrect ? styles.correct : styles.wrong]}>
            {isCorrect ? '回答正确！' : `回答错误，正确答案：${currentItem.answer}`}
          </Text>
          <PrimaryButton title="下一题" onPress={handleNext} style={styles.nextButton} />
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
            onPress={() => (hasAiItems ? navigation.goBack() : backToBankSelect())}
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
  header: {
    marginBottom: spacing.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBlock: {
    marginBottom: spacing.m,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    color: colors.muted,
  },
  tip: {
    color: colors.muted,
    marginBottom: spacing.m,
  },
  bankCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftColor: colors.primary,
    borderLeftWidth: 5,
    marginBottom: spacing.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bankMain: {
    flex: 1,
    marginRight: spacing.s,
  },
  bankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  bankBadge: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
  },
  bankBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  bankCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  bankCardDisabled: {
    opacity: 0.6,
  },
  bankTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  bankSubtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.s,
    fontSize: 12,
  },
  bankMetaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  bankMetaChip: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
  },
  bankMetaText: {
    color: colors.muted,
    fontSize: 12,
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
