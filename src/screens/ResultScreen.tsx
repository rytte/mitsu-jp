import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="trophy" size={22} color="#b45309" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.title}>闯关完成！</Text>
              <Text style={styles.subtitle}>第 {stageIndex} 关 · 本次成绩已保存</Text>
            </View>
            <View style={styles.starBadge}>
              <Text style={styles.starBadgeText}>{stars} 星</Text>
              <Ionicons name="star" size={14} color={colors.warn} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>本关答题概览</Text>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <View style={styles.statHead}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.statLabel}>正确</Text>
                </View>
                <Text style={styles.statValue}>{correct}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statHead}>
                  <Ionicons name="close-circle" size={14} color={colors.danger} />
                  <Text style={styles.statLabel}>错误</Text>
                </View>
                <Text style={styles.statValue}>{wrong}</Text>
              </View>
              <View style={[styles.statCard, styles.statCardLast]}>
                <View style={styles.statHead}>
                  <Ionicons name="speedometer" size={14} color={colors.primary} />
                  <Text style={styles.statLabel}>正确率</Text>
                </View>
                <Text style={styles.statValue}>{accuracy}%</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${accuracy}%` }]} />
            </View>
            <Text style={styles.scoreText}>正确：{correct} / {total}</Text>
          </View>

          {!canGoNext ? (
            <View style={styles.tipCard}>
              <Ionicons name="information-circle" size={16} color={colors.muted} />
              <Text style={styles.tipText}>达到 2 星及以上可解锁下一关</Text>
            </View>
          ) : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.s,
  },
  content: {
    flex: 1,
  },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1d6aa',
    padding: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#b45309',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: spacing.s,
  },
  card: {
    marginTop: spacing.m,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: '#e7eef7',
    shadowColor: '#64748b',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 12,
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    marginTop: spacing.s,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fbff',
    borderRadius: radius.m,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: '#dbe8f7',
    marginRight: spacing.s,
  },
  statCardLast: {
    marginRight: 0,
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    color: colors.muted,
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    marginTop: spacing.m,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#d8e6f8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scoreText: {
    marginTop: spacing.s,
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '600',
  },
  tipCard: {
    marginTop: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
  },
  tipText: {
    marginLeft: spacing.xs,
    fontSize: 12,
    color: colors.muted,
  },
  actions: {
    marginTop: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: '#e7eef7',
    padding: spacing.s,
    paddingTop: spacing.m,
    shadowColor: '#94a3b8',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionButton: {
    width: '100%',
    minHeight: 46,
    justifyContent: 'center',
  },
  buttonSpacing: {
    marginBottom: spacing.s,
  },
});
