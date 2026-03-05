import { ReactNode } from 'react';
import { InteractionManager, Pressable, StyleSheet, Text, TextStyle, View } from 'react-native';
import * as Speech from 'expo-speech';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { GrammarPoint } from '../types';

type FontSizes = {
  pattern: number;
  meaning: number;
  detail: number;
};

type Props = {
  grammar: GrammarPoint;
  compact?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  fontSizes: FontSizes;
  shadow?: boolean;
  footer?: ReactNode;
};

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

function stripInlineMarkup(text: string) {
  if (!text) return '';
  return text.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?(b|u|s)>/gi, '');
}

type InlineToken =
  | {
      type: 'text';
      text: string;
      bold: boolean;
      underline: boolean;
      strike: boolean;
    }
  | {
      type: 'newline';
    };

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

function stripBracketFurigana(text: string) {
  if (!text) return '';
  return text.replace(/\[[^\]]*\]/g, '');
}

function sanitizeFormationText(text: string) {
  if (!text) return '';
  return stripBracketFurigana(text).trim();
}

function sanitizeMeaningText(text: string) {
  if (!text) return '';
  return stripBracketFurigana(text).trim();
}

function splitRichTextLines(text: string) {
  if (!text) return [];
  return text
    .split(/<br\s*\/?>|\r?\n/gi)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderFuriganaMarkup(text: string, fontSize: number, baseStyle?: TextStyle, keywordStyle?: TextStyle) {
  const tokens = parseInlineTokens(text);
  const readingSize = Math.max(10, Math.round(fontSize * 0.6));
  const lines: ReactNode[] = [];
  let lineNodes: ReactNode[] = [];
  let key = 0;
  const baseTextStyle = baseStyle ?? styles.exampleJa;

  const buildBaseStyle = (token: InlineToken) => {
    if (token.type !== 'text') return [];
    return [
      baseTextStyle,
      { fontSize, lineHeight: Math.round(fontSize * 1.5) },
      token.bold ? (keywordStyle ?? styles.inlineBold) : null,
      token.underline ? styles.inlineUnderline : null,
      token.strike ? styles.inlineStrike : null,
    ];
  };
  const buildReadingStyle = (token: InlineToken) => {
    if (token.type !== 'text') return [];
    return [
      styles.furiganaReading,
      { fontSize: readingSize, lineHeight: Math.round(readingSize * 1.1) },
      token.bold ? (keywordStyle ?? styles.inlineBold) : null,
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

export default function GrammarCard({
  grammar,
  compact = false,
  expanded = false,
  disabled = false,
  onPress,
  fontSizes,
  shadow = false,
  footer,
}: Props) {
  const settings = useAppStore((state) => state.settings);
  const showExampleFurigana = settings.show_example_furigana;
  const showDetails = !compact || expanded;
  const cardStyles = [styles.card, shadow ? styles.cardShadow : null];

  const connectiveSource =
    grammar.gakkoConnectives && grammar.gakkoConnectives.length > 0 ? grammar.gakkoConnectives : grammar.formation;
  const formationLines = (connectiveSource ?? [])
    .flatMap((item) => splitRichTextLines(sanitizeFormationText(item)))
    .filter(Boolean);
  const meaningLines = splitRichTextLines(sanitizeMeaningText(grammar.explanation ?? ''));
  const usageLines = (grammar.usage ?? []).map((item) => item.trim()).filter(Boolean);
  const noteLines = (grammar.notes ?? []).map((item) => item.trim()).filter(Boolean);
  const example = grammar.examples?.[0];
  const exampleJa = (example?.ja ?? '').trim();
  const exampleZh = (example?.zh ?? '').trim();
  const showExample = Boolean(exampleJa || exampleZh);
  const exampleSpeechText = stripFurigana(stripInlineMarkup(exampleJa)).trim();

  const noLabel = grammar.subOrder ? `No. ${grammar.subOrder}` : '';
  const metaItems = [noLabel].filter(Boolean);

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
          {renderFuriganaMarkup(grammar.pattern, fontSizes.pattern, styles.pattern)}
        </View>
        {metaItems.length > 0 ? (
          <View style={styles.metaRow}>
            {metaItems.map((item, index) => (
              <View key={`${item}-${index}`} style={[styles.metaChip, index > 0 ? styles.metaChipGap : null]}>
                <Text style={styles.metaValue}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {showDetails && formationLines.length > 0 ? (
        <View style={[styles.block, styles.connectiveBlock]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, styles.connectiveAccent]} />
            <Text style={[styles.sectionLabel, styles.connectiveLabel]}>接续</Text>
          </View>
          {formationLines.map((line, index) => (
            <Text
              key={`formation-${index}`}
              style={[styles.blockText, styles.connectiveText, { fontSize: fontSizes.detail }]}
            >
              {renderInlineMarkup(line, styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
            </Text>
          ))}
        </View>
      ) : null}

      {showDetails && meaningLines.length > 0 ? (
        <View style={[styles.block, styles.meaningBlock]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, styles.meaningAccent]} />
            <Text style={[styles.sectionLabel, styles.meaningLabel]}>释义</Text>
          </View>
          {meaningLines.map((line, index) => (
            <Text
              key={`meaning-${index}`}
              style={[styles.meaning, styles.meaningText, { fontSize: fontSizes.meaning }, index > 0 ? styles.meaningLineGap : null]}
            >
              {renderInlineMarkup(line, styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
            </Text>
          ))}
        </View>
      ) : null}

      {showDetails && usageLines.length > 0 ? (
        <View style={styles.block}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, styles.usageAccent]} />
            <Text style={[styles.sectionLabel, styles.usageLabel]}>用法</Text>
          </View>
          {usageLines.map((line, index) => (
            <Text key={`usage-${index}`} style={[styles.blockText, { fontSize: fontSizes.detail }]}>
              {renderInlineMarkup(line, styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
            </Text>
          ))}
        </View>
      ) : null}

      {showDetails && noteLines.length > 0 ? (
        <View style={styles.block}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, styles.noteAccent]} />
            <Text style={[styles.sectionLabel, styles.noteLabel]}>备注</Text>
          </View>
          {noteLines.map((line, index) => (
            <Text key={`note-${index}`} style={[styles.blockText, { fontSize: fontSizes.detail }]}>
              {renderInlineMarkup(stripBracketFurigana(line), styles.inlineBold, styles.inlineUnderline, styles.inlineStrike)}
            </Text>
          ))}
        </View>
      ) : null}

      {showDetails && showExample ? (
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
              renderFuriganaMarkup(exampleJa, fontSizes.detail, styles.exampleJa, styles.exampleKeyword)
            ) : (
              <Text style={[styles.exampleJa, { fontSize: fontSizes.detail, lineHeight: Math.round(fontSizes.detail * 1.5) }]}>
                {renderInlineMarkup(
                  stripFurigana(exampleJa),
                  styles.exampleKeyword,
                  styles.inlineUnderline,
                  styles.inlineStrike
                )}
              </Text>
            )
          ) : null}
          {exampleZh ? (
            <Text style={[styles.exampleZh, { fontSize: fontSizes.detail, lineHeight: Math.round(fontSizes.detail * 1.5) }]}>
              {renderInlineMarkup(exampleZh, styles.exampleKeyword, styles.inlineUnderline, styles.inlineStrike)}
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      {footer}
    </>
  );

  if (!onPress) {
    return <View style={cardStyles}>{content}</View>;
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
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
  pattern: {
    fontWeight: '600',
    color: colors.text,
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
    color: colors.text,
  },
  meaningLineGap: {
    marginTop: spacing.xs,
  },
  block: {
    marginTop: spacing.s,
  },
  connectiveBlock: {
    marginTop: spacing.s,
  },
  connectiveLabel: {
    color: '#8a6d3b',
  },
  connectiveText: {
    color: colors.muted,
  },
  meaningBlock: {
    marginTop: spacing.s,
  },
  meaningLabel: {
    color: colors.primaryDark,
  },
  meaningText: {
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionAccent: {
    width: 3,
    height: 12,
    borderRadius: 2,
    marginRight: spacing.xs,
    backgroundColor: colors.border,
  },
  connectiveAccent: {
    backgroundColor: '#d4c3a5',
  },
  meaningAccent: {
    backgroundColor: '#c4d1e2',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  usageAccent: {
    backgroundColor: '#6fb8af',
  },
  usageLabel: {
    color: '#0f766e',
  },
  noteAccent: {
    backgroundColor: '#fdba74',
  },
  noteLabel: {
    color: '#9a3412',
  },
  blockText: {
    color: colors.text,
    marginBottom: spacing.xs,
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
  exampleKeyword: {
    color: colors.primaryDark,
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
  inlineBold: {
    fontWeight: '700',
  },
  inlineUnderline: {
    textDecorationLine: 'underline',
  },
  inlineStrike: {
    textDecorationLine: 'line-through',
  },
  exampleZh: {
    marginTop: spacing.s,
    color: colors.muted,
  },
});
