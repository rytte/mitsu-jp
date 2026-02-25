import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import OptionButton from '../components/OptionButton';
import PrimaryButton from '../components/PrimaryButton';
import { generateListeningPassagesWithAi } from '../features/ai/service';
import { LISTENING_PASSAGE_SESSION_SIZE, SESSION_SIZE } from '../features/exam/examBank';
import { buildLocalListeningItems, normalizeListeningSpellingAnswer } from '../features/listening/bank';
import { MyStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { BankLevel, ListeningQuestionItem, ListeningQuestionType } from '../types';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type Props = NativeStackScreenProps<MyStackParamList, 'AiListeningPractice'>;

const LEVELS: BankLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const TYPE_OPTIONS: Array<{
  id: ListeningQuestionType;
  title: string;
  desc: string;
}> = [
  { id: 'word_meaning', title: '听单词选释义', desc: '从词库生成四选一听力题' },
  { id: 'sentence_spelling', title: '听句子拼写', desc: '从词汇与文法例句生成听写题' },
  { id: 'ai_passage', title: 'AI 生成小短文', desc: 'AI 按等级生成短文并出理解题' },
];

function getSessionSizeByType(type: ListeningQuestionType) {
  return type === 'ai_passage' ? LISTENING_PASSAGE_SESSION_SIZE : SESSION_SIZE;
}

function getTypeTitle(type: ListeningQuestionType) {
  if (type === 'word_meaning') return '听单词选释义';
  if (type === 'sentence_spelling') return '听句子拼写';
  return 'AI 生成小短文';
}

export default function AiListeningPracticeScreen({ navigation }: Props) {
  const topPadding = useScreenTopPadding({ mode: 'always-safe' });
  const settings = useAppStore((state) => state.settings);
  const [level, setLevel] = useState<BankLevel>('N5');
  const [selectedType, setSelectedType] = useState<ListeningQuestionType>('word_meaning');
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ListeningQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const currentItem = items[currentIndex];
  const sessionSize = getSessionSizeByType(selectedType);
  const progressText = useMemo(() => {
    if (!items.length) return '';
    return `${currentIndex + 1} / ${items.length}`;
  }, [currentIndex, items.length]);
  const accuracy = useMemo(() => {
    const total = correctCount + wrongCount;
    if (!total) return 0;
    return Math.round((correctCount / total) * 100);
  }, [correctCount, wrongCount]);

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      Speech.stop();
      Speech.speak(text, {
        language: 'ja-JP',
        rate: settings.tts_rate,
        voice: settings.tts_voice ?? undefined,
      });
    },
    [settings.tts_rate, settings.tts_voice]
  );

  useEffect(() => {
    navigation.setOptions({ title: 'AI 听力训练' });
  }, [navigation]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (!currentItem) return;
    speak(currentItem.audioText);
  }, [currentItem, speak]);

  const buildSessionItems = useCallback(async () => {
    if (selectedType === 'ai_passage') {
      const aiItems = await generateListeningPassagesWithAi(level, LISTENING_PASSAGE_SESSION_SIZE);
      return aiItems.map((item) => ({
        id: item.id,
        type: 'ai_passage',
        audioText: item.passage,
        title: item.title,
        passage: item.passage,
        prompt: item.question,
        options: item.options,
        answer: item.answer,
        explainCn: item.explainCn,
      } satisfies ListeningQuestionItem));
    }

    return buildLocalListeningItems({
      level,
      type: selectedType,
      count: SESSION_SIZE,
    });
  }, [level, selectedType]);

  const resetRound = useCallback(() => {
    setSelectedOption(null);
    setSpellingInput('');
    setShowResult(false);
    setIsCorrect(null);
  }, []);

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const nextItems = await buildSessionItems();
      if (!nextItems.length) {
        throw new Error('未生成到可用题目，请调整等级或稍后重试');
      }
      if (nextItems.length < sessionSize) {
        throw new Error(`题量不足：需要 ${sessionSize} 题，实际 ${nextItems.length} 题`);
      }
      setSettingsCollapsed(true);
      setItems(nextItems.slice(0, sessionSize));
      setCurrentIndex(0);
      setCorrectCount(0);
      setWrongCount(0);
      resetRound();
    } catch (error) {
      Alert.alert('生成失败', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [buildSessionItems, resetRound, sessionSize]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!currentItem || showResult) return;
      const correct =
        currentItem.type === 'sentence_spelling'
          ? normalizeListeningSpellingAnswer(answer) === normalizeListeningSpellingAnswer(currentItem.answer)
          : answer.trim() === currentItem.answer.trim();
      setSelectedOption(currentItem.type === 'sentence_spelling' ? null : answer);
      setIsCorrect(correct);
      setShowResult(true);
      if (correct) {
        setCorrectCount((value) => value + 1);
      } else {
        setWrongCount((value) => value + 1);
      }
    },
    [currentItem, showResult]
  );

  const handleSubmitSpelling = useCallback(() => {
    if (!currentItem || currentItem.type !== 'sentence_spelling') return;
    handleAnswer(spellingInput);
  }, [currentItem, handleAnswer, spellingInput]);

  const handleNext = useCallback(() => {
    if (!showResult) return;
    if (currentIndex + 1 >= items.length) return;
    setCurrentIndex((index) => index + 1);
    resetRound();
  }, [currentIndex, items.length, resetRound, showResult]);

  const finished = items.length > 0 && currentIndex + 1 >= items.length && showResult;
  const hasSession = items.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <View style={styles.section}>
        <View style={styles.sectionHeadRow}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="ear-outline" size={16} color={colors.text} />
            <Text style={styles.sectionTitle}>听力设置</Text>
          </View>
          <Pressable onPress={() => setSettingsCollapsed((value) => !value)} style={styles.linkBtn}>
            <Text style={styles.linkText}>{settingsCollapsed ? '展开设置' : '收起设置'}</Text>
          </Pressable>
        </View>

        {settingsCollapsed ? <Text style={styles.tip}>当前：{level} · {getTypeTitle(selectedType)}</Text> : null}

        {!settingsCollapsed ? (
          <>
            <Text style={styles.label}>等级</Text>
            <View style={styles.levelRow}>
              {LEVELS.map((item) => {
                const active = item === level;
                return (
                  <Pressable key={item} onPress={() => setLevel(item)} style={[styles.levelChip, active ? styles.levelChipActive : null]}>
                    <Text style={[styles.levelChipText, active ? styles.levelChipTextActive : null]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>题型（单选）</Text>
            <View style={styles.typeList}>
              {TYPE_OPTIONS.map((option) => {
                const active = selectedType === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setSelectedType(option.id)}
                    style={[styles.typeCard, active ? styles.typeCardActive : null]}
                  >
                    <View style={styles.typeHeadRow}>
                      <Text style={[styles.typeTitle, active ? styles.typeTitleActive : null]}>{option.title}</Text>
                      <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={16} color={active ? colors.primary : colors.muted} />
                    </View>
                    <Text style={styles.typeDesc}>{option.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <PrimaryButton title={loading ? '正在生成题目...' : '开始训练'} onPress={handleStart} disabled={loading} style={styles.startBtn} />
      </View>

      {hasSession ? (
        <View style={styles.section}>
          <View style={styles.progressRow}>
            <Text style={styles.sectionTitle}>{getTypeTitle(selectedType)}</Text>
            <Text style={styles.progressText}>{progressText}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.listenHead}>
              <Text style={styles.prompt}>{currentItem?.prompt ?? ''}</Text>
              <Pressable
                onPress={() => (currentItem ? speak(currentItem.audioText) : undefined)}
                style={({ pressed }) => [styles.speakButton, pressed ? styles.speakButtonPressed : null]}
              >
                <Ionicons name="volume-high" size={18} color="#fff" />
              </Pressable>
            </View>

            {currentItem?.type === 'sentence_spelling' ? (
              <>
                <TextInput
                  value={spellingInput}
                  onChangeText={setSpellingInput}
                  editable={!showResult}
                  placeholder="输入你听到的句子"
                  style={styles.input}
                />
                {!showResult ? <PrimaryButton title="提交答案" onPress={handleSubmitSpelling} style={styles.submitBtn} /> : null}
              </>
            ) : null}

            {currentItem?.type === 'word_meaning' || currentItem?.type === 'ai_passage'
              ? currentItem.options.map((option, index) => (
                  <OptionButton
                    key={`${currentItem.id}-${index}`}
                    title={option}
                    selected={selectedOption === option}
                    correct={showResult ? option === currentItem.answer : null}
                    onPress={() => handleAnswer(option)}
                  />
                ))
              : null}
          </View>

          {showResult ? (
            <View style={styles.resultBox}>
              <Text style={[styles.resultText, isCorrect ? styles.correct : styles.wrong]}>
                {isCorrect ? '回答正确' : `回答错误，正确答案：${currentItem?.answer ?? ''}`}
              </Text>
              {currentItem?.type === 'word_meaning' ? <Text style={styles.metaText}>对应词条：{currentItem.displayJa}</Text> : null}
              {currentItem?.type === 'ai_passage' ? (
                <View style={styles.passageBlock}>
                  <Text style={styles.passageTitle}>{currentItem.title}</Text>
                  <Text style={styles.passageText}>{currentItem.passage}</Text>
                  {currentItem.explainCn ? <Text style={styles.metaText}>解析：{currentItem.explainCn}</Text> : null}
                </View>
              ) : null}
              {!finished ? <PrimaryButton title="下一题" onPress={handleNext} style={styles.nextBtn} /> : null}
            </View>
          ) : null}

          {finished ? (
            <View style={styles.resultBox}>
              <Text style={styles.finishTitle}>本轮完成</Text>
              <Text style={styles.metaText}>
                正确 {correctCount}，错误 {wrongCount}，正确率 {accuracy}%
              </Text>
              <PrimaryButton title={loading ? '正在生成题目...' : '再来一组'} onPress={handleStart} disabled={loading} style={styles.nextBtn} />
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.m,
    paddingBottom: spacing.l,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  linkBtn: {
    paddingVertical: 4,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  tip: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  label: {
    marginTop: spacing.m,
    marginBottom: spacing.xs,
    color: colors.text,
    fontWeight: '700',
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  levelChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  levelChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  levelChipText: {
    color: colors.muted,
    fontWeight: '600',
  },
  levelChipTextActive: {
    color: colors.primary,
  },
  typeList: {
    gap: spacing.s,
  },
  typeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.s,
    backgroundColor: '#fff',
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  typeHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  typeTitleActive: {
    color: colors.primary,
  },
  typeDesc: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },
  startBtn: {
    marginTop: spacing.m,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressText: {
    color: colors.muted,
    fontWeight: '600',
  },
  card: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.s,
    backgroundColor: '#fff',
  },
  listenHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
    gap: spacing.s,
  },
  prompt: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  speakButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakButtonPressed: {
    opacity: 0.85,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    color: colors.text,
    marginBottom: spacing.s,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  resultBox: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.s,
    backgroundColor: '#f8fafc',
  },
  resultText: {
    fontWeight: '700',
    fontSize: 15,
  },
  correct: {
    color: colors.success,
  },
  wrong: {
    color: colors.danger,
  },
  metaText: {
    marginTop: spacing.xs,
    color: colors.text,
    lineHeight: 20,
  },
  passageBlock: {
    marginTop: spacing.s,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  passageTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  passageText: {
    color: colors.text,
    lineHeight: 22,
  },
  nextBtn: {
    marginTop: spacing.s,
  },
  finishTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
});
