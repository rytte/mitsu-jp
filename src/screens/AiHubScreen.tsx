import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import { generateExamQuizWithAi } from '../features/ai/service';
import { SESSION_SIZE, sanitizeRawExamItems } from '../features/exam/examBank';
import { MyStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { BankLevel } from '../types';

type Props = NativeStackScreenProps<MyStackParamList, 'AiHub'>;

const LEVELS: BankLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function AiHubScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedLevel, setSelectedLevel] = useState<BankLevel>('N5');
  const [loading, setLoading] = useState(false);
  const [lastInfo, setLastInfo] = useState('');

  const buttonTitle = useMemo(() => {
    return loading ? 'AI 正在出题...' : `生成 ${selectedLevel} 题目并开始练习`;
  }, [loading, selectedLevel]);

  const handleGenerateExam = async () => {
    setLoading(true);
    setLastInfo('');
    try {
      const rawItems = await generateExamQuizWithAi(selectedLevel, SESSION_SIZE);
      const items = sanitizeRawExamItems(rawItems).slice(0, SESSION_SIZE);
      if (!items.length) {
        throw new Error('AI 返回题目为空或校验失败');
      }
      if (items.length < SESSION_SIZE) {
        throw new Error(`AI 仅返回 ${items.length} 题，未达到 ${SESSION_SIZE} 题要求，请重试`);
      }
      setLastInfo(`已生成 ${items.length} 题，等级 ${selectedLevel}`);
      const practiceParams = { level: selectedLevel, aiItems: items };
      const navState = navigation.getState() as { routeNames?: string[] };
      const routeNames = navState.routeNames ?? [];
      const navAny = navigation as any;

      // 1) 当前容器可直达 AI 练习页（MyStack）时直接跳转
      if (routeNames.includes('AiExamQuizPractice')) {
        navAny.navigate('AiExamQuizPractice', practiceParams);
        return;
      }

      // 2) 当前容器是 Tab 时，兜底走 MyStack 内的 AI 练习页
      if (routeNames.includes('My')) {
        navAny.navigate('My', {
          screen: 'AiExamQuizPractice',
          params: practiceParams,
        });
        return;
      }

      throw new Error('无法定位 AI 练习路由，请检查导航配置');
    } catch (error) {
      Alert.alert('AI 生题失败', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.m }]}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="sparkles" size={16} color="#7c3aed" />
          </View>
          <Text style={styles.heroTag}>AI 工作台</Text>
        </View>
        <Text style={styles.heroTitle}>AI 学习中心</Text>
        <Text style={styles.heroSub}>你可以在这里使用 AI 对话训练和生题等功能。</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>配置</Text>
          <Pressable onPress={() => navigation.navigate('AiSettings')} style={styles.linkBtn}>
            <Text style={styles.linkText}>去配置 API</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
        <Text style={styles.tip}>先完成 API 配置，再开始使用 AI 生题等功能。</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI 对话训练</Text>
        <Text style={styles.tip}>按场景进行多轮对话，获得实时纠错、提示和阶段评分。</Text>
        <PrimaryButton title="进入对话训练" onPress={() => navigation.navigate('AiConversation')} style={styles.actionBtn} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI 生题</Text>
        <Text style={styles.tip}>按等级生成与真题结构一致的 4 选 1 题目。</Text>
        <View style={styles.levelRow}>
          {LEVELS.map((level) => {
            const active = level === selectedLevel;
            return (
              <Pressable
                key={level}
                onPress={() => setSelectedLevel(level)}
                style={[styles.levelChip, active ? styles.levelChipActive : null]}
              >
                <Text style={[styles.levelChipText, active ? styles.levelChipTextActive : null]}>{level}</Text>
              </Pressable>
            );
          })}
        </View>
        <PrimaryButton title={buttonTitle} onPress={handleGenerateExam} disabled={loading} style={styles.actionBtn} />
        {lastInfo ? <Text style={styles.lastInfo}>{lastInfo}</Text> : null}
      </View>
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
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  heroIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f3ff',
    marginRight: spacing.xs,
  },
  heroTag: {
    color: '#7c3aed',
    fontWeight: '700',
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  heroSub: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  tip: {
    color: colors.muted,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.s,
  },
  levelChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  levelChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  levelChipText: {
    color: colors.muted,
    fontWeight: '600',
  },
  levelChipTextActive: {
    color: colors.primary,
  },
  actionBtn: {
    marginTop: spacing.m,
  },
  lastInfo: {
    marginTop: spacing.s,
    color: colors.muted,
  },
});
