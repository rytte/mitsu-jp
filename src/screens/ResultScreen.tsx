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
      <View style={styles.card}>
        <Text style={styles.title}>闯关完成！</Text>
        <Text style={styles.score}>正确：{correct} / {total}</Text>
        <Text style={styles.score}>
          星级：{stars} <Ionicons name="star" size={14} color={colors.warn} />
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title="再来一次"
          onPress={() => navigation.replace('Quiz', { stageId, level, stageIndex, zoneIndex })}
          style={styles.buttonSpacing}
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
            style={styles.buttonSpacing}
          />
        )}
        <PrimaryButton title="返回关卡" onPress={() => navigation.navigate('StageList', { level, zoneIndex })} />
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.l,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.l,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.m,
  },
  score: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: spacing.s,
  },
  actions: {
    marginTop: 0,
  },
  buttonSpacing: {
    marginBottom: spacing.s,
  },
});

