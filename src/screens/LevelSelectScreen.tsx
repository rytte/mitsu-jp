import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { getStats } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { Level } from '../types';

type Props = NativeStackScreenProps<LearnStackParamList, 'LevelSelect'>;

type Stats = {
  stageCount: number;
  completed: number;
  correct: number;
  wrong: number;
};

const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function LevelSelectScreen({ navigation }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  const loadStats = useCallback(() => {
    let active = true;
    getStats().then((result) => {
      if (active) setStats(result);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(loadStats);

  const accuracy = stats
    ? stats.correct + stats.wrong === 0
      ? 0
      : Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>今日学习概览</Text>
        <Text style={styles.headerText}>完成关卡：{stats ? `${stats.completed}/${stats.stageCount}` : '--'}</Text>
        <Text style={styles.headerText}>答题准确率：{stats ? `${accuracy}%` : '--'}</Text>
      </View>

      <FlatList
        data={LEVELS}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.levelCard}>
            <View>
              <Text style={styles.levelTitle}>{item}</Text>
              <Text style={styles.levelSubtitle}>选择关卡开始闯关</Text>
            </View>
            <PrimaryButton
              title="进入"
              onPress={() => navigation.navigate('StageList', { level: item })}
            />
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
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  headerText: {
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  list: {
    paddingBottom: spacing.l,
  },
  levelCard: {
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
  levelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  levelSubtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
});

