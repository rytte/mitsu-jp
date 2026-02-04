import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getStage, getWordsByIds } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { Word } from '../types';
import { getMeaning } from '../utils/meaning';

type Props = NativeStackScreenProps<LearnStackParamList, 'StageWords'>;

export default function StageWordsScreen({ route }: Props) {
  const { stageId, stageIndex } = route.params;
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const meaningLanguage = useAppStore((state) => state.settings.meaning_language);

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
        <Text style={styles.title}>第 {stageIndex} 关词汇</Text>
        <Text style={styles.subtitle}>共 {words.length} 个</Text>
      </View>
      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.word}>{item.kanji ?? item.kana}</Text>
            <Text style={styles.reading}>{item.kana}</Text>
            <Text style={styles.meaning}>{getMeaning(item, meaningLanguage)}</Text>
          </View>
        )}
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
  word: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  reading: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  meaning: {
    marginTop: spacing.s,
    color: colors.text,
  },
});
