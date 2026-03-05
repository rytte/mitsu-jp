import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import OptionButton from '../components/OptionButton';
import PrimaryButton from '../components/PrimaryButton';
import {
  addToVocabBook,
  getStage,
  getVocabBookWords,
  getWordsByIds,
  recordMistake,
  removeFromVocabBook,
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
  jya: 'じゃ',
  jyu: 'じゅ',
  jyo: 'じょ',
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
const ROMAJI_KEY_HIT_SLOP = { top: 6, bottom: 8, left: 4, right: 4 } as const;
const ROMAJI_KEY_PRESS_RETENTION = { top: 2, bottom: 2, left: 2, right: 2 } as const;

type TypingState = {
  inputValue: string;
  romajiBuffer: string;
};

const EMPTY_TYPING: TypingState = { inputValue: '', romajiBuffer: '' };

type RomajiKeyProps = {
  letter: string;
  isLast: boolean;
  onLetterPress: (letter: string) => void;
  onLongVowelPress: () => void;
  onBackspacePress: () => void;
  onClearPress: () => void;
};

const RomajiKey = memo(function RomajiKey({
  letter,
  isLast,
  onLetterPress,
  onLongVowelPress,
  onBackspacePress,
  onClearPress,
}: RomajiKeyProps) {
  const isLongVowel = letter === '—';
  const isBackspace = letter === '⌫';
  const isFunctionKey = isLongVowel || isBackspace;
  const [visualPressed, setVisualPressed] = useState(false);

  const handlePress = () => {
    if (isLongVowel) {
      onLongVowelPress();
      return;
    }
    if (isBackspace) {
      onBackspacePress();
      return;
    }
    onLetterPress(letter);
  };

  return (
    <Pressable
      onTouchStart={() => setVisualPressed(true)}
      onTouchEnd={() => setVisualPressed(false)}
      onTouchCancel={() => setVisualPressed(false)}
      onPress={handlePress}
      onLongPress={isBackspace ? onClearPress : undefined}
      delayLongPress={isBackspace ? 400 : undefined}
      hitSlop={ROMAJI_KEY_HIT_SLOP}
      pressRetentionOffset={ROMAJI_KEY_PRESS_RETENTION}
      style={[
        styles.romajiKey,
        isFunctionKey ? styles.romajiKeyFunction : styles.romajiKeyLetter,
        visualPressed ? (isFunctionKey ? styles.romajiKeyFunctionPressed : styles.romajiKeyLetterPressed) : null,
        isBackspace ? styles.romajiKeyWide : null,
        isLongVowel ? styles.romajiKeyWide : null,
        !isLast ? styles.romajiKeyGap : null,
        visualPressed ? styles.romajiKeyPressed : null,
      ]}
    >
      {visualPressed ? (
        <View pointerEvents="none" style={styles.keyBubbleWrap}>
          <View style={styles.keyBubble}>
            <Text style={styles.keyBubbleText}>{letter}</Text>
            <View style={styles.keyBubbleCaret} />
          </View>
        </View>
      ) : null}
      <Text
        style={[
          styles.romajiKeyText,
          isFunctionKey ? styles.romajiKeyTextFunction : styles.romajiKeyTextLetter,
          visualPressed ? styles.romajiKeyTextPressed : null,
        ]}
      >
        {letter}
      </Text>
    </Pressable>
  );
});

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

function consumeRomaji(buffer: string, finalize = false) {
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
    if (rest[0] === 'n') {
      if (rest.length === 1) {
        if (finalize) {
          output += 'ん';
          rest = '';
          continue;
        }
        break;
      }
      if (ROMAJI_PREFIXES.has(rest)) break;
      output += 'ん';
      rest = rest.slice(1);
      continue;
    }
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
  const [typingState, setTypingState] = useState<TypingState>(EMPTY_TYPING);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [wordMap, setWordMap] = useState<Record<string, Word>>({});
  const [addedWordIds, setAddedWordIds] = useState<Set<string>>(new Set());
  const [addingWordId, setAddingWordId] = useState<string | null>(null);
  const lastAutoPlayedId = useRef<string | null>(null);
  const correctSoundPlayer = useAudioPlayer(require('../../assets/sfx/correct.mp3'));

  const currentItem = items[currentIndex];
  const meaningLabel = getMeaningLabel(settings.meaning_language);

  useEffect(() => {
    setAddingWordId(null);
  }, [stageId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const stage = await getStage(stageId);
      if (!stage) return;
      const [stageWords, vocabWords] = await Promise.all([
        getWordsByIds(stage.word_ids),
        getVocabBookWords(),
      ]);
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
      setAddedWordIds(new Set(vocabWords.map((word) => word.id)));
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

  const { inputValue, romajiBuffer } = typingState;
  const displayInputValue = useMemo(() => `${inputValue}${romajiBuffer}`, [inputValue, romajiBuffer]);
  const answeredCorrectly = isCorrect === true;

  const isOptionQuiz =
    currentItem?.type === 'mcq_ja_to_cn' ||
    currentItem?.type === 'mcq_cn_to_ja' ||
    currentItem?.type === 'listening';
  const answerWord = currentItem ? wordMap[currentItem.wordId] : undefined;
  const answerWordId = answerWord?.id ?? null;
  const answerWordAdded = answerWordId ? addedWordIds.has(answerWordId) : false;
  const answerWordAdding = answerWordId ? addingWordId === answerWordId : false;
  const shouldShowSpeakButton = currentItem?.type === 'listening' || currentItem?.type === 'mcq_ja_to_cn';

  const questionAudioText = useMemo(() => {
    if (!currentItem) return '';
    if (currentItem.type === 'listening') return currentItem.audioText;
    if (currentItem.type === 'mcq_ja_to_cn') {
      const word = wordMap[currentItem.wordId];
      return (word?.kana ?? currentItem.prompt).trim();
    }
    return '';
  }, [currentItem, wordMap]);

  const speak = (text: string) => {
    Speech.speak(text, {
      language: 'ja-JP',
      rate: settings.tts_rate,
    });
  };

  useEffect(() => {
    correctSoundPlayer.volume = 1.0;
    correctSoundPlayer.setPlaybackRate(1.15, 'high');
  }, [correctSoundPlayer]);

  const playCorrectSound = async () => {
    try {
      await correctSoundPlayer.seekTo(0);
      correctSoundPlayer.play();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!currentItem || !shouldShowSpeakButton || !questionAudioText) return;
    if (lastAutoPlayedId.current === currentItem.id) return;
    lastAutoPlayedId.current = currentItem.id;
    speak(questionAudioText);
  }, [currentItem, questionAudioText, settings.tts_rate, shouldShowSpeakButton]);

  const handleLetterPress = useCallback(
    (letter: string) => {
      if (showResult) return;
      setTypingState((prev) => {
        const consumed = consumeRomaji(prev.romajiBuffer + letter);
        return {
          inputValue: `${prev.inputValue}${consumed.output}`,
          romajiBuffer: consumed.buffer,
        };
      });
    },
    [showResult]
  );

  const handleLongVowel = useCallback(() => {
    if (showResult) return;
    setTypingState((prev) => {
      const consumed = consumeRomaji(prev.romajiBuffer);
      return {
        inputValue: `${prev.inputValue}${consumed.output}ー`,
        romajiBuffer: consumed.buffer,
      };
    });
  }, [showResult]);

  const handleBackspace = useCallback(() => {
    if (showResult) return;
    setTypingState((prev) => {
      if (prev.romajiBuffer.length > 0) {
        return { ...prev, romajiBuffer: prev.romajiBuffer.slice(0, -1) };
      }
      if (!prev.inputValue) return prev;
      const removed = prev.inputValue.slice(-1);
      let nextInput = prev.inputValue.slice(0, -1);
      let nextBuffer = '';
      if (isKanaChar(removed)) {
        const split = splitTrailingRomajiPrefix(nextInput);
        nextInput = split.base;
        nextBuffer = split.buffer;
      }
      return {
        inputValue: nextInput,
        romajiBuffer: nextBuffer,
      };
    });
  }, [showResult]);

  const handleClearSpelling = useCallback(() => {
    if (showResult) return;
    setTypingState({ inputValue: '', romajiBuffer: '' });
  }, [showResult]);

  const handleSubmitSpelling = () => {
    const consumed = consumeRomaji(romajiBuffer, true);
    const finalValue = `${inputValue}${consumed.output}${consumed.buffer}`;
    setTypingState({ inputValue: finalValue, romajiBuffer: '' });
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
      void playCorrectSound();
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
    setTypingState(EMPTY_TYPING);
    setShowResult(false);
    setIsCorrect(null);
  };

  const handleToggleAnswerWordVocab = async () => {
    if (!answerWordId || answerWordAdding) return;
    setAddingWordId(answerWordId);
    try {
      if (answerWordAdded) {
        await removeFromVocabBook([answerWordId]);
      } else {
        await addToVocabBook([answerWordId]);
      }
      setAddedWordIds((prev) => {
        const next = new Set(prev);
        if (answerWordAdded) {
          next.delete(answerWordId);
        } else {
          next.add(answerWordId);
        }
        return next;
      });
    } finally {
      setAddingWordId(null);
    }
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
      <View style={styles.topSection}>
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

        <View style={styles.topBody}>
          <ScrollView
            style={styles.topScroll}
            contentContainerStyle={styles.topScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {currentItem.type === 'mcq_ja_to_cn' && (
                <>
                  <View style={styles.listeningRow}>
                    <Text style={[styles.prompt, styles.listeningPrompt]}>{currentItem.prompt}</Text>
                    <Pressable
                      onPress={() => (questionAudioText ? speak(questionAudioText) : undefined)}
                      accessibilityRole="button"
                      accessibilityLabel="播放发音"
                      style={({ pressed }) => [styles.speakIconButton, pressed ? styles.speakIconButtonPressed : null]}
                    >
                      <Ionicons name="volume-high" size={20} color="#fff" />
                    </Pressable>
                  </View>
                </>
              )}

              {currentItem.type === 'mcq_cn_to_ja' && (
                <>
                  <Text style={styles.prompt}>{currentItem.prompt}</Text>
                </>
              )}

              {currentItem.type === 'listening' && (
                <>
                  <View style={styles.listeningRow}>
                    <Text style={[styles.prompt, styles.listeningPrompt]}>听力选择</Text>
                    <Pressable
                      onPress={() => (questionAudioText ? speak(questionAudioText) : undefined)}
                      accessibilityRole="button"
                      accessibilityLabel="播放发音"
                      style={({ pressed }) => [styles.speakIconButton, pressed ? styles.speakIconButtonPressed : null]}
                    >
                      <Ionicons name="volume-high" size={20} color="#fff" />
                    </Pressable>
                  </View>
                </>
              )}

              {currentItem.type === 'spelling' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder=""
                    value={displayInputValue}
                    editable={false}
                    showSoftInputOnFocus={false}
                    caretHidden
                  />
                  <Text style={[styles.prompt, styles.promptSpelling]}>{currentItem.prompt}</Text>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomSection}>
        <View style={styles.bottomBody}>
          <ScrollView
            style={styles.bottomScroll}
            contentContainerStyle={styles.bottomScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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

            {showResult && answerWord ? (
              <View style={styles.answerCard}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultText, answeredCorrectly ? styles.correct : styles.wrong]}>
                    {answeredCorrectly ? '回答正确！' : '回答错误'}
                  </Text>
                  <Pressable
                    onPress={handleToggleAnswerWordVocab}
                    disabled={answerWordAdding}
                    style={({ pressed }) => [
                      styles.vocabIconBtn,
                      answerWordAdded ? styles.vocabIconBtnAdded : null,
                      answerWordAdding ? styles.vocabIconBtnDisabled : null,
                      pressed && !answerWordAdding ? styles.vocabIconBtnPressed : null,
                    ]}
                  >
                    <Ionicons
                      name={answerWordAdded ? 'bookmark' : 'bookmark-outline'}
                      size={16}
                      color={answerWordAdded ? '#047857' : colors.primary}
                    />
                  </Pressable>
                </View>
                <View style={styles.answerHeader}>
                  <View style={styles.answerHeadText}>
                    {answerWord.kanji ? <Text style={styles.answerReading}>{answerWord.kana}</Text> : null}
                    <Text style={styles.answerWord}>{answerWord.kanji ?? answerWord.kana}</Text>
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
                <View style={styles.answerMeaningRow}>
                  <View style={styles.answerMeaningTag}>
                    <Text style={styles.answerMeaningTagText}>释义</Text>
                  </View>
                  <Text style={styles.answerMeaning}>{getMeaning(answerWord, settings.meaning_language)}</Text>
                </View>
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
                <Text style={[styles.resultText, answeredCorrectly ? styles.correct : styles.wrong]}>
                  {answeredCorrectly ? '回答正确！' : '回答错误'}
                </Text>
                <Text style={styles.answerLabel}>正确答案</Text>
                <Text style={styles.answerText}>{currentItem.answer}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>

        {currentItem.type === 'spelling' && !showResult && (
          <View style={styles.keyboardPanel}>
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

                    return (
                      <RomajiKey
                        key={`${letter}-${rowIndex}-${index}`}
                        letter={letter}
                        isLast={isLast}
                        onLetterPress={handleLetterPress}
                        onLongVowelPress={handleLongVowel}
                        onBackspacePress={handleBackspace}
                        onClearPress={handleClearSpelling}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

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
  topSection: {
    flex: 46,
    minHeight: 0,
  },
  topBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  topScroll: {
    flex: 1,
    minHeight: 0,
  },
  topScrollContent: {
    paddingBottom: spacing.s,
    flexGrow: 1,
    justifyContent: 'flex-end',
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  promptSpelling: {
    fontSize: 17,
  },
  subPrompt: {
    color: colors.muted,
    marginBottom: spacing.m,
  },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: '#94a3b8',
    paddingVertical: spacing.s,
    paddingHorizontal: 0,
    marginBottom: spacing.m,
    fontSize: 20,
    color: colors.text,
    backgroundColor: 'transparent',
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
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listeningPrompt: {
    marginBottom: 0,
    marginRight: spacing.s,
    flexShrink: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.m,
  },
  bottomSection: {
    flex: 54,
    minHeight: 0,
    overflow: 'hidden',
  },
  bottomBody: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  bottomScroll: {
    flex: 1,
    minHeight: 0,
  },
  bottomScrollContent: {
    paddingBottom: spacing.s,
  },
  optionList: {
    paddingBottom: spacing.xs,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  answerHeadText: {
    flex: 1,
    paddingRight: spacing.s,
    paddingLeft: 24,
  },
  answerWord: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.text,
  },
  answerReading: {
    marginBottom: 4,
    fontSize: 22,
    fontWeight: '400',
    color: colors.text,
  },
  answerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '45%',
    marginTop: spacing.xs,
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
  answerMeaningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.s,
  },
  answerMeaningTag: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
    marginTop: 2,
  },
  answerMeaningTagText: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '500',
  },
  answerMeaning: {
    color: colors.text,
    flex: 1,
    lineHeight: 21,
  },
  vocabIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  vocabIconBtnPressed: {
    opacity: 0.9,
  },
  vocabIconBtnAdded: {
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
  },
  vocabIconBtnDisabled: {
    opacity: 0.7,
  },
  answerExample: {
    padding: 8,
    borderRadius: radius.m,
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    marginLeft: spacing.l,
  },
  answerExampleJa: {
    color: '#475569',
  },
  answerExampleCn: {
    marginTop: 8,
    color: '#64748b',
  },
  answerText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  keyboardPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.s,
  },
  keyboardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  keyboardTopPreview: {
    flex: 1,
    minHeight: 46,
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
    fontSize: 18,
    fontWeight: '400',
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
    marginBottom: spacing.xs,
  },
  romajiRow: {
    flexDirection: 'row',
    marginBottom: spacing.s,
  },
  romajiKey: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.s,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    position: 'relative',
    overflow: 'visible',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  romajiKeyLetter: {
    backgroundColor: '#ffffff',
    borderColor: '#dfe3ea',
  },
  romajiKeyFunction: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  romajiKeyLetterPressed: {
    backgroundColor: '#e5e7eb',
  },
  romajiKeyFunctionPressed: {
    backgroundColor: '#d1d5db',
  },
  romajiKeyPressed: {
    borderColor: '#9ca3af',
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.03,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  romajiKeyText: {
    fontSize: 21,
  },
  romajiKeyTextLetter: {
    color: colors.text,
    fontWeight: '500',
  },
  romajiKeyTextFunction: {
    color: '#0f172a',
    fontWeight: '700',
  },
  romajiKeyTextPressed: {
    color: '#111827',
  },
  romajiKeyGap: {
    marginRight: 2,
  },
  romajiKeySpacer: {
    flex: 0.5,
    minHeight: 50,
  },
  romajiKeyWide: {
    flex: 1.2,
  },
  keyBubbleWrap: {
    position: 'absolute',
    top: -90,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  keyBubble: {
    minWidth: 48,
    height: 76,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  keyBubbleText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  keyBubbleCaret: {
    position: 'absolute',
    bottom: -6,
    width: 10,
    height: 10,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    transform: [{ rotate: '45deg' }],
  },
  actionButton: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.s,
  },
  buttonSpacing: {
    marginBottom: spacing.xs,
  },
});
