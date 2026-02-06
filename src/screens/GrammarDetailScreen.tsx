import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import GrammarCard from '../components/GrammarCard';
import { getAllGrammars, getGrammarByLevel } from '../data/grammars';
import { GrammarStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing } from '../theme';
import { bumpFontScale, getGrammarFontSizes } from '../utils/fontScale';

type Props = NativeStackScreenProps<GrammarStackParamList, 'GrammarDetail'>;

function extractComparePatterns(notes?: (string | null)[] | null) {
  if (!notes) return [];
  const results: string[] = [];
  const quoteStart = '\u300c';
  const quoteEnd = '\u300d';
  const quoteRegex = new RegExp(`${quoteStart}([^${quoteEnd}]+)${quoteEnd}`, 'g');
  for (const raw of notes) {
    const text = (raw ?? '').trim();
    if (!text) continue;
    const matches = text.matchAll(quoteRegex);
    for (const match of matches) {
      const chunk = match[1];
      if (!chunk) continue;
      const parts = chunk.split(/[\u3001\uff0c,\u30fb]/);
      for (const part of parts) {
        const item = part.trim();
        if (item) results.push(item);
      }
    }
  }
  return Array.from(new Set(results));
}

function findGrammarByPattern(pattern: string, all: ReturnType<typeof getAllGrammars>) {
  const normalized = pattern.replace(/\s+/g, '');
  let candidate = all.find((item) => item.pattern === pattern);
  if (candidate) return candidate;
  candidate = all.find((item) => item.pattern.replace(/\s+/g, '') === normalized);
  if (candidate) return candidate;
  candidate = all.find((item) => item.pattern.includes(pattern) || pattern.includes(item.pattern));
  return candidate ?? null;
}

export default function GrammarDetailScreen({ route, navigation }: Props) {
  const { level, id } = route.params;
  const fontScale = useAppStore((state) => state.settings.font_scale);
  const items = getGrammarByLevel(level);
  const grammar = items.find((item) => item.id === id);
  const allGrammars = getAllGrammars();

  if (!grammar) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>未找到该文法条目</Text>
      </View>
    );
  }

  const fontSizes = getGrammarFontSizes(bumpFontScale(fontScale));
  const comparePatterns = extractComparePatterns(grammar.notes).filter((item) => item && item !== grammar.pattern);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GrammarCard grammar={grammar} fontSizes={fontSizes} />
      {comparePatterns.length > 0 ? (
        <View style={styles.compareCard}>
          <Text style={styles.compareTitle}>对比表达</Text>
          <View style={styles.compareTags}>
            {comparePatterns.map((pattern) => {
              const target = findGrammarByPattern(pattern, allGrammars);
              if (target && target.id !== grammar.id) {
                const targetLevel = target.level ?? level;
                return (
                  <Pressable
                    key={pattern}
                    onPress={() => navigation.push('GrammarDetail', { level: targetLevel, id: target.id })}
                    style={({ pressed }) => [styles.compareChip, pressed ? styles.compareChipPressed : null]}
                  >
                    <Text style={styles.compareText}>{pattern}</Text>
                  </Pressable>
                );
              }
              return (
                <View key={pattern} style={[styles.compareChip, styles.compareChipMuted]}>
                  <Text style={[styles.compareText, styles.compareTextMuted]}>{pattern}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.compareHint}>点击可跳转到对应文法</Text>
        </View>
      ) : null}
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
  compareCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compareTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  compareTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.s,
  },
  compareChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginRight: spacing.xs,
    marginTop: spacing.xs,
  },
  compareChipPressed: {
    backgroundColor: '#e0e7ff',
  },
  compareChipMuted: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  compareText: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 12,
  },
  compareTextMuted: {
    color: colors.muted,
  },
  compareHint: {
    color: colors.muted,
    fontSize: 12,
  },
});
