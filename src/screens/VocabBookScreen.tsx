import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import WordCard from '../components/WordCard';
import PrimaryButton from '../components/PrimaryButton';
import { getVocabBookWords, removeFromVocabBook } from '../db/queries';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { Word } from '../types';
import { bumpFontScale, getWordFontSizes } from '../utils/fontScale';
import { getMeaning } from '../utils/meaning';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

export default function VocabBookScreen() {
  const topPadding = useScreenTopPadding();
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const settings = useAppStore((state) => state.settings);
  const meaningLanguage = settings.meaning_language;
  const compactMode = settings.compact_mode;
  const compactSingleExpand = settings.compact_single_expand;
  const fontScale = settings.font_scale;

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    getVocabBookWords().then((list) => {
      if (!active) return;
      setWords(list);
      setLoading(false);
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
    setSelecting(false);
    setSelectedIds(new Set());
  }, [words.length]);

  const fontSizes = useMemo(() => {
    const effectiveScale = compactMode ? fontScale : bumpFontScale(fontScale);
    return getWordFontSizes(effectiveScale);
  }, [compactMode, fontScale]);

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

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const enterSelection = (id: string) => {
    setSelecting(true);
    setSelectedIds(new Set([id]));
  };

  const exitSelection = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const handleRemove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await removeFromVocabBook(ids);
    exitSelection();
    load();
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>生词本加载中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {selecting ? (
        <View style={styles.selectBar}>
          <Text style={styles.selectText}>已选 {selectedIds.size} 个</Text>
          <View style={styles.selectActions}>
            <Pressable onPress={exitSelection} style={styles.selectCancel}>
              <Text style={styles.selectCancelText}>取消</Text>
            </Pressable>
            <PrimaryButton
              title="移除"
              onPress={handleRemove}
              disabled={selectedIds.size === 0}
              style={styles.selectBtn}
            />
          </View>
        </View>
      ) : null}
      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>生词本</Text>
            <Text style={styles.subtitle}>共 {words.length} 条</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>还没有生词</Text>
            <Text style={styles.emptyHint}>长按词卡加入生词本</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          const handlePress = () => {
            if (selecting) {
              toggleSelected(item.id);
              return;
            }
            if (compactMode) {
              toggleExpanded(item.id);
            }
          };
          const handleLongPress = () => {
            if (selecting) {
              toggleSelected(item.id);
              return;
            }
            enterSelection(item.id);
          };
          return (
            <View style={styles.selectableCard}>
              <WordCard
                word={item}
                meaning={getMeaning(item, meaningLanguage)}
                compact={compactMode}
                expanded={expandedIds.has(item.id)}
                disabled={false}
                onPress={handlePress}
                onLongPress={handleLongPress}
                fontSizes={fontSizes}
                shadow
              />
              {selecting && (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
  },
  list: {
    paddingBottom: spacing.l,
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
  selectBar: {
    marginTop: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radius.m,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
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
  empty: {
    alignItems: 'center',
    padding: spacing.l,
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.muted,
    fontWeight: '600',
  },
  emptyHint: {
    marginTop: spacing.xs,
    color: colors.muted,
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
});
