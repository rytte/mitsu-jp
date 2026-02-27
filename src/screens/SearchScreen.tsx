import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { TabView } from 'react-native-tab-view';
import GrammarCard from '../components/GrammarCard';
import WordCard from '../components/WordCard';
import PrimaryButton from '../components/PrimaryButton';
import { getAllGrammars } from '../data/grammars';
import { LEXICONS } from '../data/lexicons';
import { addToVocabBook, getAllWords, updateSettings } from '../db/queries';
import { askDictionaryStreamWithAi } from '../features/ai/service';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { GrammarPoint, Level, Settings, Word } from '../types';
import { bumpFontScale, getGrammarFontSizes, getWordFontSizes } from '../utils/fontScale';
import { getMeaning } from '../utils/meaning';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type Mode = 'word' | 'grammar' | 'ai-dict';
type LevelFilter = 'ALL' | Level;

type AiDictMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

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
      grammar.explanation ?? '',
    ].join(' ')
  );
}

function scoreGrammar(grammar: GrammarPoint, query: string) {
  const needle = normalizeText(query);
  if (!needle) return 0;
  const pattern = normalizeText(grammar.pattern ?? '');
  const meaning = normalizeText(grammar.explanation ?? '');
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
  const topPadding = useScreenTopPadding();
  const [query, setQuery] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [grammars, setGrammars] = useState<GrammarPoint[]>([]);
  const [expandedWordIds, setExpandedWordIds] = useState<Set<string>>(new Set());
  const [expandedGrammarIds, setExpandedGrammarIds] = useState<Set<string>>(new Set());
  const [wordSelecting, setWordSelecting] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [aiMessages, setAiMessages] = useState<AiDictMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiFollowUp, setAiFollowUp] = useState('');
  const [aiEntry, setAiEntry] = useState('');
  const aiDictScrollRef = useRef<ScrollView | null>(null);
  const layout = useWindowDimensions();
  const routes = useMemo(
    () => [
      { key: 'word', title: '词汇' },
      { key: 'grammar', title: '文法' },
      { key: 'ai-dict', title: 'AI辞典' },
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

  useEffect(() => {
    if (tabIndex !== 0 && wordSelecting) {
      setWordSelecting(false);
      setSelectedWordIds(new Set());
    }
  }, [tabIndex, wordSelecting]);

  useEffect(() => {
    if (!wordSelecting) return;
    setWordSelecting(false);
    setSelectedWordIds(new Set());
  }, [levelFilter, query]);

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
  const mode: Mode = tabIndex === 0 ? 'word' : tabIndex === 1 ? 'grammar' : 'ai-dict';
  const totalResults = mode === 'word' ? filteredWords.length : mode === 'grammar' ? filteredGrammars.length : 0;
  const showHint = mode !== 'ai-dict' && tokens.length === 0 && !loading;
  const showEmpty = mode !== 'ai-dict' && tokens.length > 0 && totalResults === 0 && !loading;

  const wordFontSizes = useMemo(() => {
    const effective = compactMode ? fontScale : bumpFontScale(fontScale);
    return getWordFontSizes(effective);
  }, [compactMode, fontScale]);

  const grammarFontSizes = useMemo(() => {
    const effective = compactMode ? fontScale : bumpFontScale(fontScale);
    return getGrammarFontSizes(effective);
  }, [compactMode, fontScale]);

  const toggleWordExpanded = (id: string) => {
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
  };

  const toggleGrammarExpanded = (id: string) => {
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

  const toggleWordSelected = (id: string) => {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const enterWordSelection = (id: string) => {
    setWordSelecting(true);
    setSelectedWordIds(new Set([id]));
  };

  const exitWordSelection = () => {
    setWordSelecting(false);
    setSelectedWordIds(new Set());
  };

  const handleAddSelectedWords = async () => {
    const ids = Array.from(selectedWordIds);
    if (ids.length === 0) return;
    await addToVocabBook(ids);
    exitWordSelection();
  };

  const appendAiAssistantChunk = (id: string, chunk: string) => {
    if (!chunk) return;
    setAiMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, text: `${message.text}${chunk}` } : message))
    );
  };

  const handleAskAiDictionary = async () => {
    const entry = query.trim();
    if (!entry || aiLoading) return;

    const assistantMessageId = `${Date.now()}-assistant-initial`;
    setAiLoading(true);
    setAiError('');
    setAiFollowUp('');
    setAiEntry(entry);
    setAiMessages([
      {
        id: assistantMessageId,
        role: 'assistant',
        text: '',
      },
    ]);

    try {
      const text = await askDictionaryStreamWithAi({
        entry,
        onDelta: (chunk) => appendAiAssistantChunk(assistantMessageId, chunk),
      });
      const finalText = text.trim();
      if (!finalText) {
        throw new Error('AI 未返回解释内容，请稍后重试');
      }
      setAiMessages((prev) =>
        prev.map((item) => (item.id === assistantMessageId ? { ...item, text: finalText } : item))
      );
    } catch (err) {
      setAiMessages((prev) => prev.filter((item) => item.id !== assistantMessageId));
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAskAiFollowUp = async () => {
    const followUp = aiFollowUp.trim();
    const entry = aiEntry || query.trim();
    if (!entry || !followUp || aiLoading) return;

    const userMessage: AiDictMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: followUp,
    };
    const assistantMessageId = `${Date.now()}-assistant-reply`;
    const assistantPlaceholder: AiDictMessage = {
      id: assistantMessageId,
      role: 'assistant',
      text: '',
    };

    const historyForAi = aiMessages.map((item) => ({ role: item.role, text: item.text }));
    setAiMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setAiFollowUp('');
    setAiLoading(true);
    setAiError('');
    try {
      const text = await askDictionaryStreamWithAi({
        entry,
        followUp,
        history: historyForAi,
        onDelta: (chunk) => appendAiAssistantChunk(assistantMessageId, chunk),
      });
      const finalText = text.trim();
      if (!finalText) {
        throw new Error('AI 未返回解释内容，请稍后重试');
      }
      setAiMessages((prev) =>
        prev.map((item) => (item.id === assistantMessageId ? { ...item, text: finalText } : item))
      );
    } catch (err) {
      setAiMessages((prev) => prev.filter((item) => item.id !== userMessage.id && item.id !== assistantMessageId));
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
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

  const renderAiDictionaryScene = () => {
    const canAsk = query.trim().length > 0 && !aiLoading;
    const canFollowUp = aiMessages.length > 0 && aiFollowUp.trim().length > 0 && !aiLoading;
    return (
      <ScrollView
        ref={aiDictScrollRef}
        contentContainerStyle={styles.aiDictContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.aiDictIntroCard}>
          <Text style={styles.aiDictTitle}>AI 辞典</Text>
          <Text style={styles.aiDictSubtitle}>输入词汇或文法点，先获取解释，再继续追问细节。</Text>
          {aiEntry ? <Text style={styles.aiDictEntryTag}>当前词条：{aiEntry}</Text> : null}
        </View>

        <PrimaryButton
          title={aiLoading ? 'AI 解释中...' : 'AI 解释'}
          onPress={handleAskAiDictionary}
          disabled={!canAsk}
          style={styles.aiActionBtn}
        />

        {aiLoading ? (
          <View style={styles.aiLoadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.aiLoadingText}>AI 正在整理解释...</Text>
          </View>
        ) : null}

        {aiError ? (
          <View style={styles.aiErrorBox}>
            <Text style={styles.aiErrorText}>{aiError}</Text>
          </View>
        ) : null}

        {aiMessages.length > 0 ? (
          <View style={styles.aiMessagesWrap}>
            {aiMessages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <View
                  key={message.id}
                  style={[styles.aiMessageBubble, isUser ? styles.aiUserBubble : styles.aiAssistantBubble]}
                >
                  <Text style={styles.aiMessageRole}>{isUser ? '我的追问' : 'AI 解释'}</Text>
                  <Text style={styles.aiMessageText}>{message.text}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {aiMessages.length > 0 ? (
          <View style={styles.aiFollowUpBox}>
            <Text style={styles.aiFollowUpTitle}>继续追问</Text>
            <TextInput
              value={aiFollowUp}
              onChangeText={setAiFollowUp}
              onFocus={() => aiDictScrollRef.current?.scrollToEnd({ animated: true })}
              placeholder="例如：这个表达和「〜について」有什么区别？"
              placeholderTextColor={colors.muted}
              style={styles.aiFollowUpInput}
              multiline
            />
            <PrimaryButton
              title={aiLoading ? '发送中...' : '发送追问'}
              onPress={handleAskAiFollowUp}
              disabled={!canFollowUp}
              style={styles.aiFollowUpBtn}
            />
          </View>
        ) : null}
      </ScrollView>
    );
  };

  const renderScene = ({ route }: { route: { key: string } }) => {
    if (route.key === 'ai-dict') {
      return renderAiDictionaryScene();
    }
    const isWord = route.key === 'word';
    if (isWord) {
      if (filteredWords.length === 0) {
        return renderEmpty();
      }
      return (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = selectedWordIds.has(item.id);
            const handlePress = () => {
              if (wordSelecting) {
                toggleWordSelected(item.id);
                return;
              }
              if (compactMode) {
                toggleWordExpanded(item.id);
              }
            };
            const handleLongPress = () => {
              if (wordSelecting) {
                toggleWordSelected(item.id);
                return;
              }
              enterWordSelection(item.id);
            };
            return (
              <View style={styles.selectableCard}>
                <WordCard
                  word={item}
                  meaning={getMeaning(item, meaningLanguage)}
                  compact={compactMode}
                  expanded={expandedWordIds.has(item.id)}
                  disabled={false}
                  onPress={handlePress}
                  onLongPress={handleLongPress}
                  fontSizes={wordFontSizes}
                  footer={<Text style={styles.levelTag}>JLPT {item.level}</Text>}
                />
                {wordSelecting && (
                  <View style={[styles.selectionBadge, isSelected ? styles.selectionBadgeActive : null]}>
                    <Ionicons
                      name={isSelected ? 'checkmark' : 'ellipse-outline'}
                      size={14}
                      color={isSelected ? '#fff' : colors.muted}
                    />
                  </View>
                )}
              </View>
            );
          }}
        />
      );
    }

    if (filteredGrammars.length === 0) {
      return renderEmpty();
    }
    return (
      <FlatList
        data={filteredGrammars}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <GrammarCard
            grammar={item}
            compact={compactMode}
            expanded={expandedGrammarIds.has(item.id)}
            disabled={!compactMode}
            onPress={() => toggleGrammarExpanded(item.id)}
            fontSizes={grammarFontSizes}
            footer={
              item.level ? (
                <Text style={styles.levelTag}>JLPT {item.level}</Text>
              ) : (
                <Text style={styles.levelTagMuted}>未标注等级</Text>
              )
            }
          />
        )}
      />
    );
  };

  const renderTabBar = () => {
    const isWord = tabIndex === 0;
    const isGrammar = tabIndex === 1;
    const isAiDict = tabIndex === 2;
    return (
      <View style={styles.toggleRow}>
        <Pressable onPress={() => setTabIndex(0)} style={[styles.toggleBtn, isWord ? styles.toggleActive : null]}>
          <Text style={[styles.toggleText, isWord ? styles.toggleTextActive : null]}>词汇</Text>
        </Pressable>
        <Pressable onPress={() => setTabIndex(1)} style={[styles.toggleBtn, isGrammar ? styles.toggleActive : null]}>
          <Text style={[styles.toggleText, isGrammar ? styles.toggleTextActive : null]}>文法</Text>
        </Pressable>
        <Pressable onPress={() => setTabIndex(2)} style={[styles.toggleBtn, isAiDict ? styles.toggleActive : null]}>
          <Text style={[styles.toggleText, isAiDict ? styles.toggleTextActive : null]}>AI辞典</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>搜索</Text>
            <Text style={styles.subtitle}>支持假名、汉字和释义</Text>
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
            placeholder={
              mode === 'word'
                ? '搜索词汇或释义'
                : mode === 'grammar'
                  ? '搜索文法或释义'
                  : '输入词汇或文法点，点击 AI 解释'
            }
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

        {mode !== 'ai-dict' ? (
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
        ) : null}

        {tabIndex === 0 && wordSelecting ? (
          <View style={styles.selectBar}>
            <Text style={styles.selectText}>已选 {selectedWordIds.size} 个</Text>
            <View style={styles.selectActions}>
              <Pressable onPress={exitWordSelection} style={styles.selectCancel}>
                <Text style={styles.selectCancelText}>取消</Text>
              </Pressable>
              <PrimaryButton
                title="加入生词本"
                onPress={handleAddSelectedWords}
                disabled={selectedWordIds.size === 0}
                style={styles.selectBtn}
              />
            </View>
          </View>
        ) : null}

        {mode !== 'ai-dict' && tokens.length > 0 ? (
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
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
  selectBar: {
    backgroundColor: colors.card,
    borderRadius: radius.m,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.s,
  },
  selectText: {
    color: colors.text,
    fontWeight: '600',
  },
  selectActions: {
    marginTop: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  selectCancel: {
    marginRight: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
  },
  selectCancelText: {
    color: colors.muted,
    fontWeight: '600',
  },
  selectBtn: {
    paddingHorizontal: spacing.m,
  },
  selectableCard: {
    position: 'relative',
  },
  selectionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  aiDictContent: {
    paddingBottom: spacing.xl,
  },
  aiDictIntroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  aiDictTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  aiDictSubtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  aiDictEntryTag: {
    marginTop: spacing.s,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    color: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  aiActionBtn: {
    marginBottom: spacing.s,
  },
  aiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  aiLoadingText: {
    marginLeft: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  aiErrorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: radius.m,
    padding: spacing.s,
    marginBottom: spacing.s,
  },
  aiErrorText: {
    color: colors.danger,
    fontSize: 12,
  },
  aiMessagesWrap: {
    marginTop: spacing.xs,
  },
  aiMessageBubble: {
    borderWidth: 1,
    borderRadius: radius.m,
    padding: spacing.s,
    marginBottom: spacing.s,
  },
  aiAssistantBubble: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  aiUserBubble: {
    borderColor: '#d1fae5',
    backgroundColor: '#f0fdf4',
  },
  aiMessageRole: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  aiMessageText: {
    color: colors.text,
    lineHeight: 20,
    fontSize: 14,
  },
  aiFollowUpBox: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
  },
  aiFollowUpTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  aiFollowUpInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    color: colors.text,
    minHeight: 76,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    textAlignVertical: 'top',
  },
  aiFollowUpBtn: {
    marginTop: spacing.s,
  },
});
