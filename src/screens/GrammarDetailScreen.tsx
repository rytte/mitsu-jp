import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import GrammarCard from '../components/GrammarCard';
import { getGrammarByLevel } from '../data/grammars';
import { GrammarStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing } from '../theme';
import { bumpFontScale, getGrammarFontSizes } from '../utils/fontScale';

type Props = NativeStackScreenProps<GrammarStackParamList, 'GrammarDetail'>;

export default function GrammarDetailScreen({ route }: Props) {
  const { level, id } = route.params;
  const fontScale = useAppStore((state) => state.settings.font_scale);
  const items = getGrammarByLevel(level);
  const grammar = items.find((item) => item.id === id);

  if (!grammar) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>未找到该文法条目</Text>
      </View>
    );
  }

  const fontSizes = getGrammarFontSizes(bumpFontScale(fontScale));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GrammarCard grammar={grammar} fontSizes={fontSizes} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    backgroundColor: colors.background,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  emptyText: {
    color: colors.muted,
  },
});
