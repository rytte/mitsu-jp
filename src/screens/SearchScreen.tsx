import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { TabView } from 'react-native-tab-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GrammarCard from '../components/GrammarCard';
import WordCard from '../components/WordCard';
import { getAllGrammars } from '../data/grammars';
import { LEXICONS } from '../data/lexicons';
import { getAllWords, updateSettings } from '../db/queries';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { GrammarPoint, Level, Settings, Word } from '../types';
import { bumpFontScale, getGrammarFontSizes, getWordFontSizes } from '../utils/fontScale';
import { getMeaning } from '../utils/meaning';

type Mode = 'word' | 'grammar';
type LevelFilter = 'ALL' | Level;

const LEVEL_ORDER: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const LEVEL_RANK = new Map<Level, number>(LEVEL_ORDER.map((level, index) => [level, index]));
const LEVEL_FILTERS: { id: LevelFilter; label: string }[] = [
  { id: 'ALL', label: '全部' },
  ...LEXICONS.map((item) => ({ id: item.id, label: item.label })),
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, '');
}

function splitTokens(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function getLevelRank(level?: Level | null) {
  if (!level) return 99;
  return LEVEL_RANK.get(level) ?? 99;
}

function buildWordHaystack(word: Word) {
  const meaningEn = word.meaning_en?.trim() ? word.meaning_en : word.meaning_cn;
  return normalizeText(
    [
      word.kana ?? '',
      word.kanji ?? '',
      word.meaning_cn ?? '',
      meaningEn ?? '',
    ].join(' ')
  );
}

function scoreWord(word: Word, query: string) {
  const needle = normalizeText(query);
  if (!needle) return 0;
  const kana = normalizeText(word.kana ?? '');
  const kanji = normalizeText(word.kanji ?? '');
  const meaningCn = normalizeText(word.meaning_cn ?? '');
  const meaningEn = normalizeText(word.meaning_en?.trim() ? word.meaning_en : word.meaning_cn ?? '');
  let score = 0;
  if (kana === needle || kanji === needle) score += 120;
  if (kana.startsWith(needle) || kanji.startsWith(needle)) score += 45;
  if (meaningCn.startsWith(needle) || meaningEn.startsWith(needle)) score += 30;
  if (kana.includes(needle) || kanji.includes(needle)) score += 16;
  if (meaningCn.includes(needle) || meaningEn.includes(needle)) score += 12;
  return score;
}

function buildGrammarHaystack(grammar: GrammarPoint) {
  return normalizeText(
    [
      grammar.pattern ?? '',
      grammar.meaning_cn ?? '',
    ].join(' ')
  );
}

function scoreGrammar(grammar: GrammarPoint, query: string) {
  const needle = normalizeText(query);
  if (!needle) return 0;
  const pattern = normalizeText(grammar.pattern ?? '');
  const meaning = normalizeText(grammar.meaning_cn ?? '');
  let score = 0;
  if (pattern === needle) score += 120;
  if (pattern.startsWith(needle)) score += 50;
  if (pattern.includes(needle)) score += 20;
  if (meaning.startsWith(needle)) score += 24;
  if (meaning.includes(needle)) score += 14;
  return score;
}

function searchWords(list: Word[], tokens: string[], query: string, level: LevelFilter) {
  if (tokens.length === 0) return [];
  const results: Array<{ item: Word; score: number }> = [];
  for (const word of list) {
    if (level !== 'ALL' && word.level !== level) continue;
    const haystack = buildWordHaystack(word);
    if (!tokens.every((token) => haystack.includes(token))) continue;
    results.push({ item: word, score: scoreWord(word, query) });
  }
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const levelDiff = getLevelRank(a.item.level) - getLevelRank(b.item.level);
    if (levelDiff !== 0) return levelDiff;
    return (a.item.kana ?? '').localeCompare(b.item.kana ?? '');
  });
  return results.map((item) => item.item);
}

function searchGrammars(list: GrammarPoint[], tokens: string[], query: string, level: LevelFilter) {
  if (tokens.length === 0) return [];
  const results: Array<{ item: GrammarPoint; score: number }> = [];
  for (const grammar of list) {
    if (level !== 'ALL' && grammar.level !== level) continue;
    const haystack = buildGrammarHaystack(grammar);
    if (!tokens.every((token) => haystack.includes(token))) continue;
    results.push({ item: grammar, score: scoreGrammar(grammar, query) });
  }
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const levelDiff = getLevelRank(a.item.level ?? null) - getLevelRank(b.item.level ?? null);
    if (levelDiff !== 0) return levelDiff;
    return (a.item.pattern ?? '').localeCompare(b.item.pattern ?? '');
  });
  return results.map((item) => item.item);
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [grammars, setGrammars] = useState<GrammarPoint[]>([]);
  const [expandedWordIds, setExpandedWordIds] = useState<Set<string>>(new Set());
  const [expandedGrammarIds, setExpandedGrammarIds] = useState<Set<string>>(new Set());
  const layout = useWindowDimensions();
  const routes = useMemo(
    () => [
      { key: 'word', title: '词汇' },
      { key: 'grammar', title: '文法' },
    ],
    []
  );

  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const meaningLanguage = settings.meaning_language;
  const compactMode = settings.compact_mode;
  const compactSingleExpand = settings.compact_single_expand;
  const fontScale = settings.font_scale;

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const list = await getAllWords();
      if (!active) return;
      setWords(list);
      setGrammars(getAllGrammars());
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!compactMode) {
      setExpandedWordIds(new Set());
      setExpandedGrammarIds(new Set());
    }
  }, [compactMode]);

  useEffect(() => {
    if (!compactMode || !compactSingleExpand || expandedWordIds.size <= 1) return;
    const lastExpanded = Array.from(expandedWordIds).pop();
    setExpandedWordIds(lastExpanded ? new Set([lastExpanded]) : new Set());
  }, [compactMode, compactSingleExpand, expandedWordIds]);

  useEffect(() => {
    if (!compactMode || !compactSingleExpand || expandedGrammarIds.size <= 1) return;
    const lastExpanded = Array.from(expandedGrammarIds).pop();
    setExpandedGrammarIds(lastExpanded ? new Set([lastExpanded]) : new Set());
  }, [compactMode, compactSingleExpand, expandedGrammarIds]);

  const persistSettings = async (next: Settings) => {
    setSettings(next);
    await updateSettings(next);
  };

  const toggleCompactMode = async (value: boolean) => {
    await persistSettings({ ...settings, compact_mode: value });
  };

  const tokens = useMemo(() => splitTokens(query), [query]);
  const filteredWords = useMemo(() => searchWords(words, tokens, query, levelFilter), [levelFilter, query, tokens, words]);
  const filteredGrammars = useMemo(
    () => searchGrammars(grammars, tokens, query, levelFilter),
    [grammars, levelFilter, query, tokens]
  );
  const mode: Mode = tabIndex === 0 ? 'word' : 'grammar';
  const totalResults = mode === 'word' ? filteredWords.length : filteredGrammars.length;
  const showHint = tokens.length === 0 && !loading;
  const showEmpty = tokens.length > 0 && totalResults === 0 && !loading;

  const wordFontSizes = useMemo(() => {
    const effective = compactMode ? fontScale : bumpFontScale(fontScale);
    return getWordFontSizes(effective);
  }, [compactMode, fontScale]);

  const grammarFontSizes = useMemo(() => {
    const effective = compactMode ? fontScale : bumpFontScale(fontScale);
    return getGrammarFontSizes(effective);
  }, [compactMode, fontScale]);

  const toggleExpanded = (id: string) => {
    if (mode === 'word') {
      setExpandedWordIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else if (compactMode && compactSingleExpand) {
          return new Set([id]);
        } else {
          next.add(id);
        }
        return next;
      });
      return;
    }
    setExpandedGrammarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (compactMode && compactSingleExpand) {
        return new Set([id]);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>搜索索引加载中...</Text>
        </View>
      );
    }
    if (showHint) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>输入关键词开始搜索</Text>
          <Text style={styles.emptyHint}>例如：食べる / てしまう / 重要</Text>
        </View>
      );
    }
    if (showEmpty) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>没有找到匹配结果</Text>
          <Text style={styles.emptyHint}>试试更短的词或切换等级</Text>
        </View>
      );
    }
    return null;
  };

  const renderScene = ({ route }: { route: { key: string } }) => {
    const isWord = route.key === 'word';
    const data = isWord ? filteredWords : filteredGrammars;
    if (data.length === 0) {
      return renderEmpty();
    }
    return (
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) =>
          isWord ? (
            <WordCard
              word={item as Word}
              meaning={getMeaning(item as Word, meaningLanguage)}
              compact={compactMode}
              expanded={expandedWordIds.has((item as Word).id)}
              disabled={!compactMode}
              onPress={() => toggleExpanded((item as Word).id)}
              fontSizes={wordFontSizes}
              footer={<Text style={styles.levelTag}>JLPT {item.level}</Text>}
            />
          ) : (
            <GrammarCard
              grammar={item as GrammarPoint}
              compact={compactMode}
              expanded={expandedGrammarIds.has((item as GrammarPoint).id)}
              disabled={!compactMode}
              onPress={() => toggleExpanded((item as GrammarPoint).id)}
              fontSizes={grammarFontSizes}
              footer={
                item.level ? (
                  <Text style={styles.levelTag}>JLPT {item.level}</Text>
                ) : (
                  <Text style={styles.levelTagMuted}>未标注等级</Text>
                )
              }
            />
          )
        }
      />
    );
  };

  const renderTabBar = () => {
    const isWord = tabIndex === 0;
    return (
      <View style={styles.toggleRow}>
        <Pressable onPress={() => setTabIndex(0)} style={[styles.toggleBtn, isWord ? styles.toggleActive : null]}>
          <Text style={[styles.toggleText, isWord ? styles.toggleTextActive : null]}>词汇</Text>
        </Pressable>
        <Pressable onPress={() => setTabIndex(1)} style={[styles.toggleBtn, !isWord ? styles.toggleActive : null]}>
          <Text style={[styles.toggleText, !isWord ? styles.toggleTextActive : null]}>文法</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.m }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>搜索</Text>
            <Text style={styles.subtitle}>支持假名、汉字、释义、用法与标签</Text>
          </View>
          <View style={styles.compactToggle}>
            <Text style={styles.compactLabel}>紧凑</Text>
            <Switch value={compactMode} onValueChange={toggleCompactMode} trackColor={{ false: colors.border, true: colors.primary }} />
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={mode === 'word' ? '搜索词汇、读音或释义' : '搜索文法、用法或释义'}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {renderTabBar()}

        <View style={styles.filterRow}>
          {LEVEL_FILTERS.map((item) => {
            const active = levelFilter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setLevelFilter(item.id)}
                style={[styles.filterChip, active ? styles.filterChipActive : null]}
              >
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tokens.length > 0 ? (
          <Text style={styles.resultText}>
            {mode === 'word' ? '词汇' : '文法'}结果：{totalResults} 条
          </Text>
        ) : null}
      </View>
      <TabView
        navigationState={{ index: tabIndex, routes }}
        onIndexChange={setTabIndex}
        renderScene={renderScene}
        renderTabBar={() => null}
        initialLayout={{ width: layout.width }}
        style={styles.tabView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.m,
  },
  list: {
    paddingBottom: spacing.l,
  },
  header: {
    marginBottom: spacing.m,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  compactToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    marginBottom: spacing.m,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.s,
    color: colors.text,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: spacing.s,
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.s,
  },
  filterChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
  },
  filterText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0369a1',
  },
  resultText: {
    color: colors.muted,
    fontSize: 12,
  },
  tabView: {
    flex: 1,
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.l,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.muted,
    marginTop: spacing.s,
  },
  emptyHint: {
    color: colors.muted,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  levelTag: {
    marginTop: spacing.s,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: '#eef2ff',
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
  levelTagMuted: {
    marginTop: spacing.s,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: colors.background,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
});
