import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEXICONS } from '../data/lexicons';
import { getWordLevelMeta } from '../data/levelMeta';
import { getStats, updateSettings } from '../db/queries';
import { LearnStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { Level, Settings } from '../types';

type Props = NativeStackScreenProps<LearnStackParamList, 'WordHome'>;

type Stats = {
  stageCount: number;
  completed: number;
  correct: number;
  wrong: number;
};

const LEVELS = LEXICONS;

export default function WordScreen({ navigation, route }: Props) {
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
      if (skipAuto || suppressAuto || autoEntered || !settings.lexicon_auto_enter) return () => {};
      const targetLevel = settings.lexicon_level;
      if (targetLevel) {
        setAutoEntered(true);
        navigation.replace('ZoneList', { level: targetLevel });
      }
      return () => {};
    }, [autoEntered, navigation, settings.lexicon_auto_enter, settings.lexicon_level, skipAuto, suppressAuto])
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

  const handleAutoEnterToggle = async (value: boolean) => {
    if (!value) {
      setAutoEntered(false);
    }
    await persistSettings({ ...settings, lexicon_auto_enter: value });
  };

  const accuracy = stats
    ? stats.correct + stats.wrong === 0
      ? 0
      : Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
    : 0;

  const progressPercent = stats && stats.stageCount > 0 ? Math.round((stats.completed / stats.stageCount) * 100) : 0;
  const totalAnswers = stats ? stats.correct + stats.wrong : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={LEVELS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <>
            <View style={styles.headerCard}>
              <View style={styles.headerTop}>
                <View style={styles.headerTitleWrap}>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.headerTitle}>词汇训练面板</Text>
                    <Ionicons name="analytics-outline" size={25} color="#9a3412" />
                  </View>
                  <Text style={styles.headerSub}>
                    {stats ? `已完成 ${stats.completed}/${stats.stageCount} 关` : '数据加载中'}
                  </Text>
                </View>
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeLabel}>完成度</Text>
                  <Text style={styles.headerBadgeText}>{stats ? `${progressPercent}%` : '--'}</Text>
                </View>
              </View>

              <View style={styles.headerDivider} />

              <View style={styles.statRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats ? totalAnswers : '--'}</Text>
                  <Text style={styles.statLabel}>累计答题</Text>
                </View>
                <View style={[styles.statCard, styles.statCardAlt, styles.statCardLast]}>
                  <Text style={styles.statValue}>{stats ? `${accuracy}%` : '--'}</Text>
                  <Text style={styles.statLabel}>正确率</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <View style={styles.progressMetaRow}>
                <Text style={styles.progressMetaText}>总进度</Text>
                <Text style={styles.progressMetaValue}>{stats ? `${progressPercent}%` : '--'}</Text>
              </View>
            </View>

            <View style={styles.autoEnterPanel}>
              <View style={styles.autoEnterRow}>
                <View style={styles.autoEnterTextWrap}>
                  <Text style={styles.autoEnterTitle}>默认跳转词库</Text>
                  <Text style={styles.autoEnterHint}>开启后进入此页会自动跳到上次选择的词库等级</Text>
                </View>
                <Switch
                  value={settings.lexicon_auto_enter}
                  onValueChange={handleAutoEnterToggle}
                  trackColor={{ false: '#cbd5e1', true: '#5eead4' }}
                  thumbColor={settings.lexicon_auto_enter ? '#0f766e' : '#f8fafc'}
                />
              </View>
            </View>
          </>
        )}
        renderItem={({ item }) => {
          const meta = getWordLevelMeta(item.id);
          const isCurrent = settings.lexicon_level === item.id;
          return (
            <Pressable
              onPress={() => handleEnter(item.id)}
              style={({ pressed }) => [
                styles.levelCard,
                { borderColor: meta.soft, borderLeftColor: meta.accent },
                pressed ? styles.levelCardPressed : null,
              ]}
            >
              <View style={[styles.levelBadge, { backgroundColor: meta.soft, borderColor: meta.accent }]}>
                <Text style={[styles.levelBadgeLabel, { color: meta.accent }]}>VOCAB</Text>
                <Text style={[styles.levelBadgeValue, { color: meta.accent }]}>{item.label}</Text>
              </View>
              <View style={styles.levelInfo}>
                <View style={styles.levelTitleRow}>
                  <Text style={styles.levelTitle}>{item.label} 词汇</Text>
                  <Text style={[styles.levelTag, { backgroundColor: meta.soft, color: meta.accent }]}>{meta.tag}</Text>
                  {isCurrent ? <Text style={styles.levelCurrentTag}>当前</Text> : null}
                </View>
                <Text style={styles.levelHint}>{meta.hint}</Text>
                <Text style={styles.levelCount}>共 {item.words.length} 词</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerCard: {
    backgroundColor: '#fff9ef',
    borderRadius: radius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: '#f4d6a8',
    borderLeftWidth: 5,
    borderLeftColor: '#b45309',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: spacing.s,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7c2d12',
  },
  headerSub: {
    color: '#9a3412',
    marginTop: spacing.xs,
    fontSize: 13,
  },
  headerBadge: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#fdba74',
    alignItems: 'center',
    minWidth: 64,
  },
  headerBadgeLabel: {
    color: '#9a3412',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 1,
  },
  headerBadgeText: {
    color: '#c2410c',
    fontWeight: '800',
    fontSize: 14,
  },
  headerDivider: {
    marginTop: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  autoEnterPanel: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    marginBottom: spacing.m,
  },
  autoEnterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  autoEnterTextWrap: {
    flex: 1,
    paddingRight: spacing.s,
  },
  autoEnterTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  autoEnterHint: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: spacing.m,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff7ed',
    borderRadius: radius.m,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginRight: spacing.s,
  },
  statCardAlt: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statCardLast: {
    marginRight: 0,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7c2d12',
  },
  statLabel: {
    color: '#92400e',
    marginTop: spacing.xs,
    fontSize: 12,
  },
  progressTrack: {
    marginTop: spacing.m,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#fde68a',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#c2410c',
  },
  progressMetaRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressMetaText: {
    color: '#92400e',
    fontSize: 11,
  },
  progressMetaValue: {
    color: '#c2410c',
    fontSize: 12,
    fontWeight: '800',
  },
  list: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.l,
  },
  levelCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: spacing.m,
    padding: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelCardPressed: {
    opacity: 0.88,
  },
  levelBadge: {
    width: 58,
    height: 58,
    borderRadius: radius.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
  },
  levelBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  levelBadgeValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
  },
  levelInfo: {
    flex: 1,
    marginRight: spacing.s,
  },
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  levelTag: {
    marginLeft: spacing.s,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  levelCurrentTag: {
    marginLeft: spacing.s,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  levelHint: {
    marginTop: spacing.xs,
    color: '#475569',
    fontSize: 12,
  },
  levelCount: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
  },
});

