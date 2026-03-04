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
          return (
            <Pressable
              onPress={() => navigation.navigate('StageList', { level, zoneIndex: item.sectionIndex })}
              style={({ pressed }) => [styles.zoneCard, pressed ? styles.zoneCardPressed : null]}
            >
              <View>
                <View style={styles.zoneTitleRow}>
                  <Text style={styles.zoneTitle}>第{item.sectionIndex}区</Text>
                  <Text style={styles.zonePill}>{item.startIndex}-{item.endIndex}关</Text>
                </View>
                <Text style={styles.zoneMeta}>
                  完成 {item.completed}/{item.total} · 星级 {item.starsSum}/{item.total * 3}
                </Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${percent}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{percent}%</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
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
    padding: spacing.m,
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
    paddingBottom: spacing.l,
  },
  zoneCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: '#e3ebf5',
    borderLeftWidth: 3,
    borderLeftColor: '#7fb3ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  zoneCardPressed: {
    opacity: 0.85,
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
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#edf3ff',
    overflow: 'hidden',
    marginRight: spacing.s,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
    minWidth: 36,
    textAlign: 'right',
  },
});
