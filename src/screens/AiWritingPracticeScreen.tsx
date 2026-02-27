import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { evaluateWritingAnswerWithAi, generateWritingTasksWithAi } from '../features/ai/service';
import { WRITING_SESSION_SIZE } from '../features/exam/examBank';
import { MyStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { AiWritingTask, BankLevel, WritingEvalResult, WritingPurpose, WritingRegister } from '../types';

type Props = NativeStackScreenProps<MyStackParamList, 'AiWritingPractice'>;

const LEVELS: BankLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const PURPOSE_OPTIONS: Array<{ value: WritingPurpose; label: string }> = [
  { value: 'request', label: '请求' },
  { value: 'apology', label: '道歉' },
  { value: 'invitation', label: '邀请' },
  { value: 'consultation', label: '咨询' },
  { value: 'report', label: '汇报' },
];

const REGISTER_OPTIONS: Array<{ value: WritingRegister; label: string }> = [
  { value: 'polite', label: 'です・ます体' },
  { value: 'plain', label: '普通体' },
];

const SCENARIO_SUGGESTIONS = ['餐厅', '学校', '公司', '旅行', '医院', '购物'];

function countSentences(text: string) {
  return text
    .split(/[。！？!?]/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function countChars(text: string) {
  return text.replace(/\s+/g, '').length;
}

function getLevelLabel(level: WritingEvalResult['level']) {
  if (level === 'excellent') return '优秀';
  if (level === 'pass') return '通过';
  return '需加强';
}

export default function AiWritingPracticeScreen({ navigation }: Props) {
  const [level, setLevel] = useState<BankLevel>('N5');
  const [purpose, setPurpose] = useState<WritingPurpose>('request');
  const [register, setRegister] = useState<WritingRegister>('polite');
  const [scenario, setScenario] = useState('');
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [loadingSet, setLoadingSet] = useState(false);
  const [setError, setSetError] = useState('');
  const [items, setItems] = useState<AiWritingTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<WritingEvalResult | null>(null);
  const [goalAchievedCount, setGoalAchievedCount] = useState(0);
  const [scoreSum, setScoreSum] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const finished = items.length > 0 && currentIndex >= items.length;
  const currentTask = !finished ? items[currentIndex] : null;
  const progressText = useMemo(() => {
    if (!items.length) return '';
    if (finished) return `${items.length} / ${items.length}`;
    return `${currentIndex + 1} / ${items.length}`;
  }, [currentIndex, finished, items.length]);
  const avgScore = answeredCount > 0 ? Math.round(scoreSum / answeredCount) : 0;
  const goalRate = answeredCount > 0 ? Math.round((goalAchievedCount / answeredCount) * 100) : 0;

  const handleGenerate = async () => {
    if (loadingSet) return;
    setLoadingSet(true);
    setSettingsCollapsed(true);
    setSetError('');
    setSubmitError('');
    setResult(null);
    try {
      const tasks = await generateWritingTasksWithAi({
        level,
        count: WRITING_SESSION_SIZE,
        purpose,
        register,
        scenario: scenario.trim() || undefined,
      });
      if (!tasks.length) {
        throw new Error('AI 返回写作题为空，请重试');
      }
      if (tasks.length < WRITING_SESSION_SIZE) {
        throw new Error(`AI 仅返回 ${tasks.length} 题，未达到 ${WRITING_SESSION_SIZE} 题要求，请重试`);
      }
      setItems(tasks.slice(0, WRITING_SESSION_SIZE));
      setCurrentIndex(0);
      setAnswerText('');
      setGoalAchievedCount(0);
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
    if (!currentTask || submitting || result) return;
    const userAnswer = answerText.trim();
    if (!userAnswer) {
      setSubmitError('请先输入短文答案');
      return;
    }
    const sentenceCount = countSentences(userAnswer);
    const charCount = countChars(userAnswer);
    if (sentenceCount < currentTask.minSentences || sentenceCount > currentTask.maxSentences) {
      setSubmitError(`当前为 ${sentenceCount} 句，建议范围 ${currentTask.minSentences}-${currentTask.maxSentences} 句`);
      return;
    }
    if (charCount < currentTask.minChars || charCount > currentTask.maxChars) {
      setSubmitError(`当前约 ${charCount} 字，建议范围 ${currentTask.minChars}-${currentTask.maxChars} 字`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const evalResult = await evaluateWritingAnswerWithAi({
        task: currentTask,
        userAnswer,
      });
      setResult(evalResult);
      setAnsweredCount((value) => value + 1);
      setScoreSum((value) => value + evalResult.score);
      if (evalResult.goalAchieved) {
        setGoalAchievedCount((value) => value + 1);
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
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionTitle}>写作设置</Text>
          <Pressable onPress={() => setSettingsCollapsed((value) => !value)} style={styles.linkBtn}>
            <Text style={styles.linkText}>{settingsCollapsed ? '展开设置' : '收起设置'}</Text>
          </Pressable>
        </View>
        {settingsCollapsed ? (
          <Text style={styles.tip}>
            当前：{level} · {PURPOSE_OPTIONS.find((item) => item.value === purpose)?.label} ·{' '}
            {REGISTER_OPTIONS.find((item) => item.value === register)?.label}
          </Text>
        ) : (
          <Text style={styles.tip}>先设置等级、目的与文体，再生成本组写作任务。</Text>
        )}

        {!settingsCollapsed ? (
          <View style={styles.row}>
            {LEVELS.map((item) => (
              <Pressable key={item} onPress={() => setLevel(item)} style={[styles.chip, item === level ? styles.chipActive : null]}>
                <Text style={[styles.chipText, item === level ? styles.chipTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!settingsCollapsed ? (
          <View style={styles.row}>
            {PURPOSE_OPTIONS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setPurpose(item.value)}
                style={[styles.chip, item.value === purpose ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, item.value === purpose ? styles.chipTextActive : null]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!settingsCollapsed ? (
          <View style={styles.row}>
            {REGISTER_OPTIONS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setRegister(item.value)}
                style={[styles.chip, item.value === register ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, item.value === register ? styles.chipTextActive : null]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!settingsCollapsed ? (
          <View style={styles.scenarioWrap}>
            <Text style={styles.inputLabel}>场景偏好（可选）</Text>
            <TextInput
              value={scenario}
              onChangeText={setScenario}
              onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              placeholder="例如：向老师请假、餐厅投诉、同事协作"
              placeholderTextColor={colors.muted}
              style={styles.scenarioInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <View style={styles.row}>
              {SCENARIO_SUGGESTIONS.map((item) => (
                <Pressable key={item} onPress={() => setScenario(item)} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <PrimaryButton
          title={loadingSet ? '生成中...' : `生成 ${WRITING_SESSION_SIZE} 题写作任务`}
          onPress={handleGenerate}
          disabled={loadingSet}
          style={styles.actionBtn}
        />
      </View>

      {setError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>出题失败：{setError}</Text>
        </View>
      ) : null}

      {!items.length ? (
        <View style={styles.section}>
          <Text style={styles.tip}>生成后将开始本组写作训练。</Text>
        </View>
      ) : null}

      {currentTask ? (
        <View style={styles.section}>
          <Text style={styles.metaText}>
            {progressText} · {currentTask.level} · {currentTask.register === 'polite' ? 'です・ます体' : '普通体'}
          </Text>
          <Text style={styles.taskPrompt}>{currentTask.promptCn}</Text>
          <Text style={styles.taskMeta}>场景：{currentTask.scenario}</Text>
          <Text style={styles.taskMeta}>目的：{currentTask.purpose}</Text>
          <Text style={styles.taskMeta}>对象：{currentTask.audience}</Text>
          <Text style={styles.taskMeta}>
            建议：{currentTask.minSentences}-{currentTask.maxSentences} 句，{currentTask.minChars}-{currentTask.maxChars} 字
          </Text>
          <View style={styles.hintBox}>
            <Text style={styles.hintTitle}>必须覆盖点</Text>
            {currentTask.mustInclude.map((point) => (
              <Text key={point} style={styles.hintText}>
                • {point}
              </Text>
            ))}
          </View>

          <TextInput
            value={answerText}
            onChangeText={setAnswerText}
            onFocus={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            placeholder="输入你的日语短文"
            placeholderTextColor={colors.muted}
            multiline
            style={styles.input}
            editable={!submitting && !result}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Text style={styles.inputMeta}>
            当前约 {countSentences(answerText)} 句 / {countChars(answerText)} 字
          </Text>

          <PrimaryButton
            title={submitting ? 'AI 批改中...' : '提交批改'}
            onPress={handleSubmit}
            disabled={submitting || Boolean(result)}
            style={styles.actionBtn}
          />
          {submitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>AI 正在评估你的短文...</Text>
            </View>
          ) : null}
          {submitError ? <Text style={styles.errorText}>批改失败：{submitError}</Text> : null}

          {result ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultScore}>
                得分 {result.score} · 评级 {getLevelLabel(result.level)} · 目标{result.goalAchieved ? '已达成' : '未达成'}
              </Text>
              <Text style={styles.resultLine}>
                维度：任务 {result.dimensionScores.task}/35，语法 {result.dimensionScores.grammar}/25，词汇{' '}
                {result.dimensionScores.vocab}/20，连贯 {result.dimensionScores.coherence}/10，语域{' '}
                {result.dimensionScores.register}/10
              </Text>
              <Text style={styles.resultFeedback}>{result.feedbackCn}</Text>
              {result.mustIncludeCheck.length ? (
                <View style={styles.resultBlock}>
                  <Text style={styles.blockTitle}>覆盖检查</Text>
                  {result.mustIncludeCheck.map((item) => (
                    <Text key={`${item.point}-${item.commentCn}`} style={styles.resultLine}>
                      {item.covered ? '✓' : '✗'} {item.point}：{item.commentCn}
                    </Text>
                  ))}
                </View>
              ) : null}
              {result.errors.length ? (
                <View style={styles.resultBlock}>
                  <Text style={styles.blockTitle}>关键问题</Text>
                  {result.errors.map((item, index) => (
                    <Text key={`${item.fragment}-${item.type}-${index}`} style={styles.resultLine}>
                      {index + 1}. {item.type}｜{item.fragment} → {item.suggestion}（{item.reasonCn}）
                    </Text>
                  ))}
                </View>
              ) : null}
              <View style={styles.resultBlock}>
                <Text style={styles.blockTitle}>优化范文</Text>
                <Text style={styles.resultLine}>{result.betterAnswer}</Text>
              </View>
              <Text style={styles.resultLine}>下一步：{result.nextActionCn}</Text>

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
            共 {answeredCount} 题，目标达成 {goalAchievedCount}，达成率 {goalRate}%，平均分 {avgScore}
          </Text>
          <PrimaryButton title={loadingSet ? '生成中...' : '再来一组'} onPress={handleGenerate} disabled={loadingSet} style={styles.actionBtn} />
          <PrimaryButton title="返回 AI 学习中心" onPress={() => navigation.goBack()} style={styles.actionBtn} />
        </View>
      ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.m,
    paddingBottom: spacing.xl,
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
  scenarioWrap: {
    marginTop: spacing.s,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  scenarioInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    color: colors.text,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
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
    lineHeight: 22,
  },
  taskMeta: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  hintBox: {
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    borderRadius: radius.m,
    padding: spacing.s,
    marginBottom: spacing.s,
  },
  hintTitle: {
    color: '#075985',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 4,
  },
  hintText: {
    color: '#075985',
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    color: colors.text,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    textAlignVertical: 'top',
  },
  inputMeta: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
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
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: radius.m,
    padding: spacing.s,
  },
  resultScore: {
    color: '#1d4ed8',
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  resultFeedback: {
    color: colors.text,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  resultBlock: {
    marginTop: spacing.s,
  },
  blockTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 2,
  },
  resultLine: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 12,
    lineHeight: 20,
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
