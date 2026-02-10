import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import { getStagesByLevel, saveProgress } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { calcStars } from '../utils/quiz';

type Props = NativeStackScreenProps<LearnStackParamList, 'Result'>;

export default function ResultScreen({ navigation, route }: Props) {
  const { stageId, level, stageIndex, zoneIndex, correct, wrong } = route.params;
  const [hasNext, setHasNext] = useState(false);
  const total = correct + wrong;
  const stars = calcStars(correct, total);
  const canGoNext = hasNext && stars >= 2;
  const nextStageIndex = stageIndex + 1;
  const nextZoneIndex = Math.floor((nextStageIndex - 1) / 10) + 1;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

  useEffect(() => {
    saveProgress(stageId, correct, wrong, stars);
  }, [correct, stageId, stars, wrong]);

  useEffect(() => {
    let active = true;
    getStagesByLevel(level).then((stages) => {
      if (!active) return;
      setHasNext(stageIndex < stages.length);
    });
    return () => {
      active = false;
    };
  }, [level, stageIndex]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.title}>闯关完成！</Text>
              <Text style={styles.subtitle}>本关答题记录</Text>
            </View>
            <View style={styles.starBadge}>
              <Text style={styles.starBadgeText}>{stars} 星</Text>
              <Ionicons name="star" size={14} color={colors.warn} />
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{correct}</Text>
              <Text style={styles.statLabel}>正确</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{wrong}</Text>
              <Text style={styles.statLabel}>错误</Text>
            </View>
            <View style={[styles.statCard, styles.statCardLast]}>
              <Text style={styles.statValue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>正确率</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${accuracy}%` }]} />
          </View>
          <Text style={styles.scoreText}>正确：{correct} / {total}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title="再来一次"
          onPress={() => navigation.replace('Quiz', { stageId, level, stageIndex, zoneIndex })}
          style={[styles.actionButton, styles.buttonSpacing]}
        />
        {canGoNext && (
          <PrimaryButton
            title="下一关"
            onPress={() =>
              navigation.replace('Quiz', {
                stageId: `${level}-${nextStageIndex}`,
                level,
                stageIndex: nextStageIndex,
                zoneIndex: nextZoneIndex,
              })
            }
            style={[styles.actionButton, styles.buttonSpacing]}
          />
        )}
        <PrimaryButton
          title="返回关卡"
          onPress={() => navigation.navigate('StageList', { level, zoneIndex })}
          style={styles.actionButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  starBadgeText: {
    color: '#b45309',
    fontWeight: '700',
    marginRight: spacing.xs,
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: spacing.m,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.m,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.s,
  },
  statCardLast: {
    marginRight: 0,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    color: colors.muted,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  progressTrack: {
    marginTop: spacing.m,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scoreText: {
    marginTop: spacing.s,
    color: colors.muted,
    fontSize: 13,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.m,
    paddingBottom: spacing.m,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  actionButton: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonSpacing: {
    marginBottom: spacing.s,
  },
});

