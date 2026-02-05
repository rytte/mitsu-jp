import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import WordCard from '../components/WordCard';
import PrimaryButton from '../components/PrimaryButton';
import { clearAllMistakes, getMistakeWords } from '../db/queries';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing } from '../theme';
import { Word } from '../types';
import { bumpFontScale, getWordFontSizes } from '../utils/fontScale';
import { getMeaning } from '../utils/meaning';

type MistakeWord = Word & { wrong_times: number };

export default function MistakesScreen() {
  const [mistakes, setMistakes] = useState<MistakeWord[]>([]);
  const meaningLanguage = useAppStore((state) => state.settings.meaning_language);
  const fontScale = useAppStore((state) => state.settings.font_scale);

  const fontSizes = useMemo(() => {
    return getWordFontSizes(bumpFontScale(fontScale));
  }, [fontScale]);

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
            <WordCard
              word={item}
              meaning={getMeaning(item, meaningLanguage)}
              fontSizes={fontSizes}
              footer={<Text style={styles.times}>错误次数：{item.wrong_times}</Text>}
            />
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
  times: {
    marginTop: spacing.s,
    color: colors.warn,
  },
});
