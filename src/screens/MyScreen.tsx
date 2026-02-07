import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.m }]}
    >
      <View style={styles.heroCard}>
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
          <View style={[styles.heroAction, styles.heroActionLast]}>
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

      {!navSettings.nav_show_search ? (
        <Pressable style={styles.entryCard} onPress={() => navigation.navigate('Search')}>
          <View>
            <Text style={styles.entryTitle}>搜索</Text>
            <Text style={styles.entrySubtitle}>查词 / 文法</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ) : null}

      {!navSettings.nav_show_mistakes ? (
        <Pressable style={styles.entryCard} onPress={() => navigation.navigate('Mistakes')}>
          <View>
            <Text style={styles.entryTitle}>错题本</Text>
            <Text style={styles.entrySubtitle}>复习薄弱点</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ) : null}

      {!navSettings.nav_show_vocab_book ? (
        <Pressable style={styles.entryCard} onPress={() => navigation.navigate('VocabBook')}>
          <View>
            <Text style={styles.entryTitle}>生词本</Text>
            <Text style={styles.entrySubtitle}>收藏并集中复习</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ) : null}

      {!navSettings.nav_show_kana ? (
        <Pressable style={styles.entryCard} onPress={() => navigation.navigate('KanaChart')}>
          <View>
            <Text style={styles.entryTitle}>五十音图</Text>
            <Text style={styles.entrySubtitle}>平假名 / 片假名速查</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ) : null}

      {!navSettings.nav_show_verb_conjugation ? (
        <Pressable style={styles.entryCard} onPress={() => navigation.navigate('VerbConjugation')}>
          <View>
            <Text style={styles.entryTitle}>动词变形表</Text>
            <Text style={styles.entrySubtitle}>一段 / 五段 / 不规则</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ) : null}

      {!navSettings.nav_show_keigo ? (
        <Pressable style={styles.entryCard} onPress={() => navigation.navigate('KeigoChart')}>
          <View>
            <Text style={styles.entryTitle}>敬语表</Text>
            <Text style={styles.entrySubtitle}>尊敬语 / 谦让语 / 丁宁语</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ) : null}

      {!navSettings.nav_show_settings ? (
        <Pressable style={styles.entryCard} onPress={() => navigation.navigate('Settings')}>
          <View>
            <Text style={styles.entryTitle}>设置</Text>
            <Text style={styles.entrySubtitle}>发音、释义语言、题型偏好等</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ) : null}
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
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
  },
  heroTitle: {
    fontSize: 20,
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
  },
  heroAction: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.m,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.s,
  },
  heroActionLast: {
    marginRight: 0,
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
