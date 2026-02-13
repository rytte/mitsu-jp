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

type InlineToken =
  | {
      type: 'text';
      text: string;
      bold: boolean;
      underline: boolean;
      strike: boolean;
    }
  | { type: 'newline' };

type FuriganaPiece =
  | { type: 'text'; text: string }
  | { type: 'ruby'; base: string; ruby: string };

function parseInlineTokens(text: string): InlineToken[] {
  if (!text) return [];
  const parts = text.split(/(<\/?b>|<\/?u>|<\/?s>|<br\s*\/?>)/gi);
  const tokens: InlineToken[] = [];
  let bold = false;
  let underline = false;
  let strike = false;
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
      tokens.push({ type: 'newline' });
      continue;
    }
    tokens.push({ type: 'text', text: part, bold, underline, strike });
  }
  return tokens;
}

function isKanji(char: string) {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uF900-\uFAFF]/.test(char);
}

function splitFurigana(text: string): FuriganaPiece[] {
  if (!text) return [];
  const pieces: FuriganaPiece[] = [];
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('[', index);
    if (open === -1) {
      const remaining = text.slice(index);
      if (remaining) pieces.push({ type: 'text', text: remaining });
      break;
    }
    const close = text.indexOf(']', open + 1);
    if (close === -1) {
      const remaining = text.slice(index);
      if (remaining) pieces.push({ type: 'text', text: remaining });
      break;
    }

    let baseStart = open;
    while (baseStart - 1 >= index && isKanji(text[baseStart - 1])) {
      baseStart -= 1;
    }

    if (baseStart === open) {
      pieces.push({ type: 'text', text: text.slice(index, open + 1) });
      index = open + 1;
      continue;
    }

    if (baseStart > index) {
      pieces.push({ type: 'text', text: text.slice(index, baseStart) });
    }
    pieces.push({ type: 'ruby', base: text.slice(baseStart, open), ruby: text.slice(open + 1, close) });
    index = close + 1;
  }
  return pieces;
}

function hasFuriganaMarkup(text: string) {
  return /[\u3400-\u9fff][^\]]*\[[^\]]+\]/.test(text);
}

function renderFuriganaMarkup(text: string, fontSize: number, baseStyle: TextStyle) {
  const tokens = parseInlineTokens(text);
  const readingSize = Math.max(10, Math.round(fontSize * 0.6));
  const lines: ReactNode[] = [];
  let lineNodes: ReactNode[] = [];
  let key = 0;

  const buildBaseStyle = (token: InlineToken) => {
    if (token.type !== 'text') return [];
    return [
      baseStyle,
      { fontSize, lineHeight: Math.round(fontSize * 1.5) },
      token.bold ? styles.inlineBold : null,
      token.underline ? styles.inlineUnderline : null,
      token.strike ? styles.inlineStrike : null,
    ];
  };
  const buildReadingStyle = (token: InlineToken) => {
    if (token.type !== 'text') return [];
    return [
      styles.furiganaReading,
      { fontSize: readingSize, lineHeight: Math.round(readingSize * 1.1) },
      token.bold ? styles.inlineBold : null,
    ];
  };

  const pushLine = () => {
    if (lineNodes.length === 0) {
      lines.push(<View key={`line-${lines.length}`} style={styles.furiganaLine} />);
    } else {
      const lineStyle = [styles.furiganaLine, lines.length > 0 ? styles.furiganaLineGap : null];
      lines.push(
        <View key={`line-${lines.length}`} style={lineStyle}>
          {lineNodes}
        </View>
      );
    }
    lineNodes = [];
  };

  for (const token of tokens) {
    if (token.type === 'newline') {
      pushLine();
      continue;
    }
    const pieces = splitFurigana(token.text);
    for (const piece of pieces) {
      if (piece.type === 'text') {
        for (const char of Array.from(piece.text)) {
          lineNodes.push(
            <Text key={`t-${key}`} style={buildBaseStyle(token)}>
              {char}
            </Text>
          );
          key += 1;
        }
      } else {
        lineNodes.push(
          <View key={`r-${key}`} style={styles.furiganaUnit}>
            <Text style={buildReadingStyle(token)}>{piece.ruby}</Text>
            <Text style={buildBaseStyle(token)}>{piece.base}</Text>
          </View>
        );
        key += 1;
      }
    }
  }

  pushLine();
  return <View style={styles.furiganaWrap}>{lines}</View>;
}

function renderRichText(text: string, fontSize: number, baseStyle: TextStyle) {
  if (hasFuriganaMarkup(text)) {
    return renderFuriganaMarkup(text, fontSize, baseStyle);
  }
  return (
    <Text style={[baseStyle, { fontSize, lineHeight: Math.round(fontSize * 1.5) }]}>
      {renderInlineMarkup(text, styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
    </Text>
  );
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
  const subPromptText =
    currentItem.type === 'example_to_pattern'
      ? '根据例句选择正确文法'
      : currentItem.type === 'meaning_to_pattern'
      ? '根据释义选择正确文法'
      : '根据文法选择正确释义';
  const showPromptZhAboveSubPrompt = currentItem.type === 'example_to_pattern' && Boolean(currentItem.promptZh);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{level} 文法练习</Text>
        <Text style={styles.headerSubtitle}>{progressText}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.promptWrap}>{renderRichText(currentItem.prompt, 18, styles.promptText)}</View>
        {showPromptZhAboveSubPrompt ? (
          <Text style={[styles.subPromptAlt, styles.subPromptAltBefore]}>
            {renderInlineMarkup(currentItem.promptZh ?? '', styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
          </Text>
        ) : null}
        <Text style={[styles.subPrompt, showPromptZhAboveSubPrompt ? styles.subPromptWithBottomGap : null]}>
          {subPromptText}
        </Text>
        {!showPromptZhAboveSubPrompt && currentItem.promptZh ? (
          <Text style={styles.subPromptAlt}>
            {renderInlineMarkup(currentItem.promptZh, styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
          </Text>
        ) : null}
        {currentItem.options.map((option) => (
          <OptionButton
            key={option}
            title={renderRichText(option, 16, styles.optionText)}
            selected={selected === option}
            correct={showResult ? option === currentItem.answer : null}
            onPress={() => handleAnswer(option)}
          />
        ))}
      </View>

      {showResult && !finished && (
        <View style={styles.resultBox}>
          {isCorrect ? (
            <Text style={[styles.resultText, styles.correct, styles.correctText]}>回答正确！</Text>
          ) : (
            <View style={styles.answerWrap}>
              <Text style={[styles.resultText, styles.wrong, styles.answerLabel]}>回答错误，正确答案：</Text>
              {renderRichText(currentItem.answer, 16, styles.answerText)}
            </View>
          )}
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
  promptWrap: {
    marginBottom: spacing.s,
  },
  promptText: {
    fontWeight: '700',
    color: colors.text,
  },
  optionText: {
    color: colors.text,
  },
  subPrompt: {
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  subPromptAlt: {
    color: colors.muted,
    marginBottom: spacing.m,
  },
  subPromptAltBefore: {
    marginBottom: spacing.xs,
  },
  subPromptWithBottomGap: {
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
    fontSize: 16,
    fontWeight: '600',
  },
  correctText: {
    marginBottom: spacing.m,
  },
  answerWrap: {
    marginBottom: spacing.m,
  },
  answerLabel: {
    marginBottom: spacing.xs,
  },
  answerText: {
    color: colors.text,
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
  furiganaWrap: {
    flexDirection: 'column',
  },
  furiganaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  furiganaLineGap: {
    marginTop: spacing.xs,
  },
  furiganaUnit: {
    alignItems: 'center',
  },
  furiganaReading: {
    color: colors.muted,
    includeFontPadding: false,
  },
});
