import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { getStats, updateSettings } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { Level, Settings } from '../types';

type Props = NativeStackScreenProps<LearnStackParamList, 'LevelSelect'>;

type Stats = {
  stageCount: number;
  completed: number;
  correct: number;
  wrong: number;
};

const LEVELS: Level[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function LevelSelectScreen({ navigation, route }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const [autoEntered, setAutoEntered] = useState(false);
  const [suppressAuto, setSuppressAuto] = useState(false);

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

  const skipAuto = route.params?.skipAuto === true;

  useEffect(() => {
    if (skipAuto) {
      setSuppressAuto(true);
      navigation.setParams({ skipAuto: false });
    }
  }, [navigation, skipAuto]);

  useFocusEffect(
    useCallback(() => {
      if (skipAuto || suppressAuto || autoEntered) return () => {};
      const targetLevel = settings.lexicon_level;
      if (targetLevel) {
        setAutoEntered(true);
        navigation.replace('ZoneList', { level: targetLevel });
      }
      return () => {};
    }, [autoEntered, navigation, settings.lexicon_level, skipAuto, suppressAuto])
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        setAutoEntered(false);
        setSuppressAuto(false);
      };
    }, [])
  );

  const persistSettings = async (next: Settings) => {
    setSettings(next);
    await updateSettings(next);
  };

  const handleEnter = async (level: Level) => {
    if (settings.lexicon_level !== level) {
      await persistSettings({ ...settings, lexicon_level: level });
    }
    navigation.navigate('ZoneList', { level });
  };

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
              <View style={styles.levelTitleRow}>
                <Text style={styles.levelTitle}>词库 {item}</Text>
                {settings.lexicon_level === item && <Text style={styles.defaultTag}>默认</Text>}
              </View>
              <Text style={styles.levelSubtitle}>选择词库进入关卡</Text>
            </View>
            <PrimaryButton title="进入" onPress={() => handleEnter(item)} />
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
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultTag: {
    marginLeft: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: colors.border,
    color: colors.muted,
    fontSize: 12,
  },
  levelSubtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
});

