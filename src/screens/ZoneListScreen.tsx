import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProgressMapByLevel, getStagesByLevel } from '../db/queries';
import { getWordLevelMeta } from '../data/levelMeta';
import { LearnStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { Stage } from '../types';

type Props = NativeStackScreenProps<LearnStackParamList, 'ZoneList'>;

type StageRow = Stage & { stars: number; locked: boolean };
const SECTION_SIZE = 10;

export default function ZoneListScreen({ navigation, route }: Props) {
  const { level } = route.params;
  const [stages, setStages] = useState<StageRow[]>([]);
  const levelMeta = useMemo(() => getWordLevelMeta(level), [level]);
  const tone = useMemo(
    () => ({
      cardShadow: levelMeta.accent,
      headerBorder: `${levelMeta.accent}33`,
      headerGlow: `${levelMeta.accent}0f`,
      headerOrb: `${levelMeta.accent}14`,
      actionBackground: `${levelMeta.accent}14`,
      actionBorder: `${levelMeta.accent}3d`,
      actionIcon: `${levelMeta.accent}cc`,
      statBorder: `${levelMeta.accent}29`,
      statBackground: `${levelMeta.accent}0a`,
      headerProgressTrack: `${levelMeta.accent}24`,
      pillBackground: `${levelMeta.accent}1a`,
      pillBorder: `${levelMeta.accent}33`,
      progressTrack: `${levelMeta.accent}20`,
      progressFill: levelMeta.accent,
      progressKnobBorder: `${levelMeta.accent}66`,
      doneBadgeBackground: `${levelMeta.accent}14`,
      doneBadgeBorder: `${levelMeta.accent}4d`,
    }),
    [levelMeta]
  );

  const load = useCallback(() => {
    let active = true;
    Promise.all([getStagesByLevel(level), getProgressMapByLevel(level)]).then(([list, progressMap]) => {
      if (!active) return;
      const rows = list.map((stage) => {
        const stars = progressMap[stage.id]?.stars ?? 0;
        const prevId = `${level}-${stage.index - 1}`;
        const prevStars = stage.index === 1 ? 3 : progressMap[prevId]?.stars ?? 0;
        return {
          ...stage,
          stars,
          locked: stage.index !== 1 && prevStars < 2,
        };
      });
      setStages(rows);
    });

    return () => {
      active = false;
    };
  }, [level]);

  useFocusEffect(load);

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
  const completedStages = useMemo(() => stages.filter((item) => item.stars >= 1).length, [stages]);
  const learnedWordCount = useMemo(() => {
    const learnedWordSet = new Set<string>();
    for (const stage of stages) {
      if (stage.stars < 1) continue;
      for (const wordId of stage.word_ids) {
        learnedWordSet.add(wordId);
      }
    }
    return learnedWordSet.size;
  }, [stages]);
  const totalWordCount = useMemo(() => {
    const totalWordSet = new Set<string>();
    for (const stage of stages) {
      for (const wordId of stage.word_ids) {
        totalWordSet.add(wordId);
      }
    }
    return totalWordSet.size;
  }, [stages]);
  const totalStars = useMemo(() => stages.reduce((sum, item) => sum + item.stars, 0), [stages]);
  const stagePercent = useMemo(
    () => (stages.length > 0 ? Math.round((completedStages / stages.length) * 100) : 0),
    [completedStages, stages.length]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={zones}
        keyExtractor={(item) => `zone-${item.sectionIndex}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={[styles.headerCard, { borderColor: tone.headerBorder }]}>
            <View style={[styles.headerGlow, { backgroundColor: tone.headerGlow }]} />
            <View style={[styles.headerOrbTop, { backgroundColor: tone.headerOrb }]} />
            <View style={[styles.headerOrbBottom, { backgroundColor: tone.headerOrb }]} />

            <View style={styles.headerTopRow}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>
                  <Text style={[styles.headerTitleLevel, { color: levelMeta.accent }]}>{level}</Text>
                  <Text style={styles.headerTitleWord}> 词汇</Text>
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.headerAction,
                  {
                    backgroundColor: tone.actionBackground,
                    borderColor: tone.actionBorder,
                  },
                  pressed ? styles.headerActionPressed : null,
                ]}
                onPress={() => navigation.replace('WordHome', { skipAuto: true })}
              >
                <Text style={[styles.switchText, { color: levelMeta.accent }]}>切换词库</Text>
                <Ionicons name="arrow-forward" size={14} color={tone.actionIcon} />
              </Pressable>
            </View>

            <View style={styles.headerProgressCard}>
              <View style={styles.headerProgressHead}>
                <Text style={styles.headerProgressLabel}>整体进度</Text>
                <Text style={[styles.headerProgressValue, { color: levelMeta.accent }]}>{stagePercent}%</Text>
              </View>
              <View style={[styles.headerProgressTrack, { backgroundColor: tone.headerProgressTrack }]}>
                <View
                  style={[
                    styles.headerProgressFill,
                    {
                      width: `${stagePercent}%`,
                      backgroundColor: levelMeta.accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.headerProgressHint}>已完成 {completedStages}/{stages.length || 0} 关</Text>
            </View>

            <View style={styles.headerStatsRow}>
              <View style={[styles.headerStat, { borderColor: tone.statBorder, backgroundColor: tone.statBackground }]}>
                <Text style={styles.headerStatLabel}>学习单词</Text>
                <Text style={styles.headerStatValueCompact}>
                  <Text style={[styles.headerStatNumerator, { color: levelMeta.accent }]}>
                    {learnedWordCount}
                  </Text>
                  <Text style={styles.headerStatDivider}>/</Text>
                  <Text style={styles.headerStatDenominator}>{totalWordCount}</Text>
                </Text>
              </View>
              <View style={[styles.headerStat, { borderColor: tone.statBorder, backgroundColor: tone.statBackground }]}>
                <Text style={styles.headerStatLabel}>总星数</Text>
                <Text style={styles.headerStatValueCompact}>
                  <Text style={[styles.headerStatNumerator, { color: levelMeta.accent }]}>{totalStars}</Text>
                  <Text style={styles.headerStatDivider}>/</Text>
                  <Text style={styles.headerStatDenominator}>{stages.length * 3}</Text>
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const percent = Math.round((item.completed / item.total) * 100);
          const knobPercent = Math.min(Math.max(percent, 3), 97);
          const isZoneCompleted = item.total > 0 && item.completed === item.total;
          return (
            <Pressable
              onPress={() => navigation.navigate('StageList', { level, zoneIndex: item.sectionIndex })}
              style={({ pressed }) => [
                styles.zoneCard,
                {
                  shadowColor: tone.cardShadow,
                },
                pressed ? styles.zoneCardPressed : null,
              ]}
            >
              <View style={[styles.zoneContent, isZoneCompleted ? styles.zoneContentWithBadge : null]}>
                <View style={styles.zoneTitleRow}>
                  <Text style={styles.zoneTitle}>第{item.sectionIndex}区</Text>
                  <Text
                    style={[
                      styles.zonePill,
                      {
                        backgroundColor: tone.pillBackground,
                        borderColor: tone.pillBorder,
                        color: levelMeta.accent,
                      },
                    ]}
                  >
                    {item.startIndex}-{item.endIndex}关
                  </Text>
                </View>
                <Text style={styles.zoneMeta}>
                  完成 {item.completed}/{item.total} · 星数 {item.starsSum}/{item.total * 3}
                </Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressClip, { backgroundColor: tone.progressTrack }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${percent}%`, backgroundColor: tone.progressFill },
                        ]}
                      />
                    </View>
                    <View
                      style={[
                        styles.progressKnob,
                        { left: `${knobPercent}%`, borderColor: tone.progressKnobBorder },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{percent}%</Text>
                </View>
              </View>
              {isZoneCompleted ? (
                <View
                  style={[
                    styles.doneBadge,
                    {
                      backgroundColor: tone.doneBadgeBackground,
                      borderColor: tone.doneBadgeBorder,
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={14} color={levelMeta.accent} />
                  <Text style={[styles.doneBadgeText, { color: levelMeta.accent }]}>已完成</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.m,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: '#dbe5f0',
    marginBottom: spacing.m,
    shadowColor: '#94a3b8',
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    left: -60,
    top: -90,
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  headerOrbTop: {
    position: 'absolute',
    right: -52,
    top: -36,
    width: 130,
    height: 130,
    borderRadius: 999,
  },
  headerOrbBottom: {
    position: 'absolute',
    right: 10,
    bottom: -40,
    width: 96,
    height: 96,
    borderRadius: 999,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: spacing.s,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  headerTitleLevel: {
    fontWeight: '900',
    fontStyle: 'italic',
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  headerActionPressed: {
    opacity: 0.86,
  },
  switchText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
    marginRight: 4,
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  headerStatsRow: {
    marginTop: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerStat: {
    width: '48.5%',
    backgroundColor: '#f8fafc',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: radius.m,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerStatLabel: {
    fontSize: 10,
    color: colors.muted,
  },
  headerStatValueCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  headerStatNumerator: {
    fontWeight: '800',
  },
  headerStatDivider: {
    color: colors.muted,
    fontWeight: '600',
  },
  headerStatDenominator: {
    color: colors.muted,
    fontWeight: '600',
  },
  headerProgressCard: {
    marginTop: spacing.s,
  },
  headerProgressHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerProgressLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  headerProgressValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerProgressTrack: {
    marginTop: spacing.xs,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#dbeafe',
  },
  headerProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  headerProgressHint: {
    marginTop: 6,
    fontSize: 11,
    color: colors.muted,
  },
  list: {
    paddingTop: spacing.m,
    paddingBottom: spacing.l,
  },
  zoneCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: '#e3ebf5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#64748b',
    shadowOpacity: 0.09,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    position: 'relative',
  },
  zoneCardPressed: {
    transform: [{ translateY: 1 }, { scale: 0.997 }],
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  zoneContent: {
    flex: 1,
  },
  zoneContentWithBadge: {
    paddingRight: 72,
  },
  doneBadge: {
    position: 'absolute',
    top: spacing.s,
    right: spacing.s,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneBadgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  zoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  zoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zonePill: {
    marginLeft: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#f2f7ff',
    color: '#2563eb',
    borderWidth: 1,
    borderColor: '#d6e6ff',
  },
  zoneMeta: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  progressRow: {
    marginTop: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    width: '65%',
    height: 18,
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  progressClip: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#edf3ff',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
  },
  progressKnob: {
    position: 'absolute',
    top: '50%',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#ffffff',
    transform: [{ translateX: -9 }, { translateY: -9 }],
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
    minWidth: 32,
    textAlign: 'right',
  },
});
