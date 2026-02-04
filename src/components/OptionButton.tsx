import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = {
  title: string;
  selected?: boolean;
  correct?: boolean | null;
  onPress: () => void;
};

export default function OptionButton({ title, selected, correct, onPress }: Props) {
  const showResult = typeof correct === 'boolean';
  return (
    <Pressable
      onPress={onPress}
      disabled={showResult}
      style={({ pressed }) => [
        styles.option,
        selected ? styles.selected : null,
        showResult && correct === true ? styles.correct : null,
        showResult && correct === false && selected ? styles.wrong : null,
        pressed && !showResult ? styles.pressed : null,
      ]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  pressed: {
    borderColor: colors.primary,
  },
  selected: {
    borderColor: colors.primary,
  },
  correct: {
    backgroundColor: '#dcfce7',
    borderColor: colors.success,
  },
  wrong: {
    backgroundColor: '#fee2e2',
    borderColor: colors.danger,
  },
  text: {
    fontSize: 16,
    color: colors.text,
  },
});

