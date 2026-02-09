import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextStyle, View } from 'react-native';
import OptionButton from '../components/OptionButton';
import PrimaryButton from '../components/PrimaryButton';
import { getGrammarByLevel } from '../data/grammars';
import { recordGrammarMistake } from '../db/queries';
import { GrammarStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { GrammarQuizItem, generateGrammarQuizItems } from '../utils/grammarQuiz';

type Props = NativeStackScreenProps<GrammarStackParamList, 'GrammarQuiz'>;

const DEFAULT_COUNT = 10;

function renderInlineMarkup(
  text: string,
  boldStyle: TextStyle,
  underlineStyle: TextStyle,
  strikeStyle: TextStyle
) {
  if (!text || !/<\/?(b|u|s)>|<br\s*\/?>/i.test(text)) return text;
  const parts = text.split(/(<\/?b>|<\/?u>|<\/?s>|<br\s*\/?>)/gi);
  let bold = false;
  let underline = false;
  let strike = false;
  let key = 0;
  const nodes: ReactNode[] = [];
  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    if (lower === '<b>') {
      bold = true;
      continue;
    }
    if (lower === '</b>') {
      bold = false;
      continue;
    }
    if (lower === '<u>') {
      underline = true;
      continue;
    }
    if (lower === '</u>') {
      underline = false;
      continue;
    }
    if (lower === '<s>') {
      strike = true;
      continue;
    }
    if (lower === '</s>') {
      strike = false;
      continue;
    }
    if (lower.startsWith('<br')) {
      nodes.push('\n');
      continue;
    }
    const inlineStyles = [bold ? boldStyle : null, underline ? underlineStyle : null, strike ? strikeStyle : null].filter(
      Boolean
    );
    nodes.push(
      <Text key={`m-${key}`} style={inlineStyles.length ? inlineStyles : undefined}>
        {part}
      </Text>
    );
    key += 1;
  }
  return nodes.length ? nodes : text;
}

export default function GrammarQuizScreen({ navigation, route }: Props) {
  const { level } = route.params;
  const settings = useAppStore((state) => state.settings);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<GrammarQuizItem[]>([]);
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

  const resetQuiz = () => {
    const list = generateGrammarQuizItems({
      grammars: getGrammarByLevel(level),
      count: DEFAULT_COUNT,
      modes: settings.grammar_quiz_modes,
    });
    setItems(list);
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(null);
    setCorrectCount(0);
    setWrongCount(0);
  };

  useEffect(() => {
    setLoading(true);
    resetQuiz();
    setLoading(false);
  }, [
    level,
    settings.grammar_quiz_modes.example_to_pattern,
    settings.grammar_quiz_modes.meaning_to_pattern,
    settings.grammar_quiz_modes.pattern_to_meaning,
  ]);

  const handleAnswer = async (answer: string) => {
    if (!currentItem || showResult) return;
    const correct = answer.trim() === currentItem.answer.trim();
    setSelected(answer);
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
      await recordGrammarMistake(currentItem.grammarId);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= items.length) {
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelected(null);
    setShowResult(false);
    setIsCorrect(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>题目生成中...</Text>
      </View>
    );
  }

  if (!currentItem) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>没有题目</Text>
        <PrimaryButton title="返回列表" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const finished = currentIndex + 1 >= items.length && showResult;
  const accuracy =
    items.length === 0 ? 0 : Math.round((correctCount / Math.max(1, correctCount + wrongCount)) * 100);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{level} 文法练习</Text>
        <Text style={styles.headerSubtitle}>{progressText}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.prompt}>
          {renderInlineMarkup(currentItem.prompt, styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
        </Text>
        <Text style={styles.subPrompt}>
          {currentItem.type === 'example_to_pattern'
            ? '根据例句选择正确文法'
            : currentItem.type === 'meaning_to_pattern'
            ? '根据释义选择正确文法'
            : '根据文法选择正确释义'}
        </Text>
        {currentItem.promptZh ? (
          <Text style={styles.subPromptAlt}>
            {renderInlineMarkup(currentItem.promptZh, styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
          </Text>
        ) : null}
        {currentItem.options.map((option) => (
          <OptionButton
            key={option}
            title={option}
            selected={selected === option}
            correct={showResult ? option === currentItem.answer : null}
            onPress={() => handleAnswer(option)}
          />
        ))}
      </View>

      {showResult && !finished && (
        <View style={styles.resultBox}>
          <Text style={[styles.resultText, isCorrect ? styles.correct : styles.wrong]}>
            {isCorrect ? (
              '回答正确！'
            ) : (
              <>
                回答错误，正确答案：
                {renderInlineMarkup(currentItem.answer, styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
              </>
            )}
          </Text>
          <PrimaryButton title="下一题" onPress={handleNext} />
        </View>
      )}

      {finished && (
        <View style={styles.resultBox}>
          <Text style={styles.summaryTitle}>练习完成</Text>
          <Text style={styles.summaryText}>
            正确 {correctCount}，错误 {wrongCount}，准确率 {accuracy}%
          </Text>
          <PrimaryButton title="再来一次" onPress={resetQuiz} style={styles.summaryButton} />
          <PrimaryButton title="返回列表" onPress={() => navigation.goBack()} />
        </View>
      )}
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
    marginTop: spacing.m,
    color: colors.muted,
    marginBottom: spacing.m,
  },
  container: {
    backgroundColor: colors.background,
    padding: spacing.m,
    paddingBottom: spacing.l,
  },
  header: {
    marginBottom: spacing.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    color: colors.muted,
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
    marginBottom: spacing.s,
  },
  subPrompt: {
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  subPromptAlt: {
    color: colors.muted,
    marginBottom: spacing.m,
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
    marginBottom: spacing.m,
    fontSize: 16,
    fontWeight: '600',
  },
  correct: {
    color: colors.success,
  },
  wrong: {
    color: colors.danger,
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
  inlineBold: {
    fontWeight: '700',
  },
  inlineUnderline: {
    textDecorationLine: 'underline',
  },
  inlineStrike: {
    textDecorationLine: 'line-through',
  },
});
