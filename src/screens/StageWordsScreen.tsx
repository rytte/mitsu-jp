import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import WordCard from '../components/WordCard';
import { getStage, getWordsByIds, updateSettings } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing } from '../theme';
import { Settings, Word } from '../types';
import { bumpFontScale, getWordFontSizes } from '../utils/fontScale';
import { getMeaning } from '../utils/meaning';

type Props = NativeStackScreenProps<LearnStackParamList, 'StageWords'>;

export default function StageWordsScreen({ route, navigation }: Props) {
  const { stageId, stageIndex } = route.params;
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

  const fontSizes = useMemo(() => {
    const effectiveScale = compactMode ? fontScale : bumpFontScale(fontScale);
    return getWordFontSizes(effectiveScale);
  }, [compactMode, fontScale]);

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
      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>第 {stageIndex} 关词汇</Text>
              <Text style={styles.subtitle}>共 {words.length} 个</Text>
              {compactMode && <Text style={styles.hint}>点击词条展开/收起</Text>}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedIds.has(item.id);
          return (
            <WordCard
              word={item}
              meaning={getMeaning(item, meaningLanguage)}
              compact={compactMode}
              expanded={isExpanded}
              disabled={!compactMode}
              onPress={() => toggleExpanded(item.id)}
              fontSizes={fontSizes}
            />
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
});
