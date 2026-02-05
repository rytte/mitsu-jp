import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  fontSizes: FontSizes;
  shadow?: boolean;
  footer?: ReactNode;
};

export default function WordCard({
  word,
  meaning,
  compact = false,
  expanded = false,
  disabled = false,
  onPress,
  fontSizes,
  shadow = false,
  footer,
}: Props) {
  const showDetails = !compact || expanded;
  const cardStyles = [styles.card, compact ? styles.cardCompact : null, shadow ? styles.cardShadow : null];

  const content = (
    <>
      <Text style={[styles.word, { fontSize: fontSizes.word }]}>{word.kanji ?? word.kana}</Text>
      {showDetails && (
        <>
          <Text style={[styles.reading, { fontSize: fontSizes.reading }, compact ? styles.readingCompact : null]}>
            {word.kana}
          </Text>
          <Text style={[styles.meaning, { fontSize: fontSizes.meaning }, compact ? styles.meaningCompact : null]}>
            {meaning}
          </Text>
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
  cardCompact: {
    padding: spacing.s,
    borderRadius: radius.m,
    marginBottom: spacing.s,
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
  word: {
    fontWeight: '700',
    color: colors.text,
  },
  reading: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  readingCompact: {
    marginTop: spacing.xs,
  },
  meaning: {
    marginTop: spacing.s,
    color: colors.text,
  },
  meaningCompact: {
    marginTop: spacing.xs,
  },
});
