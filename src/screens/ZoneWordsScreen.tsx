import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Switch, Text, View } from 'react-native';
import { getWordsByIds, updateSettings } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { Settings, Word } from '../types';
import { bumpFontScale, getWordFontSizes } from '../utils/fontScale';
import { getMeaning } from '../utils/meaning';

type Props = NativeStackScreenProps<LearnStackParamList, 'ZoneWords'>;

export default function ZoneWordsScreen({ route, navigation }: Props) {
  const { zoneIndex, startIndex, endIndex, wordIds, wordStageMap } = route.params;
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const meaningLanguage = settings.meaning_language;
  const compactMode = settings.compact_mode;
  const fontScale = settings.font_scale;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const list = await getWordsByIds(wordIds);
      if (!active) return;
      setWords(list);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [wordIds]);

  useEffect(() => {
    if (!compactMode) {
      setExpandedIds(new Set());
    }
  }, [compactMode]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const persistSettings = async (next: Settings) => {
    setSettings(next);
    await updateSettings(next);
  };

  const toggleCompactMode = async (value: boolean) => {
    await persistSettings({ ...settings, compact_mode: value });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerToggle}>
          <Text style={styles.headerToggleText}>紧凑</Text>
          <Switch
            value={compactMode}
            onValueChange={toggleCompactMode}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      ),
    });
  }, [compactMode, navigation, toggleCompactMode]);

  const fontSizes = useMemo(() => {
    const effectiveScale = compactMode ? fontScale : bumpFontScale(fontScale);
    return getWordFontSizes(effectiveScale);
  }, [compactMode, fontScale]);

  const sections = useMemo(() => {
    const orderMap = new Map<string, number>();
    wordIds.forEach((id, index) => orderMap.set(id, index));
    const grouped = new Map<number, Word[]>();
    for (const word of words) {
      const stageIndex = wordStageMap[word.id];
      if (!stageIndex) continue;
      const list = grouped.get(stageIndex) ?? [];
      list.push(word);
      grouped.set(stageIndex, list);
    }
    const result: { title: string; data: Word[] }[] = [];
    for (let i = startIndex; i <= endIndex; i += 1) {
      const list = grouped.get(i);
      if (!list || list.length === 0) continue;
      const sorted = list.slice().sort((a, b) => {
        return (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0);
      });
      result.push({ title: `第 ${i} 关`, data: sorted });
    }
    return result;
  }, [endIndex, startIndex, wordIds, wordStageMap, words]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>词汇加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <View style={styles.headerBadgeRow}>
                <Text style={styles.headerBadge}>ZONE</Text>
                <Text style={styles.headerBadgeLevel}>{zoneIndex}</Text>
              </View>
              <Text style={styles.title}>第 {zoneIndex} 区词汇</Text>
              <Text style={styles.subtitle}>第 {startIndex}-{endIndex} 关</Text>
              {compactMode && <Text style={styles.hint}>点击词条展开/收起</Text>}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isExpanded = expandedIds.has(item.id);
          return (
            <Pressable
              disabled={!compactMode}
              onPress={() => toggleExpanded(item.id)}
              style={({ pressed }) => [
                styles.card,
                compactMode ? styles.cardCompact : null,
                pressed && compactMode ? styles.cardPressed : null,
              ]}
            >
              <Text style={[styles.word, { fontSize: fontSizes.word }]}>{item.kanji ?? item.kana}</Text>
              {(!compactMode || isExpanded) && (
                <>
                  <Text style={[styles.reading, { fontSize: fontSizes.reading }, compactMode ? styles.readingCompact : null]}>
                    {item.kana}
                  </Text>
                  <Text style={[styles.meaning, { fontSize: fontSizes.meaning }, compactMode ? styles.meaningCompact : null]}>
                    {getMeaning(item, meaningLanguage)}
                  </Text>
                </>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.m,
    color: colors.muted,
  },
  header: {
    marginBottom: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  hint: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: 11,
    marginRight: spacing.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerBadgeLevel: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerToggleText: {
    color: colors.muted,
    marginRight: spacing.xs,
    fontSize: 12,
  },
  list: {
    paddingBottom: spacing.l,
  },
  sectionHeader: {
    marginBottom: spacing.s,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardCompact: {
    padding: spacing.s,
    borderRadius: radius.m,
    marginBottom: spacing.s,
  },
  cardPressed: {
    opacity: 0.7,
  },
  word: {
    fontSize: 20,
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
    color: colors.muted,
  },
});
