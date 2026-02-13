import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { evaluateTranslationAnswerWithAi } from '../features/ai/service';
import { SESSION_SIZE } from '../features/exam/examBank';
import { TranslationPracticeItem, generateTranslationPracticeItems } from '../features/translation/bank';
import { MyStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { BankLevel, TranslationDirection, TranslationEvalResult, TranslationFocus } from '../types';

type Props = NativeStackScreenProps<MyStackParamList, 'AiTranslationPractice'>;

const LEVELS: BankLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

function getDirectionLabel(direction: TranslationDirection) {
  return direction === 'zh_to_ja' ? '汉译日' : '日译汉';
}

function getFocusLabel(focus: TranslationFocus) {
  if (focus === 'vocab') return '词汇向';
  if (focus === 'grammar') return '文法向';
  return '综合向';
}

function getTaskPrompt(direction: TranslationDirection) {
  return direction === 'zh_to_ja' ? '请将下面中文翻译为自然日语' : '请将下面日语翻译为自然中文';
}

function getInputPlaceholder(direction: TranslationDirection) {
  return direction === 'zh_to_ja' ? '输入你的日语答案' : '输入你的中文答案';
}

export default function AiTranslationPracticeScreen({ navigation }: Props) {
  const [level, setLevel] = useState<BankLevel>('N5');
  const [direction, setDirection] = useState<TranslationDirection>('zh_to_ja');
  const [focus, setFocus] = useState<TranslationFocus>('vocab');
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [loadingSet, setLoadingSet] = useState(false);
  const [setError, setSetError] = useState('');
  const [items, setItems] = useState<TranslationPracticeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<TranslationEvalResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [scoreSum, setScoreSum] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const finished = items.length > 0 && currentIndex >= items.length;
  const currentItem = !finished ? items[currentIndex] : null;
  const progressText = useMemo(() => {
    if (!items.length) return '';
    if (finished) return `${items.length} / ${items.length}`;
    return `${currentIndex + 1} / ${items.length}`;
  }, [currentIndex, finished, items.length]);
  const avgScore = answeredCount > 0 ? Math.round(scoreSum / answeredCount) : 0;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const handleGenerate = async () => {
    if (loadingSet) return;
    setLoadingSet(true);
    setSettingsCollapsed(true);
    setSetError('');
    setSubmitError('');
    setResult(null);
    try {
      const practiceItems = await generateTranslationPracticeItems({
        level,
        direction,
        focus: direction === 'zh_to_ja' ? focus : 'mixed',
        count: SESSION_SIZE,
      });
      setItems(practiceItems);
      setCurrentIndex(0);
      setAnswerText('');
      setCorrectCount(0);
      setWrongCount(0);
      setScoreSum(0);
      setAnsweredCount(0);
    } catch (error) {
      setItems([]);
      setSettingsCollapsed(false);
      setSetError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingSet(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentItem || submitting || result) return;
    const userAnswer = answerText.trim();
    if (!userAnswer) {
      setSubmitError('请先输入翻译答案');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const evalResult = await evaluateTranslationAnswerWithAi({
        level: currentItem.level,
        direction: currentItem.direction,
        focus: currentItem.focus,
        sourceText: currentItem.sourceText,
        hint: currentItem.hint,
        referenceAnswer: currentItem.referenceAnswer,
        userAnswer,
      });
      setResult(evalResult);
      setAnsweredCount((value) => value + 1);
      setScoreSum((value) => value + evalResult.score);
      if (evalResult.isCorrect) {
        setCorrectCount((value) => value + 1);
      } else {
        setWrongCount((value) => value + 1);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!result) return;
    setResult(null);
    setSubmitError('');
    setAnswerText('');
    setCurrentIndex((value) => value + 1);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionTitle}>翻译设置</Text>
          <Pressable onPress={() => setSettingsCollapsed((value) => !value)} style={styles.linkBtn}>
            <Text style={styles.linkText}>{settingsCollapsed ? '展开设置' : '收起设置'}</Text>
          </Pressable>
        </View>
        {settingsCollapsed ? (
          <Text style={styles.tip}>
            当前：{level} · {getDirectionLabel(direction)} · {getFocusLabel(direction === 'zh_to_ja' ? focus : 'mixed')}
          </Text>
        ) : (
          <Text style={styles.tip}>先选等级和方向，汉译日可切换词汇向/文法向。</Text>
        )}

        {!settingsCollapsed ? (
          <View style={styles.row}>
            {LEVELS.map((item) => {
              return (
                <Pressable key={item} onPress={() => setLevel(item)} style={[styles.chip, item === level ? styles.chipActive : null]}>
                  <Text style={[styles.chipText, item === level ? styles.chipTextActive : null]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!settingsCollapsed ? (
          <View style={styles.row}>
            {(['zh_to_ja', 'ja_to_zh'] as TranslationDirection[]).map((item) => {
              const active = item === direction;
              return (
                <Pressable key={item} onPress={() => setDirection(item)} style={[styles.chip, active ? styles.chipActive : null]}>
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{getDirectionLabel(item)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!settingsCollapsed && direction === 'zh_to_ja' ? (
          <View style={styles.row}>
            {(['vocab', 'grammar'] as const).map((item) => {
              const active = item === focus;
              return (
                <Pressable key={item} onPress={() => setFocus(item)} style={[styles.chip, active ? styles.chipActive : null]}>
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{getFocusLabel(item)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <PrimaryButton title={loadingSet ? '生成中...' : '生成 10 题翻译练习'} onPress={handleGenerate} disabled={loadingSet} style={styles.actionBtn} />
      </View>

      {setError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>出题失败：{setError}</Text>
        </View>
      ) : null}

      {!items.length ? (
        <View style={styles.section}>
          <Text style={styles.tip}>生成后将开始本组翻译训练。</Text>
        </View>
      ) : null}

      {currentItem ? (
        <View style={styles.section}>
          <Text style={styles.metaText}>
            {progressText} · {getDirectionLabel(currentItem.direction)} · {getFocusLabel(currentItem.focus)}
          </Text>
          <Text style={styles.taskPrompt}>{getTaskPrompt(currentItem.direction)}</Text>
          <Text style={styles.sourceText}>{currentItem.sourceText}</Text>
          {currentItem.hint ? (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>{currentItem.hint}</Text>
            </View>
          ) : null}

          <TextInput
            value={answerText}
            onChangeText={setAnswerText}
            placeholder={getInputPlaceholder(currentItem.direction)}
            placeholderTextColor={colors.muted}
            multiline
            style={styles.input}
            editable={!submitting && !result}
            autoCorrect={false}
            autoCapitalize="none"
          />

          <PrimaryButton
            title={submitting ? 'AI 批改中...' : '提交批改'}
            onPress={handleSubmit}
            disabled={submitting || Boolean(result)}
            style={styles.actionBtn}
          />
          {submitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>AI 正在评估你的译文...</Text>
            </View>
          ) : null}
          {submitError ? <Text style={styles.errorText}>批改失败：{submitError}</Text> : null}

          {result ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultScore}>
                得分 {result.score} · 评级 {result.level}
              </Text>
              <Text style={styles.resultFeedback}>{result.feedbackCn}</Text>
              {result.errors.length ? <Text style={styles.resultLine}>主要问题：{result.errors.join('；')}</Text> : null}
              <Text style={styles.resultLine}>参考译文：{result.referenceAnswer}</Text>
              {result.betterAnswer ? <Text style={styles.resultLine}>更自然表达：{result.betterAnswer}</Text> : null}

              <PrimaryButton
                title={currentIndex + 1 >= items.length ? '查看结果' : '下一题'}
                onPress={handleNext}
                style={styles.actionBtn}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {finished ? (
        <View style={styles.section}>
          <Text style={styles.summaryTitle}>本组完成</Text>
          <Text style={styles.summaryText}>
            共 {answeredCount} 题，正确 {correctCount}，错误 {wrongCount}，准确率 {accuracy}%，平均分 {avgScore}
          </Text>
          <PrimaryButton title={loadingSet ? '生成中...' : '再来一组'} onPress={handleGenerate} disabled={loadingSet} style={styles.actionBtn} />
          <PrimaryButton title="返回 AI 学习中心" onPress={() => navigation.goBack()} style={styles.actionBtn} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    paddingBottom: spacing.l,
    backgroundColor: colors.background,
  },
  section: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tip: {
    color: colors.muted,
  },
  linkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.s,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  chipText: {
    color: colors.muted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primary,
  },
  actionBtn: {
    marginTop: spacing.s,
  },
  errorBox: {
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: radius.m,
    padding: spacing.s,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  metaText: {
    color: colors.muted,
    marginBottom: spacing.s,
    fontSize: 12,
  },
  taskPrompt: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  sourceText: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 30,
    marginBottom: spacing.s,
  },
  hintBox: {
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    borderRadius: radius.m,
    padding: spacing.s,
    marginBottom: spacing.s,
  },
  hintText: {
    color: '#075985',
    fontSize: 12,
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    color: colors.text,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    textAlignVertical: 'top',
  },
  loadingRow: {
    marginTop: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12,
  },
  resultCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: '#f5f3ff',
    borderRadius: radius.m,
    padding: spacing.s,
  },
  resultScore: {
    color: '#5b21b6',
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  resultFeedback: {
    color: colors.text,
    lineHeight: 22,
  },
  resultLine: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 12,
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
});
