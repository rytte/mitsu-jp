import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import GrammarCard from '../components/GrammarCard';
import WordCard from '../components/WordCard';
import PrimaryButton from '../components/PrimaryButton';
import { clearAllGrammarMistakes, clearAllMistakes, getGrammarMistakes, getMistakeWords } from '../db/queries';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing } from '../theme';
import { GrammarPoint, Word } from '../types';
import { bumpFontScale, getGrammarFontSizes, getWordFontSizes } from '../utils/fontScale';
import { getMeaning } from '../utils/meaning';

type MistakeWord = Word & { wrong_times: number };
type MistakeGrammar = GrammarPoint & { wrong_times: number };
type Mode = 'word' | 'grammar';

export default function MistakesScreen() {
  const [mode, setMode] = useState<Mode>('word');
  const [wordMistakes, setWordMistakes] = useState<MistakeWord[]>([]);
  const [grammarMistakes, setGrammarMistakes] = useState<MistakeGrammar[]>([]);
  const meaningLanguage = useAppStore((state) => state.settings.meaning_language);
  const fontScale = useAppStore((state) => state.settings.font_scale);

  const wordFontSizes = useMemo(() => getWordFontSizes(bumpFontScale(fontScale)), [fontScale]);
  const grammarFontSizes = useMemo(() => getGrammarFontSizes(bumpFontScale(fontScale)), [fontScale]);

  const load = useCallback(() => {
    let active = true;
    getMistakeWords().then((list) => {
      if (active) setWordMistakes(list);
    });
    getGrammarMistakes().then((list) => {
      if (active) setGrammarMistakes(list);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(load);

  const handleClear = async () => {
    if (mode === 'word') {
      await clearAllMistakes();
      setWordMistakes([]);
      return;
    }
    await clearAllGrammarMistakes();
    setGrammarMistakes([]);
  };

  const showingWord = mode === 'word';
  const listEmpty = showingWord ? wordMistakes.length === 0 : grammarMistakes.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>错题本</Text>
        <PrimaryButton title="清空错题" onPress={handleClear} disabled={listEmpty} />
      </View>
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setMode('word')}
          style={[styles.toggleBtn, showingWord ? styles.toggleActive : null]}
        >
          <Text style={[styles.toggleText, showingWord ? styles.toggleTextActive : null]}>词汇</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('grammar')}
          style={[styles.toggleBtn, !showingWord ? styles.toggleActive : null]}
        >
          <Text style={[styles.toggleText, !showingWord ? styles.toggleTextActive : null]}>文法</Text>
        </Pressable>
      </View>

      {listEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>暂无错题，继续加油！</Text>
        </View>
      ) : (
        <FlatList
          data={showingWord ? wordMistakes : grammarMistakes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) =>
            showingWord ? (
              <WordCard
                word={item as MistakeWord}
                meaning={getMeaning(item as MistakeWord, meaningLanguage)}
                fontSizes={wordFontSizes}
                footer={<Text style={styles.times}>错误次数：{(item as MistakeWord).wrong_times}</Text>}
              />
            ) : (
              <GrammarCard
                grammar={item as MistakeGrammar}
                fontSizes={grammarFontSizes}
                footer={<Text style={styles.times}>错误次数：{(item as MistakeGrammar).wrong_times}</Text>}
              />
            )
          }
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
  toggleRow: {
    flexDirection: 'row',
    marginBottom: spacing.m,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.muted,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
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
