import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View } from 'react-native';
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
  const showDetails = !compact || expanded;
  const cardStyles = [styles.card, shadow ? styles.cardShadow : null];
  const example = word.examples?.[0];
  const exampleJa = (example?.ja_furigana ?? example?.ja ?? '').trim();
  const exampleCn = (example?.zh_cn ?? '').trim();
  const showExample = Boolean(exampleJa || exampleCn);
  const posText = (word.pos ?? '').trim();
  const pitchText = (word.pitch ?? '').trim();
  const metaItems: string[] = [];

  if (posText) metaItems.push(posText);
  if (pitchText) metaItems.push(pitchText);

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
            <View style={styles.example}>
              <View style={styles.exampleHeader}>
                <Text style={styles.exampleTag}>例句</Text>
              </View>
              {exampleJa ? (
                <Text
                  style={[
                    styles.exampleJa,
                    { fontSize: fontSizes.meaning, lineHeight: Math.round(fontSizes.meaning * 1.5) },
                  ]}
                >
                  {renderBoldMarkup(exampleJa, styles.exampleBold)}
                </Text>
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
            </View>
          )}
        </>
      )}
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
  exampleBold: {
    fontWeight: '700',
  },
  exampleCn: {
    marginTop: spacing.s,
    color: colors.muted,
  },
});
