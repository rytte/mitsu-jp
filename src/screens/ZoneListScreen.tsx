import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  return (
    <View style={styles.container}>
      <FlatList
        data={zones}
        keyExtractor={(item) => `zone-${item.sectionIndex}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View>
                <View style={styles.headerBadgeRow}>
                  <Text style={styles.headerBadge}>JLPT</Text>
                  <Text style={[styles.headerBadgeLevel, { backgroundColor: levelMeta.accent }]}>
                    {level}
                  </Text>
                </View>
                <Text style={styles.title}>分区列表</Text>
                <Text style={styles.subtitle}>每 10 关为一区，点击进入查看关卡</Text>
              </View>
              <Pressable style={styles.headerAction} onPress={() => navigation.replace('Word', { skipAuto: true })}>
                <Text style={styles.switchText}>切换词库</Text>
              </Pressable>
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
                  完成 {item.completed}/{item.total} · 星级 {item.starsSum}/{item.total * 3}
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
