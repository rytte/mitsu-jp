import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import OptionButton from '../components/OptionButton';
import PrimaryButton from '../components/PrimaryButton';
import {
  getStage,
  getWordsByIds,
  recordMistake,
} from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { QuizItem, Word } from '../types';
import { getMeaning, getMeaningLabel } from '../utils/meaning';
import { generateQuizItems } from '../utils/quiz';

type Props = NativeStackScreenProps<LearnStackParamList, 'Quiz'>;

function stripBoldTags(text: string) {
  if (!text) return '';
  return text.replace(/<\/?b>/gi, '');
}

export default function QuizScreen({ navigation, route }: Props) {
  const { stageId, level, stageIndex, zoneIndex } = route.params;
  const settings = useAppStore((state) => state.settings);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [wordMap, setWordMap] = useState<Record<string, Word>>({});

  const currentItem = items[currentIndex];
  const meaningLabel = getMeaningLabel(settings.meaning_language);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const stage = await getStage(stageId);
      if (!stage) return;
      const stageWords = await getWordsByIds(stage.word_ids);
      const list = generateQuizItems({
        stageWords,
        mix: settings.quiz_mix,
        mcqModes: settings.mcq_modes,
        meaningLanguage: settings.meaning_language,
      });
      if (!active) return;
      setItems(list);
      const nextMap: Record<string, Word> = {};
      for (const word of stageWords) {
        nextMap[word.id] = word;
      }
      setWordMap(nextMap);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [
    level,
    settings.meaning_language,
    settings.mcq_modes.ja_to_meaning,
    settings.mcq_modes.meaning_to_ja,
    settings.quiz_mix,
    stageId,
  ]);

  const progressText = useMemo(() => {
    if (!items.length) return '';
    return `${currentIndex + 1} / ${items.length}`;
  }, [currentIndex, items.length]);

  const progressPercent = useMemo(() => {
    if (!items.length) return 0;
    return Math.round(((currentIndex + 1) / items.length) * 100);
  }, [currentIndex, items.length]);

  const isOptionQuiz =
    currentItem?.type === 'mcq_ja_to_cn' ||
    currentItem?.type === 'mcq_cn_to_ja' ||
    currentItem?.type === 'listening';
  const answerWord = currentItem ? wordMap[currentItem.wordId] : undefined;

  const speak = (text: string) => {
    Speech.speak(text, {
      language: 'ja-JP',
      rate: settings.tts_rate,
    });
  };

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
      await recordMistake(currentItem.wordId);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= items.length) {
      navigation.replace('Result', {
        stageId,
        level,
        stageIndex,
        zoneIndex,
        correct: correctCount,
        wrong: wrongCount,
      });
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelected(null);
    setInputValue('');
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>第 {stageIndex} 关</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{progressText}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.card}>
          {(currentItem.type === 'mcq_ja_to_cn' || currentItem.type === 'mcq_cn_to_ja') && (
            <>
              <Text style={styles.prompt}>{currentItem.prompt}</Text>
              <Text style={styles.subPrompt}>
                {currentItem.type === 'mcq_ja_to_cn' ? `请选择正确的${meaningLabel}释义` : '请选择正确的日语单词'}
              </Text>
            </>
          )}

          {currentItem.type === 'listening' && (
            <>
              <Text style={styles.prompt}>听力选择</Text>
              <Text style={styles.subPrompt}>点击播放发音后在下方选择正确答案</Text>
              <PrimaryButton
                title="播放发音"
                onPress={() => speak(currentItem.audioText)}
                style={styles.speakButton}
              />
            </>
          )}

          {currentItem.type === 'spelling' && (
            <>
              <Text style={styles.prompt}>{currentItem.prompt}</Text>
              <Text style={styles.subPrompt}>请输入假名拼写</Text>
              <TextInput
                style={styles.input}
                placeholder=""
                value={inputValue}
                onChangeText={setInputValue}
                editable={!showResult}
              />
            </>
          )}

          {showResult && (
            <View style={styles.resultInline}>
              <Text style={[styles.resultText, isCorrect ? styles.correct : styles.wrong]}>
                {isCorrect ? '回答正确！' : `回答错误，正确答案：${currentItem.answer}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        {isOptionQuiz && !showResult && (
          <View style={styles.optionList}>
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
        )}

        {currentItem.type === 'spelling' && !showResult && (
          <PrimaryButton
            title="提交"
            onPress={() => handleAnswer(inputValue)}
            style={[styles.actionButton, styles.buttonSpacing]}
          />
        )}

        {showResult && isOptionQuiz && answerWord ? (
          <View style={styles.answerCard}>
            <Text style={styles.answerLabel}>正确答案</Text>
            <View style={styles.answerHeader}>
              <View style={styles.answerHeadText}>
                <Text style={styles.answerWord}>{answerWord.kanji ?? answerWord.kana}</Text>
                {answerWord.kanji ? <Text style={styles.answerReading}>{answerWord.kana}</Text> : null}
              </View>
              {(() => {
                const metaItems: string[] = [];
                const posText = (answerWord.pos ?? '').trim();
                const pitchText = (answerWord.pitch ?? '').trim();
                if (posText) metaItems.push(posText);
                if (pitchText) metaItems.push(pitchText);
                if (!metaItems.length) return null;
                return (
                  <View style={styles.answerMetaRow}>
                    {metaItems.map((item, index) => (
                      <View key={`${item}-${index}`} style={[styles.answerMetaChip, index > 0 ? styles.answerMetaGap : null]}>
                        <Text style={styles.answerMetaText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>
            <Text style={styles.answerMeaning}>{getMeaning(answerWord, settings.meaning_language)}</Text>
            {(() => {
              const example = answerWord.examples?.[0];
              const exampleJa = stripBoldTags((example?.ja_furigana ?? example?.ja ?? '').trim());
              const exampleCn = (example?.zh_cn ?? '').trim();
              if (!exampleJa && !exampleCn) return null;
              return (
                <View style={styles.answerExample}>
                  {exampleJa ? <Text style={styles.answerExampleJa}>{exampleJa}</Text> : null}
                  {exampleCn ? <Text style={styles.answerExampleCn}>{exampleCn}</Text> : null}
                </View>
              );
            })()}
          </View>
        ) : null}

        {showResult && isOptionQuiz && !answerWord ? (
          <View style={styles.answerFallback}>
            <Text style={styles.answerLabel}>正确答案</Text>
            <Text style={styles.answerText}>{currentItem.answer}</Text>
          </View>
        ) : null}

        {showResult && (
          <PrimaryButton
            title={currentIndex + 1 >= items.length ? '查看结果' : '下一题'}
            onPress={handleNext}
            style={styles.actionButton}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.m,
    color: colors.muted,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
  },
  content: {
    flex: 1,
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
  headerBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  headerBadgeText: {
    color: '#0369a1',
    fontWeight: '700',
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.m,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prompt: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  subPrompt: {
    color: colors.muted,
    marginBottom: spacing.m,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.m,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  speakButton: {
    width: '100%',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  resultInline: {
    marginTop: spacing.m,
    padding: spacing.s,
    borderRadius: radius.m,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '600',
  },
  correct: {
    color: colors.success,
  },
  wrong: {
    color: colors.danger,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.m,
    paddingBottom: spacing.m,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  optionList: {
    marginBottom: spacing.s,
  },
  answerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.s,
  },
  answerFallback: {
    backgroundColor: colors.card,
    borderRadius: radius.m,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.s,
  },
  answerLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  answerHeadText: {
    flex: 1,
    paddingRight: spacing.s,
  },
  answerWord: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  answerReading: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  answerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '45%',
  },
  answerMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  answerMetaGap: {
    marginLeft: spacing.xs,
  },
  answerMetaText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  answerMeaning: {
    color: colors.text,
    marginBottom: spacing.s,
  },
  answerExample: {
    padding: spacing.s,
    borderRadius: radius.m,
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  answerExampleJa: {
    color: '#475569',
  },
  answerExampleCn: {
    marginTop: spacing.s,
    color: '#64748b',
  },
  answerText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  actionButton: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonSpacing: {
    marginBottom: spacing.s,
  },
});
