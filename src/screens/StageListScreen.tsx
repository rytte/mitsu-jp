import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import { getProgressMapByLevel, getStagesByLevel } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { Stage } from '../types';

type Props = NativeStackScreenProps<LearnStackParamList, 'StageList'>;

type StageRow = Stage & { stars: number; locked: boolean };
const SECTION_SIZE = 10;

export default function StageListScreen({ navigation, route }: Props) {
  const { level, zoneIndex } = route.params;
  const [stages, setStages] = useState<StageRow[]>([]);

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
                    <Text style={styles.headerBadgeLevel}>{level}</Text>
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
        renderItem={({ item }) => (
          <View style={[styles.card, item.locked ? styles.locked : null]}>
            <View>
              <Text style={styles.cardTitle}>第 {item.index} 关</Text>
              <Text style={styles.cardText}>
                星级：{item.stars} <Ionicons name="star" size={14} color={colors.warn} />
              </Text>
            </View>
            <View style={styles.actions}>
              <PrimaryButton
                title="词汇"
                onPress={() =>
                  navigation.navigate('StageWords', {
                    stageId: item.id,
                    level,
                    stageIndex: item.index,
                  })
                }
                style={styles.actionBtn}
              />
              <PrimaryButton
                title={item.locked ? '未解锁' : '开始'}
                onPress={() =>
                  navigation.navigate('Quiz', {
                    stageId: item.id,
                    level,
                    stageIndex: item.index,
                  })
                }
                disabled={item.locked}
                style={[styles.actionBtn, styles.actionBtnGap]}
              />
            </View>
          </View>
        )}
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
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    minWidth: 72,
  },
  actionBtnGap: {
    marginLeft: spacing.s,
  },
  locked: {
    opacity: 0.6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  cardText: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
