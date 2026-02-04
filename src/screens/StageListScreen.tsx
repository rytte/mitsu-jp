import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const { level } = route.params;
  const [stages, setStages] = useState<StageRow[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

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

  useEffect(() => {
    setSelectedZone(null);
  }, [level]);

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

  useEffect(() => {
    if (selectedZone && !zones.some((zone) => zone.sectionIndex === selectedZone)) {
      setSelectedZone(null);
    }
  }, [selectedZone, zones]);

  const currentZone = selectedZone ? zones.find((zone) => zone.sectionIndex === selectedZone) ?? null : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          {selectedZone && (
            <Pressable style={styles.backButton} onPress={() => setSelectedZone(null)}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>
          )}
          <View>
            <Text style={styles.title}>
              {selectedZone ? `词库 ${level} · 第${selectedZone}区` : `词库 ${level} 分区`}
            </Text>
            {currentZone ? (
              <Text style={styles.subtitle}>
                第 {currentZone.startIndex}-{currentZone.endIndex} 关 · 完成 {currentZone.completed}/{currentZone.total} ·
                星级 {currentZone.starsSum}/{currentZone.total * 3}
              </Text>
            ) : (
              <Text style={styles.subtitle}>每 10 关为一区，点击进入查看关卡</Text>
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
      {!currentZone && (
        <FlatList
          data={zones}
          keyExtractor={(item) => `zone-${item.sectionIndex}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedZone(item.sectionIndex)}
              style={({ pressed }) => [styles.zoneCard, pressed ? styles.zoneCardPressed : null]}
            >
              <View>
                <Text style={styles.zoneTitle}>第{item.sectionIndex}区</Text>
                <Text style={styles.zoneSubtitle}>
                  第 {item.startIndex}-{item.endIndex} 关
                </Text>
                <Text style={styles.zoneMeta}>
                  完成 {item.completed}/{item.total} · 星级 {item.starsSum}/{item.total * 3}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
      {currentZone && (
        <FlatList
          data={currentZone.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerRow: {
    marginBottom: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: spacing.s,
    padding: spacing.xs,
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
  list: {
    paddingBottom: spacing.l,
  },
  zoneCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoneCardPressed: {
    opacity: 0.7,
  },
  zoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  zoneSubtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  zoneMeta: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
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

