import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { TabView } from 'react-native-tab-view';
import GrammarCard from '../components/GrammarCard';
import WordCard from '../components/WordCard';
import PrimaryButton from '../components/PrimaryButton';
import {
  addToVocabBook,
  clearAllGrammarMistakes,
  clearAllMistakes,
  getGrammarMistakes,
  getMistakeWords,
  updateSettings,
} from '../db/queries';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing } from '../theme';
import { GrammarPoint, Settings, Word } from '../types';
import { bumpFontScale, getGrammarFontSizes, getWordFontSizes } from '../utils/fontScale';
import { getMeaning } from '../utils/meaning';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type MistakeWord = Word & { wrong_times: number };
type MistakeGrammar = GrammarPoint & { wrong_times: number };
type Mode = 'word' | 'grammar';

export default function MistakesScreen() {
  const topPadding = useScreenTopPadding({ base: 0 });
  const [tabIndex, setTabIndex] = useState(0);
  const [wordMistakes, setWordMistakes] = useState<MistakeWord[]>([]);
  const [grammarMistakes, setGrammarMistakes] = useState<MistakeGrammar[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [wordSelecting, setWordSelecting] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const layout = useWindowDimensions();
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const meaningLanguage = useAppStore((state) => state.settings.meaning_language);
  const fontScale = useAppStore((state) => state.settings.font_scale);
  const compactMode = settings.compact_mode;
  const compactSingleExpand = settings.compact_single_expand;
  const routes = useMemo(
    () => [
      { key: 'word', title: '词汇' },
      { key: 'grammar', title: '文法' },
    ],
    []
  );

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

  useEffect(() => {
    if (!compactMode) {
      setExpandedIds(new Set());
    }
  }, [compactMode]);

  useEffect(() => {
    if (!compactMode || !compactSingleExpand || expandedIds.size <= 1) return;
    const lastExpanded = Array.from(expandedIds).pop();
    setExpandedIds(lastExpanded ? new Set([lastExpanded]) : new Set());
  }, [compactMode, compactSingleExpand, expandedIds]);

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
  }, [wordMistakes.length]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (compactMode && compactSingleExpand) {
          return new Set([id]);
        }
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

  const handleAddSelected = async () => {
    const ids = Array.from(selectedWordIds);
    if (ids.length === 0) return;
    await addToVocabBook(ids);
    exitWordSelection();
  };

  const persistSettings = async (next: Settings) => {
    setSettings(next);
    await updateSettings(next);
  };

  const toggleCompactMode = async (value: boolean) => {
    await persistSettings({ ...settings, compact_mode: value });
  };

  const mode: Mode = tabIndex === 0 ? 'word' : 'grammar';

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

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>暂无错题，继续加油！</Text>
    </View>
  );

  const renderScene = ({ route }: { route: { key: string } }) => {
    const isWord = route.key === 'word';
    if (isWord) {
      if (wordMistakes.length === 0) {
        return renderEmpty();
      }
      return (
        <FlatList
          data={wordMistakes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const word = item;
            const isSelected = selectedWordIds.has(word.id);
            const handlePress = () => {
              if (wordSelecting) {
                toggleWordSelected(word.id);
                return;
              }
              if (compactMode) {
                toggleExpanded(word.id);
              }
            };
            const handleLongPress = () => {
              if (wordSelecting) {
                toggleWordSelected(word.id);
                return;
              }
              enterWordSelection(word.id);
            };
            return (
              <View style={styles.selectableCard}>
                <WordCard
                  word={word}
                  meaning={getMeaning(word, meaningLanguage)}
                  fontSizes={wordFontSizes}
                  compact={compactMode}
                  expanded={expandedIds.has(word.id)}
                  disabled={false}
                  onPress={handlePress}
                  onLongPress={handleLongPress}
                  footer={<Text style={styles.times}>错误次数：{word.wrong_times}</Text>}
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

    if (grammarMistakes.length === 0) {
      return renderEmpty();
    }

    return (
      <FlatList
        data={grammarMistakes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <GrammarCard
            grammar={item}
            compact={compactMode}
            fontSizes={grammarFontSizes}
            expanded={expandedIds.has(item.id)}
            disabled={!compactMode}
            onPress={() => toggleExpanded(item.id)}
            footer={<Text style={styles.times}>错误次数：{item.wrong_times}</Text>}
          />
        )}
      />
    );
  };

  const renderTabBar = useCallback(() => {
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
  }, [tabIndex]);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>错题本</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => toggleCompactMode(!compactMode)} style={styles.compactToggle}>
            <Text style={styles.compactLabel}>紧凑</Text>
            <Switch
              value={compactMode}
              onValueChange={toggleCompactMode}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </Pressable>
          <PrimaryButton title="清空错题" onPress={handleClear} disabled={listEmpty} style={styles.clearBtn} />
        </View>
      </View>
      {tabIndex === 0 && wordSelecting ? (
        <View style={styles.selectBar}>
          <Text style={styles.selectText}>已选 {selectedWordIds.size} 个</Text>
          <View style={styles.selectActions}>
            <Pressable onPress={exitWordSelection} style={styles.selectCancel}>
              <Text style={styles.selectCancelText}>取消</Text>
            </Pressable>
            <PrimaryButton
              title="加入生词本"
              onPress={handleAddSelected}
              disabled={selectedWordIds.size === 0}
              style={styles.selectBtn}
            />
          </View>
        </View>
      ) : null}
      <TabView
        navigationState={{ index: tabIndex, routes }}
        onIndexChange={setTabIndex}
        initialLayout={{ width: layout.width }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.s,
  },
  compactLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginRight: spacing.xs,
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
  tabView: {
    flex: 1,
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
  selectBar: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
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
  times: {
    marginTop: spacing.s,
    color: colors.warn,
  },
  clearBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.m,
  },
});
