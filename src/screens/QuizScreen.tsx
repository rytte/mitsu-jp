import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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

type RomajiMap = Record<string, string>;

const ROMAJI_MAP: RomajiMap = {
  a: 'あ',
  i: 'い',
  u: 'う',
  e: 'え',
  o: 'お',
  ka: 'か',
  ki: 'き',
  ku: 'く',
  ke: 'け',
  ko: 'こ',
  sa: 'さ',
  shi: 'し',
  si: 'し',
  su: 'す',
  se: 'せ',
  so: 'そ',
  ta: 'た',
  chi: 'ち',
  ti: 'ち',
  tsu: 'つ',
  tu: 'つ',
  te: 'て',
  to: 'と',
  na: 'な',
  ni: 'に',
  nu: 'ぬ',
  ne: 'ね',
  no: 'の',
  ha: 'は',
  hi: 'ひ',
  fu: 'ふ',
  hu: 'ふ',
  he: 'へ',
  ho: 'ほ',
  ma: 'ま',
  mi: 'み',
  mu: 'む',
  me: 'め',
  mo: 'も',
  ya: 'や',
  yu: 'ゆ',
  yo: 'よ',
  ra: 'ら',
  ri: 'り',
  ru: 'る',
  re: 'れ',
  ro: 'ろ',
  wa: 'わ',
  wo: 'を',
  ga: 'が',
  gi: 'ぎ',
  gu: 'ぐ',
  ge: 'げ',
  go: 'ご',
  za: 'ざ',
  ji: 'じ',
  zi: 'じ',
  zu: 'ず',
  ze: 'ぜ',
  zo: 'ぞ',
  da: 'だ',
  di: 'ぢ',
  du: 'づ',
  de: 'で',
  do: 'ど',
  ba: 'ば',
  bi: 'び',
  bu: 'ぶ',
  be: 'べ',
  bo: 'ぼ',
  pa: 'ぱ',
  pi: 'ぴ',
  pu: 'ぷ',
  pe: 'ぺ',
  po: 'ぽ',
  kya: 'きゃ',
  kyu: 'きゅ',
  kyo: 'きょ',
  sha: 'しゃ',
  sya: 'しゃ',
  shu: 'しゅ',
  syu: 'しゅ',
  sho: 'しょ',
  syo: 'しょ',
  cha: 'ちゃ',
  cya: 'ちゃ',
  tya: 'ちゃ',
  chu: 'ちゅ',
  cyu: 'ちゅ',
  tyu: 'ちゅ',
  cho: 'ちょ',
  cyo: 'ちょ',
  tyo: 'ちょ',
  nya: 'にゃ',
  nyu: 'にゅ',
  nyo: 'にょ',
  hya: 'ひゃ',
  hyu: 'ひゅ',
  hyo: 'ひょ',
  mya: 'みゃ',
  myu: 'みゅ',
  myo: 'みょ',
  rya: 'りゃ',
  ryu: 'りゅ',
  ryo: 'りょ',
  gya: 'ぎゃ',
  gyu: 'ぎゅ',
  gyo: 'ぎょ',
  ja: 'じゃ',
  ju: 'じゅ',
  jo: 'じょ',
  bya: 'びゃ',
  byu: 'びゅ',
  byo: 'びょ',
  pya: 'ぴゃ',
  pyu: 'ぴゅ',
  pyo: 'ぴょ',
  fa: 'ふぁ',
  fi: 'ふぃ',
  fe: 'ふぇ',
  fo: 'ふぉ',
  fyu: 'ふゅ',
  va: 'ゔぁ',
  vi: 'ゔぃ',
  vu: 'ゔ',
  ve: 'ゔぇ',
  vo: 'ゔぉ',
  la: 'ぁ',
  li: 'ぃ',
  lu: 'ぅ',
  le: 'ぇ',
  lo: 'ぉ',
  xa: 'ぁ',
  xi: 'ぃ',
  xu: 'ぅ',
  xe: 'ぇ',
  xo: 'ぉ',
  lya: 'ゃ',
  lyu: 'ゅ',
  lyo: 'ょ',
  xya: 'ゃ',
  xyu: 'ゅ',
  xyo: 'ょ',
  ltu: 'っ',
  xtu: 'っ',
  ltsu: 'っ',
  xtsu: 'っ',
};

const ROMAJI_PREFIXES = new Set<string>(
  Object.keys(ROMAJI_MAP).flatMap((key) => Array.from({ length: key.length - 1 }, (_, i) => key.slice(0, i + 1)))
);

const VOWELS = new Set(['a', 'i', 'u', 'e', 'o']);
const MAX_ROMAJI = 4;

const ROMAJI_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ''],
  ['—', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫'],
];

function stripBoldTags(text: string) {
  if (!text) return '';
  return text.replace(/<\/?b>/gi, '');
}

function stripFuriganaBrackets(text: string) {
  if (!text) return '';
  return text.replace(/\[[^\]]*]/g, '');
}

function isConsonant(letter: string) {
  return letter >= 'a' && letter <= 'z' && !VOWELS.has(letter);
}

function isKanaChar(char: string) {
  return /[\u3040-\u30ff]/.test(char);
}

function splitTrailingRomajiPrefix(value: string) {
  if (!value) return { base: value, buffer: '' };
  const lower = value.toLowerCase();
  const maxLen = Math.min(MAX_ROMAJI - 1, lower.length);
  for (let len = maxLen; len >= 1; len -= 1) {
    const suffix = lower.slice(-len);
    if (!/^[a-z]+$/.test(suffix)) continue;
    if (ROMAJI_PREFIXES.has(suffix)) {
      return { base: value.slice(0, value.length - len), buffer: suffix };
    }
  }
  return { base: value, buffer: '' };
}

function consumeRomaji(buffer: string) {
  let rest = buffer;
  let output = '';

  while (rest.length > 0) {
    if (rest.length >= 2 && rest[0] === rest[1] && isConsonant(rest[0]) && rest[0] !== 'n') {
      output += 'っ';
      rest = rest.slice(1);
      continue;
    }

    if (rest.startsWith('nn')) {
      output += 'ん';
      rest = rest.slice(2);
      continue;
    }

    let matched = false;
    for (let len = Math.min(MAX_ROMAJI, rest.length); len >= 1; len -= 1) {
      const chunk = rest.slice(0, len);
      const kana = ROMAJI_MAP[chunk];
      if (kana) {
        output += kana;
        rest = rest.slice(len);
        matched = true;
        break;
      }
    }

    if (matched) continue;
    if (ROMAJI_PREFIXES.has(rest)) break;

    output += rest[0];
    rest = rest.slice(1);
  }

  return { output, buffer: rest };
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
  const [romajiBuffer, setRomajiBuffer] = useState('');

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

  const displayInputValue = useMemo(() => `${inputValue}${romajiBuffer}`, [inputValue, romajiBuffer]);

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

  const commitRomajiBuffer = () => {
    if (!romajiBuffer) return '';
    let extra = '';
    const consumed = consumeRomaji(romajiBuffer);
    extra += consumed.output;
    const remaining = consumed.buffer;
    if (extra) {
      setInputValue((prev) => prev + extra);
    }
    setRomajiBuffer(remaining);
    return extra;
  };

  const appendRomaji = (letter: string) => {
    if (showResult) return;
    setRomajiBuffer((prevBuffer) => {
      const combined = prevBuffer + letter;
      const consumed = consumeRomaji(combined);
      if (consumed.output) {
        setInputValue((prev) => prev + consumed.output);
      }
      return consumed.buffer;
    });
  };

  const handleLongVowel = () => {
    if (showResult) return;
    commitRomajiBuffer();
    setInputValue((prev) => prev + 'ー');
  };

  const handleBackspace = () => {
    if (showResult) return;
    if (romajiBuffer.length > 0) {
      setRomajiBuffer(romajiBuffer.slice(0, -1));
      return;
    }
    if (!inputValue) return;
    const removed = inputValue.slice(-1);
    let nextInput = inputValue.slice(0, -1);
    let nextBuffer = '';
    if (isKanaChar(removed)) {
      const split = splitTrailingRomajiPrefix(nextInput);
      nextInput = split.base;
      nextBuffer = split.buffer;
    }
    setInputValue(nextInput);
    if (nextBuffer) setRomajiBuffer(nextBuffer);
  };

  const handleClearSpelling = () => {
    if (showResult) return;
    setInputValue('');
    setRomajiBuffer('');
  };

  const handleSubmitSpelling = () => {
    const consumed = consumeRomaji(romajiBuffer);
    const finalValue = `${inputValue}${consumed.output}${consumed.buffer}`;
    if (consumed.output || consumed.buffer) {
      setInputValue(finalValue);
    }
    setRomajiBuffer('');
    handleAnswer(finalValue);
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
    setRomajiBuffer('');
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
              <Text style={styles.subPrompt}>请输入假名拼写（罗马音输入）</Text>
              <TextInput
                style={styles.input}
                placeholder="点击下方键盘输入罗马音"
                value={displayInputValue}
                editable={false}
                showSoftInputOnFocus={false}
                caretHidden
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
            {currentItem.options.map((option, index) => (
              <OptionButton
                key={`${option}-${index}`}
                title={option}
                selected={selected === option}
                correct={showResult ? option === currentItem.answer : null}
                onPress={() => handleAnswer(option)}
              />
            ))}
          </View>
        )}

        {currentItem.type === 'spelling' && !showResult && (
          <>
            <View style={styles.keyboardTopRow}>
              <Pressable
                onPress={displayInputValue ? handleSubmitSpelling : undefined}
                disabled={!displayInputValue}
                style={({ pressed }) => [
                  styles.keyboardTopPreview,
                  pressed ? styles.keyboardTopPreviewPressed : null,
                  !displayInputValue ? styles.keyboardTopPreviewDisabled : null,
                ]}
              >
                <Text style={styles.keyboardTopPreviewText} numberOfLines={1}>
                  {displayInputValue}
                </Text>
              </Pressable>
              <View style={styles.keyboardTopSpacer} />
              <Pressable
                onPress={handleSubmitSpelling}
                style={({ pressed }) => [styles.submitKey, pressed ? styles.submitKeyPressed : null]}
              >
                <Text style={styles.submitKeyText}>提交</Text>
              </Pressable>
            </View>

            <View style={styles.romajiGrid}>
              {ROMAJI_ROWS.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.romajiRow}>
                  {row.map((letter, index) => {
                    const isLast = index === row.length - 1;
                    if (!letter) {
                      return (
                        <View
                          key={`spacer-${rowIndex}-${index}`}
                          style={[styles.romajiKeySpacer, !isLast ? styles.romajiKeyGap : null]}
                        />
                      );
                    }

                    const isLongVowel = letter === '—';
                    const isBackspace = letter === '⌫';
                    const isFunctionKey = isLongVowel || isBackspace;

                    const handlePress = () => {
                      if (isLongVowel) {
                        handleLongVowel();
                        return;
                      }
                      if (isBackspace) {
                        handleBackspace();
                        return;
                      }
                      appendRomaji(letter);
                    };

                    return (
                      <Pressable
                        key={`${letter}-${rowIndex}-${index}`}
                        onPress={handlePress}
                        onLongPress={isBackspace ? handleClearSpelling : undefined}
                        delayLongPress={isBackspace ? 400 : undefined}
                        style={({ pressed }) => [
                          styles.romajiKey,
                          isFunctionKey ? styles.romajiKeyFunction : styles.romajiKeyLetter,
                          isBackspace ? styles.romajiKeyWide : null,
                          isLongVowel ? styles.romajiKeyWide : null,
                          !isLast ? styles.romajiKeyGap : null,
                          pressed ? styles.romajiKeyPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.romajiKeyText,
                            isFunctionKey ? styles.romajiKeyTextFunction : styles.romajiKeyTextLetter,
                          ]}
                        >
                          {letter}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </>
        )}

        {showResult && answerWord ? (
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
              const exampleRaw = stripBoldTags((example?.ja_furigana ?? example?.ja ?? '').trim());
              const exampleJa = settings.show_example_furigana ? exampleRaw : stripFuriganaBrackets(exampleRaw);
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

        {showResult && !answerWord ? (
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
    paddingBottom: spacing.s,
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
  keyboardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  keyboardTopPreview: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  keyboardTopPreviewPressed: {
    borderColor: colors.primary,
    backgroundColor: '#eef2f7',
  },
  keyboardTopPreviewDisabled: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
  },
  keyboardTopPreviewText: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '600',
  },
  keyboardTopSpacer: {
    flex: 0.4,
  },
  submitKey: {
    paddingHorizontal: spacing.l,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  submitKeyPressed: {
    backgroundColor: '#0b1220',
  },
  submitKeyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  romajiGrid: {
    marginBottom: spacing.s,
  },
  romajiRow: {
    flexDirection: 'row',
    marginBottom: spacing.s,
  },
  romajiKey: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.m,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  romajiKeyLetter: {
    backgroundColor: '#ffffff',
    borderColor: '#dfe3ea',
  },
  romajiKeyFunction: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  romajiKeyPressed: {
    borderColor: colors.primary,
  },
  romajiKeyText: {
    fontSize: 17,
  },
  romajiKeyTextLetter: {
    color: colors.text,
    fontWeight: '600',
  },
  romajiKeyTextFunction: {
    color: '#0f172a',
    fontWeight: '700',
  },
  romajiKeyGap: {
    marginRight: Math.max(3, Math.floor(spacing.xs / 2)),
  },
  romajiKeySpacer: {
    flex: 0.5,
    minHeight: 50,
  },
  romajiKeyWide: {
    flex: 1.2,
  },
  actionButton: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonSpacing: {
    marginBottom: spacing.xs,
  },
});
