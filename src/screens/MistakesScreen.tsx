import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { clearAllMistakes, getMistakeWords } from '../db/queries';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { Word } from '../types';
import { getMeaning } from '../utils/meaning';

type MistakeWord = Word & { wrong_times: number };

export default function MistakesScreen() {
  const [mistakes, setMistakes] = useState<MistakeWord[]>([]);
  const meaningLanguage = useAppStore((state) => state.settings.meaning_language);

  const load = useCallback(() => {
    let active = true;
    getMistakeWords().then((list) => {
      if (active) setMistakes(list);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(load);

  const handleClear = async () => {
    await clearAllMistakes();
    setMistakes([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>错题本</Text>
        <PrimaryButton title="清空错题" onPress={handleClear} disabled={!mistakes.length} />
      </View>
      {mistakes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>暂无错题，继续加油！</Text>
        </View>
      ) : (
        <FlatList
          data={mistakes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.word}>{item.kanji ?? item.kana}</Text>
              <Text style={styles.reading}>{item.kana}</Text>
              <Text style={styles.meaning}>{getMeaning(item, meaningLanguage)}</Text>
              <Text style={styles.times}>错误次数：{item.wrong_times}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
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
  times: {
    marginTop: spacing.s,
    color: colors.warn,
  },
});
