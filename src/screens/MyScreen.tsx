import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getTodayStats } from '../db/queries';
import { MyStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<MyStackParamList, 'MyHome'>;

export default function MyScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [todayStats, setTodayStats] = useState<{ stages: number; last_played_at: number | null } | null>(null);
  const navSettings = useAppStore((state) => state.settings);

  const loadTodayStats = useCallback(() => {
    let active = true;
    getTodayStats().then((result) => {
      if (active) setTodayStats(result);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(loadTodayStats);

  const goToLearn = () => {
    navigation.getParent()?.navigate('Learn' as never);
  };

  const hasStudyToday = Boolean(todayStats && todayStats.stages > 0);
  const lastTimeText = todayStats?.last_played_at
    ? new Date(todayStats.last_played_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--';

  const entries = useMemo(
    () => [
      {
        key: 'search',
        title: '搜索',
        subtitle: '查词 / 文法',
        icon: 'search-outline' as const,
        accent: '#2563eb',
        accentSoft: '#dbeafe',
        onPress: () => navigation.navigate('Search'),
        visible: !navSettings.nav_show_search,
      },
      {
        key: 'mistakes',
        title: '错题本',
        subtitle: '复习薄弱点',
        icon: 'alert-circle-outline' as const,
        accent: '#f59e0b',
        accentSoft: '#fef3c7',
        onPress: () => navigation.navigate('Mistakes'),
        visible: !navSettings.nav_show_mistakes,
      },
      {
        key: 'vocab',
        title: '生词本',
        subtitle: '收藏并集中复习',
        icon: 'bookmark-outline' as const,
        accent: '#10b981',
        accentSoft: '#d1fae5',
        onPress: () => navigation.navigate('VocabBook'),
        visible: !navSettings.nav_show_vocab_book,
      },
      {
        key: 'kana',
        title: '五十音图',
        subtitle: '平假名 / 片假名速查',
        icon: 'grid-outline' as const,
        accent: '#6366f1',
        accentSoft: '#e0e7ff',
        onPress: () => navigation.navigate('KanaChart'),
        visible: !navSettings.nav_show_kana,
      },
      {
        key: 'verb',
        title: '动词变形表',
        subtitle: '一段 / 五段 / 不规则',
        icon: 'swap-horizontal-outline' as const,
        accent: '#14b8a6',
        accentSoft: '#ccfbf1',
        onPress: () => navigation.navigate('VerbConjugation'),
        visible: !navSettings.nav_show_verb_conjugation,
      },
      {
        key: 'keigo',
        title: '敬语表',
        subtitle: '尊敬语 / 谦让语 / 丁宁语',
        icon: 'chatbubbles-outline' as const,
        accent: '#ec4899',
        accentSoft: '#fce7f3',
        onPress: () => navigation.navigate('KeigoChart'),
        visible: !navSettings.nav_show_keigo,
      },
      {
        key: 'settings',
        title: '设置',
        subtitle: '发音、释义语言、题型偏好',
        icon: 'settings-outline' as const,
        accent: '#64748b',
        accentSoft: '#e2e8f0',
        onPress: () => navigation.navigate('Settings'),
        visible: !navSettings.nav_show_settings,
      },
    ],
    [
      navSettings.nav_show_search,
      navSettings.nav_show_mistakes,
      navSettings.nav_show_vocab_book,
      navSettings.nav_show_kana,
      navSettings.nav_show_verb_conjugation,
      navSettings.nav_show_keigo,
      navSettings.nav_show_settings,
      navigation,
    ]
  );

  const visibleEntries = entries.filter((item) => item.visible);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.m }]}
    >
      <View pointerEvents="none" style={styles.decorLayer}>
        <View style={styles.decorOrbPrimary} />
        <View style={styles.decorOrbSecondary} />
      </View>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroGlowAlt} />
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroTitle}>今日学习</Text>
            <Text style={styles.heroSubtitle}>
              {todayStats
                ? hasStudyToday
                  ? `已学习 ${todayStats.stages} 关`
                  : '今天还没有学习记录'
                : '数据加载中...'}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="today" size={12} color="#0369a1" />
            <Text style={styles.heroBadgeText}>今日</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <View style={styles.heroAction}>
            <Text style={styles.heroActionTitle}>{todayStats ? todayStats.stages : '--'}</Text>
            <Text style={styles.heroActionSub}>今日学习关卡</Text>
          </View>
          <View style={styles.heroAction}>
            <Text style={styles.heroActionTitle}>{lastTimeText}</Text>
            <Text style={styles.heroActionSub}>最近学习时间</Text>
          </View>
        </View>
        {!hasStudyToday ? (
          <Pressable style={styles.heroCta} onPress={goToLearn}>
            <Text style={styles.heroCtaText}>开始学习</Text>
          </Pressable>
        ) : null}
      </View>

      {visibleEntries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="sparkles" size={20} color={colors.primaryDark} />
          <Text style={styles.emptyTitle}>入口已全部固定到导航栏</Text>
          <Text style={styles.emptySubtitle}>你可以在设置里重新选择最多两个入口</Text>
        </View>
      ) : (
        visibleEntries.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.entryCard,
              { borderLeftColor: item.accent },
              pressed ? styles.entryCardPressed : null,
            ]}
          >
            <View style={styles.entryLeft}>
              <View style={[styles.entryIconWrap, { backgroundColor: item.accentSoft, borderColor: item.accent }]}>
                <Ionicons name={item.icon} size={18} color={item.accent} />
              </View>
              <View>
                <Text style={styles.entryTitle}>{item.title}</Text>
                <Text style={styles.entrySubtitle}>{item.subtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.m,
    paddingBottom: spacing.l,
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorOrbPrimary: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#dbeafe',
    opacity: 0.65,
  },
  decorOrbSecondary: {
    position: 'absolute',
    bottom: 120,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#fde68a',
    opacity: 0.35,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#bfdbfe',
    opacity: 0.7,
  },
  heroGlowAlt: {
    position: 'absolute',
    left: -50,
    bottom: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fce7f3',
    opacity: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  heroSubtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 4,
  },
  heroBadgeText: {
    color: '#0369a1',
    fontWeight: '700',
    fontSize: 11,
  },
  heroActions: {
    flexDirection: 'row',
    marginTop: spacing.m,
    gap: spacing.s,
  },
  heroAction: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.m,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  heroActionSub: {
    color: colors.muted,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  heroCta: {
    marginTop: spacing.m,
    backgroundColor: colors.primary,
    borderRadius: radius.m,
    paddingVertical: spacing.s,
    alignItems: 'center',
  },
  heroCtaText: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: spacing.s,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHint: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  emptyTitle: {
    marginTop: spacing.s,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
  },
  entryCardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  entryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  entrySubtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
