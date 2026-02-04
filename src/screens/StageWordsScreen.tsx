import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { getStage, getWordsByIds, updateSettings } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { Settings, Word } from '../types';
import { getMeaning } from '../utils/meaning';

type Props = NativeStackScreenProps<LearnStackParamList, 'StageWords'>;

export default function StageWordsScreen({ route }: Props) {
  const { stageId, stageIndex } = route.params;
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const meaningLanguage = settings.meaning_language;
  const compactMode = settings.compact_mode;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const stage = await getStage(stageId);
      if (!stage) {
        if (active) {
          setWords([]);
          setLoading(false);
        }
        return;
      }
      const list = await getWordsByIds(stage.word_ids);
      if (!active) return;
      setWords(list);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [stageId]);

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
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>第 {stageIndex} 关词汇</Text>
          <Text style={styles.subtitle}>共 {words.length} 个</Text>
          {compactMode && <Text style={styles.hint}>点击词条展开/收起</Text>}
        </View>
        <View style={styles.modeToggle}>
          <Text style={styles.modeText}>紧凑模式</Text>
          <Switch
            value={compactMode}
            onValueChange={toggleCompactMode}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>
      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
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
              <Text style={[styles.word, compactMode ? styles.wordCompact : null]}>{item.kanji ?? item.kana}</Text>
              {(!compactMode || isExpanded) && (
                <>
                  <Text style={[styles.reading, compactMode ? styles.readingCompact : null]}>{item.kana}</Text>
                  <Text style={[styles.meaning, compactMode ? styles.meaningCompact : null]}>
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
  },
  title: {
    fontSize: 20,
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
  modeToggle: {
    alignItems: 'center',
  },
  modeText: {
    color: colors.muted,
    marginBottom: spacing.xs,
    fontSize: 12,
  },
  list: {
    paddingBottom: spacing.l,
  },
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
  word: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  wordCompact: {
    fontSize: 16,
  },
  reading: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  readingCompact: {
    marginTop: spacing.xs,
    fontSize: 12,
  },
  meaning: {
    marginTop: spacing.s,
    color: colors.text,
  },
  meaningCompact: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.muted,
  },
});
