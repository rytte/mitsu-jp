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
import { QuizItem } from '../types';
import { getMeaningLabel } from '../utils/meaning';
import { generateQuizItems } from '../utils/quiz';

type Props = NativeStackScreenProps<LearnStackParamList, 'Quiz'>;

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>第 {stageIndex} 关</Text>
        <Text style={styles.headerSubtitle}>{progressText}</Text>
      </View>

      <View style={styles.card}>
        {currentItem.type === 'mcq_ja_to_cn' && (
          <>
            <Text style={styles.prompt}>{currentItem.prompt}</Text>
            <Text style={styles.subPrompt}>请选择正确的{meaningLabel}释义</Text>
            {currentItem.options.map((option) => (
              <OptionButton
                key={option}
                title={option}
                selected={selected === option}
                correct={showResult ? option === currentItem.answer : null}
                onPress={() => handleAnswer(option)}
              />
            ))}
          </>
        )}

        {currentItem.type === 'mcq_cn_to_ja' && (
          <>
            <Text style={styles.prompt}>{currentItem.prompt}</Text>
            <Text style={styles.subPrompt}>请选择正确的日语单词</Text>
            {currentItem.options.map((option) => (
              <OptionButton
                key={option}
                title={option}
                selected={selected === option}
                correct={showResult ? option === currentItem.answer : null}
                onPress={() => handleAnswer(option)}
              />
            ))}
          </>
        )}

        {currentItem.type === 'listening' && (
          <>
            <Text style={styles.prompt}>听力选择</Text>
            <Text style={styles.subPrompt}>点击播放后选择正确答案</Text>
            <PrimaryButton title="播放发音" onPress={() => speak(currentItem.audioText)} style={styles.speakBtn} />
            {currentItem.options.map((option) => (
              <OptionButton
                key={option}
                title={option}
                selected={selected === option}
                correct={showResult ? option === currentItem.answer : null}
                onPress={() => handleAnswer(option)}
              />
            ))}
          </>
        )}

        {currentItem.type === 'spelling' && (
          <>
            <Text style={styles.prompt}>{currentItem.prompt}</Text>
            <Text style={styles.subPrompt}>请输入假名拼写</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：さくら"
              value={inputValue}
              onChangeText={setInputValue}
              editable={!showResult}
            />
            <PrimaryButton title="提交" onPress={() => handleAnswer(inputValue)} disabled={showResult} />
          </>
        )}
      </View>

      {showResult && (
        <View style={styles.resultBox}>
          <Text style={[styles.resultText, isCorrect ? styles.correct : styles.wrong]}>
            {isCorrect ? '回答正确！' : `回答错误，正确答案：${currentItem.answer}`}
          </Text>
          <PrimaryButton title={currentIndex + 1 >= items.length ? '查看结果' : '下一题'} onPress={handleNext} />
        </View>
      )}
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
  },
  speakBtn: {
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
});
