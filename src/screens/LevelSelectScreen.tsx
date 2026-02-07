import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LEXICONS } from '../data/lexicons';
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

const LEVELS = LEXICONS;

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

  const progressPercent = stats && stats.stageCount > 0 ? Math.round((stats.completed / stats.stageCount) * 100) : 0;
  const totalAnswers = stats ? stats.correct + stats.wrong : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>学习速览</Text>
            <Text style={styles.headerSub}>
              {stats ? `已完成 ${stats.completed}/${stats.stageCount} 关` : '数据加载中'}
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{stats ? `${progressPercent}%` : '--'}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats ? totalAnswers : '--'}</Text>
            <Text style={styles.statLabel}>累计答题</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLast]}>
            <Text style={styles.statValue}>{stats ? `${accuracy}%` : '--'}</Text>
            <Text style={styles.statLabel}>正确率</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <FlatList
        data={LEVELS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleEnter(item.id)}
            style={({ pressed }) => [styles.levelCard, pressed ? styles.levelCardPressed : null]}
          >
            <View style={styles.levelInfoRow}>
              <View style={styles.levelIcon}>
                <Text style={styles.levelIconLabel}>LEVEL</Text>
                <Text style={styles.levelIconText}>{item.label}</Text>
              </View>
              <View style={styles.levelMain}>
                <View style={styles.levelTitleRow}>
                  <Text style={styles.levelTitle}>词库 {item.label}</Text>
                  {settings.lexicon_level === item.id && <Text style={styles.defaultTag}>默认</Text>}
                </View>
                <Text style={styles.levelSubtitle}>共 {item.words.length} 词</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSub: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  headerBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  headerBadgeText: {
    color: '#0369a1',
    fontWeight: '700',
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
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
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
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  levelCardPressed: {
    opacity: 0.7,
  },
  levelInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.s,
  },
  levelIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.m,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  levelIconLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#0e7490',
  },
  levelIconText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0e7490',
  },
  levelMain: {
    flex: 1,
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
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontSize: 12,
  },
  levelSubtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
});

