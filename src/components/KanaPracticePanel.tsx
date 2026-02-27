import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import * as Speech from 'expo-speech';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { pickOne, sample, shuffle } from '../utils/random';
import OptionButton from './OptionButton';
import PrimaryButton from './PrimaryButton';

type KanaCell = { kana: string; romaji: string };
type KanaTableRows = Array<Array<KanaCell | null>>;

type PracticeMode = 'char_to_sound' | 'sound_to_char' | 'spelling' | 'confusion';

type PracticeQuestion = {
  id: string;
  mode: PracticeMode;
  prompt: string;
  answer: string;
  options: string[];
  audioKana?: string;
  note?: string;
};

type Props = {
  sources: KanaTableRows[];
};

const MODE_ITEMS: Array<{ id: PracticeMode; label: string }> = [
  { id: 'char_to_sound', label: '看字选音' },
  { id: 'sound_to_char', label: '听音选字' },
  { id: 'spelling', label: '拼写输入' },
  { id: 'confusion', label: '易混淆专项' },
];

const CONFUSION_GROUPS: string[][] = [
  ['さ', 'ち'],
  ['ぬ', 'め'],
  ['れ', 'ね'],
  ['シ', 'ツ', 'ソ', 'ン'],
  ['ン', 'ソ'],
  ['ク', 'ケ'],
  ['ヌ', 'メ'],
  ['る', 'ろ'],
  ['わ', 'れ'],
  ['は', 'ほ'],
];

function flattenKanaSources(sources: KanaTableRows[]) {
  const result: KanaCell[] = [];
  for (const rows of sources) {
    for (const row of rows) {
      for (const cell of row) {
        if (cell) result.push(cell);
      }
    }
  }
  return result;
}

function dedupeByKana(items: KanaCell[]) {
  const map = new Map<string, KanaCell>();
  for (const item of items) {
    map.set(item.kana, item);
  }
  return Array.from(map.values());
}

export default function KanaPracticePanel({ sources }: Props) {
  const settings = useAppStore((state) => state.settings);
  const [mode, setMode] = useState<PracticeMode>('char_to_sound');
  const [question, setQuestion] = useState<PracticeQuestion | null>(null);
  const [selected, setSelected] = useState('');
  const [typingValue, setTypingValue] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ total: 0, correct: 0, wrong: 0 });

  const kanaPool = useMemo(() => dedupeByKana(flattenKanaSources(sources)), [sources]);
  const romajiPool = useMemo(() => Array.from(new Set(kanaPool.map((item) => item.romaji))), [kanaPool]);
  const romajiCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of kanaPool) {
      map.set(item.romaji, (map.get(item.romaji) ?? 0) + 1);
    }
    return map;
  }, [kanaPool]);
  const uniqueRomajiKanaPool = useMemo(
    () => kanaPool.filter((item) => (romajiCountMap.get(item.romaji) ?? 0) === 1),
    [kanaPool, romajiCountMap]
  );
  const kanaMap = useMemo(() => new Map(kanaPool.map((item) => [item.kana, item])), [kanaPool]);
  const confusionPools = useMemo(
    () =>
      CONFUSION_GROUPS.map((group) => group.map((kana) => kanaMap.get(kana)).filter(Boolean) as KanaCell[]).filter(
        (group) => group.length >= 2
      ),
    [kanaMap]
  );

  const accuracy = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);

  const speakKana = (text: string) => {
    const value = text.trim();
    if (!value) return;
    Speech.stop();
    Speech.speak(value, {
      language: 'ja-JP',
      rate: settings.tts_rate,
      voice: settings.tts_voice ?? undefined,
    });
  };

  const buildQuestion = (nextMode: PracticeMode): PracticeQuestion | null => {
    if (!kanaPool.length) return null;

    if (nextMode === 'char_to_sound') {
      const target = pickOne(kanaPool);
      const distractors = sample(romajiPool.filter((item) => item !== target.romaji), 3);
      return {
        id: `${Date.now()}-char`,
        mode: nextMode,
        prompt: `「${target.kana}」的读音是？`,
        answer: target.romaji,
        options: shuffle([target.romaji, ...distractors]),
      };
    }

    if (nextMode === 'sound_to_char') {
      const source = uniqueRomajiKanaPool.length >= 4 ? uniqueRomajiKanaPool : kanaPool;
      const target = pickOne(source);
      const distractors = sample(
        source.filter((item) => item.kana !== target.kana),
        3
      ).map((item) => item.kana);
      return {
        id: `${Date.now()}-sound`,
        mode: nextMode,
        prompt: '听音后选择正确假名',
        answer: target.kana,
        options: shuffle([target.kana, ...distractors]),
        audioKana: target.kana,
      };
    }

    if (nextMode === 'spelling') {
      const source = uniqueRomajiKanaPool.length > 0 ? uniqueRomajiKanaPool : kanaPool;
      const target = pickOne(source);
      return {
        id: `${Date.now()}-spell`,
        mode: nextMode,
        prompt: `请输入「${target.kana}」的罗马音`,
        answer: target.romaji,
        options: [],
      };
    }

    if (!confusionPools.length) {
      return buildQuestion('char_to_sound');
    }
    const group = pickOne(confusionPools);
    const target = pickOne(group);
    return {
      id: `${Date.now()}-confusion`,
      mode: nextMode,
      prompt: `易混淆专项：请选择与「${target.romaji}」对应的假名`,
      answer: target.kana,
      options: shuffle(group.map((item) => item.kana)),
      note: `混淆组：${group.map((item) => item.kana).join(' / ')}`,
    };
  };

  const resetRound = (nextQuestion: PracticeQuestion | null) => {
    setQuestion(nextQuestion);
    setSelected('');
    setTypingValue('');
    setShowResult(false);
    setIsCorrect(null);
  };

  const loadNextQuestion = (targetMode: PracticeMode = mode) => {
    resetRound(buildQuestion(targetMode));
  };

  useEffect(() => {
    loadNextQuestion(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, kanaPool.length, uniqueRomajiKanaPool.length, confusionPools.length, romajiPool.length]);

  useEffect(() => {
    if (question?.mode === 'sound_to_char' && question.audioKana) {
      speakKana(question.audioKana);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  useEffect(() => () => {
    Speech.stop();
  }, []);

  const commitResult = (answerValue: string, correct: boolean) => {
    setSelected(answerValue);
    setShowResult(true);
    setIsCorrect(correct);
    setStats((prev) => ({
      total: prev.total + 1,
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
    }));
  };

  const handleOptionSelect = (value: string) => {
    if (!question || showResult) return;
    commitResult(value, value.trim() === question.answer.trim());
  };

  const handleSpellingSubmit = () => {
    if (!question || showResult) return;
    const value = typingValue.trim().toLowerCase();
    if (!value) return;
    commitResult(value, value === question.answer.trim().toLowerCase());
  };

  if (!question) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>暂无可用的训练题目</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.modeRow}>
        {MODE_ITEMS.map((item) => {
          const active = item.id === mode;
          return (
            <Pressable
              key={item.id}
              onPress={() => setMode(item.id)}
              style={[styles.modeChip, active ? styles.modeChipActive : null]}
            >
              <Text style={[styles.modeChipText, active ? styles.modeChipTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statsWrap}>
        <Text style={styles.statsText}>
          已练 {stats.total} 题 · 正确 {stats.correct} · 错误 {stats.wrong} · 正确率 {accuracy}%
        </Text>
      </View>

      {question.mode === 'sound_to_char' ? (
        <View style={styles.promptActionRow}>
          <Text style={[styles.promptText, styles.promptTextWithAction]}>{question.prompt}</Text>
          <Pressable
            onPress={() => speakKana(question.audioKana ?? '')}
            accessibilityRole="button"
            accessibilityLabel="播放发音"
            style={({ pressed }) => [styles.speakIconButton, pressed ? styles.speakIconButtonPressed : null]}
          >
            <Ionicons name="volume-high" size={20} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Text style={styles.promptText}>{question.prompt}</Text>
      )}
      {question.note ? <Text style={styles.noteText}>{question.note}</Text> : null}

      {question.mode === 'spelling' ? (
        <View style={styles.spellingWrap}>
          <TextInput
            value={typingValue}
            onChangeText={setTypingValue}
            placeholder="输入罗马音，例如 shi"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!showResult}
            style={styles.input}
          />
          {!showResult ? (
            <PrimaryButton title="提交答案" onPress={handleSpellingSubmit} disabled={!typingValue.trim()} />
          ) : null}
        </View>
      ) : (
        <View style={styles.optionsWrap}>
          {question.options.map((item) => (
            <OptionButton
              key={item}
              title={item}
              selected={selected === item}
              correct={showResult ? item === question.answer : null}
              onPress={() => handleOptionSelect(item)}
            />
          ))}
        </View>
      )}

      {showResult ? (
        <View style={styles.resultWrap}>
          <Text style={[styles.resultText, isCorrect ? styles.correct : styles.wrong]}>
            {isCorrect ? '回答正确' : `回答错误，正确答案：${question.answer}`}
          </Text>
          <PrimaryButton title="下一题" onPress={() => loadNextQuestion()} style={styles.nextButton} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.s,
    gap: spacing.xs,
  },
  modeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  modeChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: colors.primary,
  },
  statsWrap: {
    marginBottom: spacing.s,
  },
  statsText: {
    color: colors.muted,
    fontSize: 12,
  },
  promptText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  promptActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  promptTextWithAction: {
    marginBottom: 0,
    marginRight: spacing.s,
    flex: 1,
    flexShrink: 1,
  },
  noteText: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.s,
  },
  speakIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#1e40af',
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  speakIconButtonPressed: {
    backgroundColor: '#1d4ed8',
  },
  optionsWrap: {
    marginTop: spacing.xs,
  },
  spellingWrap: {
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    color: colors.text,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    marginBottom: spacing.s,
  },
  resultWrap: {
    marginTop: spacing.s,
  },
  resultText: {
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  correct: {
    color: colors.success,
  },
  wrong: {
    color: colors.danger,
  },
  nextButton: {
    marginTop: spacing.xs,
  },
  emptyText: {
    color: colors.muted,
  },
});
