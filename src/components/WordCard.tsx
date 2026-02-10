import { ReactNode } from 'react';
import { InteractionManager, Pressable, StyleSheet, Text, TextStyle, View } from 'react-native';
import * as Speech from 'expo-speech';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { Word } from '../types';

type FontSizes = {
  word: number;
  reading: number;
  meaning: number;
};

type Props = {
  word: Word;
  meaning: string;
  compact?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  fontSizes: FontSizes;
  shadow?: boolean;
  footer?: ReactNode;
};

function renderBoldMarkup(text: string, boldStyle: TextStyle) {
  if (!text || !/<\/?b>/i.test(text)) return text;
  const parts = text.split(/(<\/?b>)/gi);
  let bold = false;
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
    nodes.push(
      <Text key={`b-${key}`} style={bold ? boldStyle : undefined}>
        {part}
      </Text>
    );
    key += 1;
  }
  return nodes.length ? nodes : text;
}

function stripBoldTags(text: string) {
  if (!text) return '';
  return text.replace(/<\/?b>/gi, '');
}

type BoldToken = {
  text: string;
  bold: boolean;
};

type FuriganaPiece =
  | { type: 'text'; text: string }
  | { type: 'ruby'; base: string; ruby: string };

function parseBoldTokens(text: string): BoldToken[] {
  if (!text) return [];
  const parts = text.split(/(<\/?b>)/gi);
  const tokens: BoldToken[] = [];
  let bold = false;
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
    tokens.push({ text: part, bold });
  }
  return tokens;
}

function isKanji(char: string) {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uF900-\uFAFF々]/.test(char);
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

function stripFurigana(text: string) {
  return splitFurigana(text)
    .map((piece) => (piece.type === 'text' ? piece.text : piece.base))
    .join('');
}

function renderFuriganaText(text: string, fontSize: number) {
  const tokens = parseBoldTokens(text);
  const readingSize = Math.max(10, Math.round(fontSize * 0.6));
  const nodes: ReactNode[] = [];
  let key = 0;

  const buildBaseStyle = (bold: boolean) => [
    styles.exampleJa,
    { fontSize, lineHeight: Math.round(fontSize * 1.5) },
    bold ? styles.exampleBold : null,
  ];
  const buildReadingStyle = (bold: boolean) => [
    styles.furiganaReading,
    { fontSize: readingSize, lineHeight: Math.round(readingSize * 1.1) },
    bold ? styles.exampleBold : null,
  ];

  for (const token of tokens) {
    const pieces = splitFurigana(token.text);
    for (const piece of pieces) {
      if (piece.type === 'text') {
        for (const char of Array.from(piece.text)) {
          nodes.push(
            <Text key={`t-${key}`} style={buildBaseStyle(token.bold)}>
              {char}
            </Text>
          );
          key += 1;
        }
      } else {
        nodes.push(
          <View key={`r-${key}`} style={styles.furiganaUnit}>
            <Text style={buildReadingStyle(token.bold)}>{piece.ruby}</Text>
            <Text style={buildBaseStyle(token.bold)}>{piece.base}</Text>
          </View>
        );
        key += 1;
      }
    }
  }

  return <View style={styles.furiganaLine}>{nodes}</View>;
}

export default function WordCard({
  word,
  meaning,
  compact = false,
  expanded = false,
  disabled = false,
  onPress,
  onLongPress,
  fontSizes,
  shadow = false,
  footer,
}: Props) {
  const settings = useAppStore((state) => state.settings);
  const showExampleFurigana = settings.show_example_furigana;
  const showDetails = !compact || expanded;
  const cardStyles = [styles.card, shadow ? styles.cardShadow : null];
  const example = word.examples?.[0];
  const exampleJa = (example?.ja_furigana ?? example?.ja ?? '').trim();
  const exampleCn = (example?.zh_cn ?? '').trim();
  const showExample = Boolean(exampleJa || exampleCn);
  const exampleSpeechText = stripFurigana(stripBoldTags(exampleJa)).trim();
  const posText = (word.pos ?? '').trim();
  const pitchText = (word.pitch ?? '').trim();
  const metaItems: string[] = [];

  if (posText) metaItems.push(posText);
  if (pitchText) metaItems.push(pitchText);

  const ttsText = (word.kana ?? '').trim() || (word.kanji ?? '').trim();
  const hasPressable = Boolean(onPress || onLongPress || ttsText);
  const scheduleSpeak = (text: string) => {
    InteractionManager.runAfterInteractions(() => {
      Speech.stop();
      Speech.speak(text, {
        language: 'ja-JP',
        rate: settings.tts_rate,
        voice: settings.tts_voice ?? undefined,
      });
    });
  };
  const handleExamplePress = (event: { stopPropagation?: () => void }) => {
    event.stopPropagation?.();
    if (!disabled && exampleSpeechText) {
      scheduleSpeak(exampleSpeechText);
    }
  };

  const content = (
    <>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={[styles.word, { fontSize: fontSizes.word }]}>{word.kanji ?? word.kana}</Text>
          {showDetails && <Text style={[styles.reading, { fontSize: fontSizes.reading }]}>{word.kana}</Text>}
        </View>
        {showDetails && metaItems.length > 0 ? (
          <View style={styles.metaRow}>
            {metaItems.map((item, index) => (
              <View key={`${item}-${index}`} style={[styles.metaChip, index > 0 ? styles.metaChipGap : null]}>
                <Text style={styles.metaValue}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {showDetails && (
        <>
          <Text style={[styles.meaning, { fontSize: fontSizes.meaning }]}>
            {meaning}
          </Text>
          {showExample && (
            <Pressable
              disabled={!exampleSpeechText}
              onPress={handleExamplePress}
              style={({ pressed }) => [styles.example, pressed && exampleSpeechText ? styles.examplePressed : null]}
            >
              <View style={styles.exampleHeader}>
                <Text style={styles.exampleTag}>例句</Text>
              </View>
              {exampleJa ? (
                showExampleFurigana ? (
                  renderFuriganaText(exampleJa, fontSizes.meaning)
                ) : (
                  <Text
                    style={[
                      styles.exampleJa,
                      { fontSize: fontSizes.meaning, lineHeight: Math.round(fontSizes.meaning * 1.5) },
                    ]}
                  >
                    {renderBoldMarkup(stripFurigana(exampleJa), styles.exampleBold)}
                  </Text>
                )
              ) : null}
              {exampleCn ? (
                <Text
                  style={[
                    styles.exampleCn,
                    { fontSize: fontSizes.meaning, lineHeight: Math.round(fontSizes.meaning * 1.5) },
                  ]}
                >
                  {exampleCn}
                </Text>
              ) : null}
            </Pressable>
          )}
        </>
      )}
      {footer}
    </>
  );

  if (!hasPressable) {
    return <View style={cardStyles}>{content}</View>;
  }

  const handlePress = () => {
    onPress?.();
    if (!disabled && ttsText) {
      scheduleSpeak(ttsText);
    }
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={({ pressed }) => [...cardStyles, pressed && !disabled ? styles.cardPressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headText: {
    flex: 1,
    paddingRight: spacing.s,
  },
  word: {
    fontWeight: '700',
    color: colors.text,
  },
  reading: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '45%',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipGap: {
    marginLeft: spacing.xs,
  },
  metaValue: {
    letterSpacing: 0.2,
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  meaning: {
    marginTop: spacing.s,
    color: colors.text,
  },
  example: {
    marginTop: spacing.s,
    padding: spacing.s,
    borderRadius: radius.m,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: '#c7d2fe',
  },
  examplePressed: {
    opacity: 0.7,
  },
  exampleHeader: {
    marginBottom: spacing.s,
  },
  exampleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: '#eef2ff',
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '600',
  },
  exampleJa: {
    color: colors.text,
  },
  furiganaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  furiganaUnit: {
    alignItems: 'center',
  },
  furiganaReading: {
    color: colors.muted,
    includeFontPadding: false,
  },
  exampleBold: {
    fontWeight: '700',
  },
  exampleCn: {
    marginTop: spacing.s,
    color: colors.muted,
  },
});
