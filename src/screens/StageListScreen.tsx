import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWordLevelMeta } from '../data/levelMeta';
import { getProgressMapByLevel, getStagesByLevel, saveProgress } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { Stage } from '../types';

type Props = NativeStackScreenProps<LearnStackParamList, 'StageList'>;

type StageRow = Stage & { stars: number; locked: boolean; correctCount: number; wrongCount: number };
const SECTION_SIZE = 10;
const ENABLE_STAGE_DEBUG_UNLOCK = true;

function withOpacity(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const colorInt = Number.parseInt(normalized, 16);
  if (Number.isNaN(colorInt)) return hex;
  const r = (colorInt >> 16) & 255;
  const g = (colorInt >> 8) & 255;
  const b = colorInt & 255;
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

export default function StageListScreen({ navigation, route }: Props) {
  const { level, zoneIndex } = route.params;
  const [stages, setStages] = useState<StageRow[]>([]);
  const levelMeta = useMemo(() => getWordLevelMeta(level), [level]);
  const accentTone = useMemo(
    () => ({
      text: withOpacity(levelMeta.accent, 0.98),
      border: withOpacity(levelMeta.accent, 0.34),
      softBg: withOpacity(levelMeta.accent, 0.12),
      vocabBg: withOpacity(levelMeta.accent, 0.08),
      startBg: withOpacity(levelMeta.accent, 0.22),
      leftBorder: withOpacity(levelMeta.accent, 0.5),
    }),
    [levelMeta.accent]
  );
  const canUseStageDebugUnlock = __DEV__ && ENABLE_STAGE_DEBUG_UNLOCK;

  const reloadStages = useCallback(
    async (isActive?: () => boolean) => {
      const [list, progressMap] = await Promise.all([getStagesByLevel(level), getProgressMapByLevel(level)]);
      if (isActive && !isActive()) return;
      const rows = list.map((stage) => {
        const progress = progressMap[stage.id];
        const stars = progress?.stars ?? 0;
        const prevId = `${level}-${stage.index - 1}`;
        const prevStars = stage.index === 1 ? 3 : progressMap[prevId]?.stars ?? 0;
        return {
          ...stage,
          stars,
          locked: stage.index !== 1 && prevStars < 2,
          correctCount: progress?.correct_count ?? 0,
          wrongCount: progress?.wrong_count ?? 0,
        };
      });
      setStages(rows);
    },
    [level]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void reloadStages(() => active);
      return () => {
        active = false;
      };
    }, [reloadStages])
  );

  const handleDebugCompleteStage = useCallback(
    async (stage: StageRow) => {
      if (!canUseStageDebugUnlock) return;
      await saveProgress(stage.id, stage.correctCount, stage.wrongCount, 3);
      await reloadStages();
    },
    [canUseStageDebugUnlock, reloadStages]
  );

  const zones = useMemo(() => {
    const map = new Map<number, StageRow[]>();
    for (const stage of stages) {
      const sectionIndex = Math.floor((stage.index - 1) / SECTION_SIZE) + 1;
      const list = map.get(sectionIndex) ?? [];
      list.push(stage);
      map.set(sectionIndex, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([sectionIndex, data]) => {
        const total = data.length;
        const startIndex = data[0]?.index ?? (sectionIndex - 1) * SECTION_SIZE + 1;
        const endIndex = data[data.length - 1]?.index ?? sectionIndex * SECTION_SIZE;
        const completed = data.filter((item) => item.stars >= 1).length;
        const starsSum = data.reduce((sum, item) => sum + item.stars, 0);
        return {
          sectionIndex,
          data,
          total,
          startIndex,
          endIndex,
          completed,
          starsSum,
        };
      });
  }, [stages]);

  const currentZone = zones.find((zone) => zone.sectionIndex === zoneIndex) ?? null;

  return (
    <View style={styles.container}>
      <FlatList
        data={currentZone?.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={styles.headerTitleRow}>
                <View>
                  <View style={styles.headerBadgeRow}>
                    <Text style={styles.headerBadge}>JLPT</Text>
                    <Text style={[styles.headerBadgeLevel, { backgroundColor: levelMeta.accent }]}>{level}</Text>
                  </View>
                  <Text style={styles.title}>第{zoneIndex}区</Text>
                  {currentZone && (
                    <Text style={styles.subtitle}>
                      第 {currentZone.startIndex}-{currentZone.endIndex} 关 · 完成 {currentZone.completed}/
                      {currentZone.total} · 星级 {currentZone.starsSum}/{currentZone.total * 3}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.headerActions}>
                {currentZone && (
                  <Pressable
                    style={styles.headerAction}
                    onPress={() => {
                      const wordIds: string[] = [];
                      const seen = new Set<string>();
                      const wordStageMap: Record<string, number> = {};
                      for (const stage of currentZone.data) {
                        for (const wordId of stage.word_ids) {
                          if (seen.has(wordId)) continue;
                          seen.add(wordId);
                          wordIds.push(wordId);
                          wordStageMap[wordId] = stage.index;
                        }
                      }
                      navigation.navigate('ZoneWords', {
                        level,
                        zoneIndex: currentZone.sectionIndex,
                        startIndex: currentZone.startIndex,
                        endIndex: currentZone.endIndex,
                        wordIds,
                        wordStageMap,
                      });
                    }}
                  >
                    <Text style={styles.switchText}>本区词汇</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          stages.length > 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>未找到该分区</Text>
              <Pressable style={styles.emptyBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.emptyBtnText}>返回分区</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const stageDisplay = String(item.index).padStart(2, '0');
          return (
            <View
              style={[
                styles.card,
                { borderColor: colors.border, borderLeftColor: accentTone.leftBorder },
                item.locked ? styles.locked : null,
              ]}
            >
              {canUseStageDebugUnlock ? (
                <Pressable
                  onPress={() => {
                    void handleDebugCompleteStage(item);
                  }}
                  style={({ pressed }) => [
                    styles.stageIndexBadge,
                    { backgroundColor: accentTone.softBg, borderColor: accentTone.border },
                    pressed ? styles.stageIndexBadgePressed : null,
                  ]}
                >
                  <Text style={[styles.stageIndexText, { color: accentTone.text }]}>{stageDisplay}</Text>
                </Pressable>
              ) : (
                <View style={[styles.stageIndexBadge, { backgroundColor: accentTone.softBg, borderColor: accentTone.border }]}>
                  <Text style={[styles.stageIndexText, { color: accentTone.text }]}>{stageDisplay}</Text>
                </View>
              )}
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>第 {item.index} 关</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3].map((rank) => (
                    <Ionicons
                      key={`${item.id}-star-${rank}`}
                      name={item.stars >= rank ? 'star' : 'star-outline'}
                      size={15}
                      color={item.stars >= rank ? colors.warn : '#cbd5e1'}
                      style={styles.starIcon}
                    />
                  ))}
                  <Text style={styles.starCount}>{item.stars}/3</Text>
                </View>
              </View>
              <View style={styles.cardButtons}>
                <Pressable
                  onPress={() =>
                    navigation.navigate('StageWords', {
                      stageId: item.id,
                      level,
                      stageIndex: item.index,
                    })
                  }
                  style={({ pressed }) => [
                    styles.vocabBtn,
                    { borderColor: colors.border, backgroundColor: accentTone.vocabBg },
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={[styles.vocabBtnText, { color: colors.text }]}>词汇</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    navigation.navigate('Quiz', {
                      stageId: item.id,
                      level,
                      stageIndex: item.index,
                      zoneIndex,
                    })
                  }
                  disabled={item.locked}
                  style={({ pressed }) => [
                    styles.startBtn,
                    {
                      backgroundColor: item.locked ? '#e2e8f0' : levelMeta.accent,
                      borderColor: item.locked ? '#cbd5e1' : levelMeta.accent,
                    },
                    pressed && !item.locked ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={[styles.startBtnText, { color: item.locked ? '#64748b' : '#fff' }]}>
                    {item.locked ? '未解锁' : '开始'}
                  </Text>
                </Pressable>
              </View>
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
    paddingHorizontal: spacing.m,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  headerAction: {
    marginBottom: spacing.xs,
  },
  switchText: {
    color: colors.primary,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: '#111827',
    color: '#fff',
    fontSize: 11,
    marginRight: spacing.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerBadgeLevel: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    paddingTop: spacing.m,
    paddingBottom: spacing.l,
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
    marginBottom: spacing.m,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.l,
    borderRadius: radius.m,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderLeftWidth: 3,
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  locked: {
    opacity: 0.75,
  },
  stageIndexBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    marginRight: spacing.s,
    flexShrink: 0,
  },
  stageIndexBadgePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  stageIndexText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  cardMain: {
    flex: 1,
    marginRight: spacing.s,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  starRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  starCount: {
    marginLeft: spacing.s,
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  cardButtons: {
    width: 72,
    marginLeft: spacing.xs,
  },
  vocabBtn: {
    minHeight: 32,
    borderRadius: radius.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.s,
  },
  vocabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  startBtn: {
    minHeight: 32,
    borderRadius: radius.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
