import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import { getProgressMapByLevel, getStagesByLevel } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { Stage } from '../types';

type Props = NativeStackScreenProps<LearnStackParamList, 'StageList'>;

type StageRow = Stage & { stars: number; locked: boolean };

export default function StageListScreen({ navigation, route }: Props) {
  const { level } = route.params;
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>等级 {level} 关卡</Text>
      <FlatList
        data={stages}
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
    marginBottom: spacing.m,
  },
  list: {
    paddingBottom: spacing.l,
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

