import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { generateExamQuizWithAi, generateSentenceAssembleWithAi } from '../features/ai/service';
import { loadAiTokenUsageStats } from '../features/ai/storage';
import { SESSION_SIZE, sanitizeRawExamItems } from '../features/exam/examBank';
import { AiHubStackParamList, MyStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { BankLevel } from '../types';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type AiHubScreenParamList = MyStackParamList & AiHubStackParamList;
type Props = NativeStackScreenProps<AiHubScreenParamList, 'AiHub' | 'AiHubHome'>;

const LEVELS: BankLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
type HubActionTone = 'indigo' | 'teal' | 'amber' | 'sky' | 'violet';

type HubActionButtonProps = {
  title: string;
  tone: HubActionTone;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

function HubActionButton({ title, tone, onPress, disabled, style }: HubActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.hubActionBtn,
        tone === 'indigo'
          ? styles.hubActionBtnIndigo
          : tone === 'teal'
          ? styles.hubActionBtnTeal
          : tone === 'amber'
          ? styles.hubActionBtnAmber
          : tone === 'violet'
          ? styles.hubActionBtnViolet
          : styles.hubActionBtnSky,
        pressed && !disabled ? styles.hubActionBtnPressed : null,
        disabled ? styles.hubActionBtnDisabled : null,
        style,
      ]}
    >
      <Text style={styles.hubActionTitle}>{title}</Text>
    </Pressable>
  );
}

export default function AiHubScreen({ navigation }: Props) {
  const topPadding = useScreenTopPadding({ mode: 'always-safe' });
  const [selectedLevel, setSelectedLevel] = useState<BankLevel>('N5');
  const [loading, setLoading] = useState(false);
  const [selectedSentenceLevel, setSelectedSentenceLevel] = useState<BankLevel>('N5');
  const [sentenceLoading, setSentenceLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({
    input_tokens: 0,
    cached_input_tokens: 0,
    output_tokens: 0,
  });

  const buttonTitle = useMemo(() => {
    return loading ? 'AI 正在出题...' : `生成 ${selectedLevel} 题目并开始练习`;
  }, [loading, selectedLevel]);
  const sentenceButtonTitle = useMemo(() => {
    return sentenceLoading ? 'AI 正在出题...' : `生成 ${selectedSentenceLevel} 连词成句并开始练习`;
  }, [selectedSentenceLevel, sentenceLoading]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadAiTokenUsageStats()
        .then((stats) => {
          if (!active) return;
          setTokenUsage({
            input_tokens: stats.input_tokens,
            cached_input_tokens: stats.cached_input_tokens,
            output_tokens: stats.output_tokens,
          });
        })
        .catch(() => {
          if (!active) return;
          setTokenUsage({
            input_tokens: 0,
            cached_input_tokens: 0,
            output_tokens: 0,
          });
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const formatToken = (value: number) => {
    const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
    return safe.toLocaleString('zh-CN');
  };
  const totalTokens = tokenUsage.input_tokens + tokenUsage.cached_input_tokens + tokenUsage.output_tokens;
  const usageItems = useMemo(
    () => [
      { key: 'input', label: '输入 Tokens', value: formatToken(tokenUsage.input_tokens), tone: 'blue' as const },
      { key: 'cache', label: '缓存 Tokens', value: formatToken(tokenUsage.cached_input_tokens), tone: 'green' as const },
      { key: 'output', label: '输出 Tokens', value: formatToken(tokenUsage.output_tokens), tone: 'orange' as const },
      { key: 'total', label: '总 Tokens', value: formatToken(totalTokens), tone: 'slate' as const },
    ],
    [tokenUsage.cached_input_tokens, tokenUsage.input_tokens, tokenUsage.output_tokens, totalTokens]
  );

  const navigateToAiPractice = (
    routeName: 'AiExamQuizPractice' | 'AiSentenceAssemblePractice' | 'AiListeningPractice',
    params?: object
  ) => {
    const navState = navigation.getState() as { routeNames?: string[] };
    const routeNames = navState.routeNames ?? [];
    const navAny = navigation as any;

    // 1) 当前容器可直达 AI 练习页（MyStack）时直接跳转
    if (routeNames.includes(routeName)) {
      if (params) {
        navAny.navigate(routeName, params);
      } else {
        navAny.navigate(routeName);
      }
      return;
    }

    // 2) 当前容器是 Tab 时，兜底走 MyStack 内的对应练习页
    if (routeNames.includes('My')) {
      navAny.navigate('My', params ? { screen: routeName, params } : { screen: routeName });
      return;
    }

    throw new Error('无法定位 AI 练习路由，请检查导航配置');
  };

  const handleGenerateExam = async () => {
    setLoading(true);
    try {
      const rawItems = await generateExamQuizWithAi(selectedLevel, SESSION_SIZE);
      const items = sanitizeRawExamItems(rawItems).slice(0, SESSION_SIZE);
      if (!items.length) {
        throw new Error('AI 返回题目为空或校验失败');
      }
      if (items.length < SESSION_SIZE) {
        throw new Error(`AI 仅返回 ${items.length} 题，未达到 ${SESSION_SIZE} 题要求，请重试`);
      }
      navigateToAiPractice('AiExamQuizPractice', { level: selectedLevel, aiItems: items });
    } catch (error) {
      Alert.alert('AI 生题失败', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSentenceAssemble = async () => {
    setSentenceLoading(true);
    try {
      const items = await generateSentenceAssembleWithAi(selectedSentenceLevel, SESSION_SIZE);
      if (!items.length) {
        throw new Error('AI 返回题目为空或校验失败');
      }
      if (items.length < SESSION_SIZE) {
        throw new Error(`AI 仅返回 ${items.length} 题，未达到 ${SESSION_SIZE} 题要求，请重试`);
      }
      navigateToAiPractice('AiSentenceAssemblePractice', { level: selectedSentenceLevel, aiItems: items });
    } catch (error) {
      Alert.alert('AI 连词成句生题失败', error instanceof Error ? error.message : String(error));
    } finally {
      setSentenceLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroTagWrap}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="sparkles" size={16} color="#7c3aed" />
            </View>
            <Text style={styles.heroTag}>AI 工作台</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>AI 学习中心</Text>
        <Text style={styles.heroSub}>你可以在这里使用 AI 场景对话和生题等功能。</Text>
        <View style={styles.heroBottomRow}>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaChip}>
              <Text style={styles.heroMetaText}>4 阶段训练</Text>
            </View>
            <View style={styles.heroMetaChip}>
              <Text style={styles.heroMetaText}>N5-N1</Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('AiSettings')} style={styles.heroConfigEntry}>
            <Ionicons name="settings-outline" size={14} color={colors.primary} />
            <Text style={styles.heroConfigEntryText}>API 配置</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="stats-chart-outline" size={16} color={colors.text} />
          <Text style={styles.sectionTitle}>Tokens 消耗统计</Text>
        </View>
        <Text style={styles.tip}>累计统计输入 / 缓存 / 输出消耗。</Text>
        <View style={styles.usageGrid}>
          {usageItems.map((item) => (
            <View
              key={item.key}
              style={[
                styles.usageCard,
                item.tone === 'blue'
                  ? styles.usageCardBlue
                  : item.tone === 'green'
                  ? styles.usageCardGreen
                  : item.tone === 'orange'
                  ? styles.usageCardOrange
                  : styles.usageCardSlate,
              ]}
            >
              <Text style={styles.usageLabel}>{item.label}</Text>
              <Text style={styles.usageValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.systemHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="ear-outline" size={16} color={colors.text} />
            <Text style={styles.sectionTitle}>AI 日语理解能力训练</Text>
          </View>
        </View>
        <View style={[styles.systemCard, styles.systemCardLast]}>
          <View style={styles.systemCardHead}>
            <View style={[styles.stepBadge, styles.stepBadgeTeal]}>
              <Text style={styles.stepBadgeText}>01</Text>
            </View>
            <View style={styles.systemCardMeta}>
              <Text style={styles.systemCardTitle}>AI 听力训练</Text>
              <Text style={styles.systemCardDesc}>听单词、听句子与 AI 小短文听解，统一使用 TTS 播放音频。</Text>
            </View>
          </View>
          <HubActionButton
            title="进入听力训练"
            onPress={() => navigateToAiPractice('AiListeningPractice')}
            tone="teal"
            style={styles.moduleActionBtn}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.systemHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="layers-outline" size={16} color={colors.text} />
            <Text style={styles.sectionTitle}>AI 日语表达能力训练</Text>
          </View>
        </View>
        <View style={styles.systemCard}>
          <View style={styles.systemCardHead}>
            <View style={[styles.stepBadge, styles.stepBadgeBlue]}>
              <Text style={styles.stepBadgeText}>01</Text>
            </View>
            <View style={styles.systemCardMeta}>
              <Text style={styles.systemCardTitle}>AI 连词成句</Text>
              <Text style={styles.systemCardDesc}>先训练词序与基础句法，打稳句子结构感。</Text>
            </View>
          </View>
          <View style={styles.levelRow}>
            {LEVELS.map((level) => {
              const active = level === selectedSentenceLevel;
              return (
                <Pressable
                  key={`sentence-${level}`}
                  onPress={() => setSelectedSentenceLevel(level)}
                  style={[styles.levelChip, active ? styles.levelChipActive : null]}
                >
                  <Text style={[styles.levelChipText, active ? styles.levelChipTextActive : null]}>{level}</Text>
                </Pressable>
              );
            })}
          </View>
          <HubActionButton
            title={sentenceButtonTitle}
            onPress={handleGenerateSentenceAssemble}
            disabled={sentenceLoading}
            tone="sky"
            style={styles.moduleActionBtn}
          />
        </View>

        <View style={styles.systemCard}>
          <View style={styles.systemCardHead}>
            <View style={[styles.stepBadge, styles.stepBadgeGreen]}>
              <Text style={styles.stepBadgeText}>02</Text>
            </View>
            <View style={styles.systemCardMeta}>
              <Text style={styles.systemCardTitle}>AI 翻译训练</Text>
              <Text style={styles.systemCardDesc}>把句法能力迁移到双语表达，强化语义映射与准确性。</Text>
            </View>
          </View>
          <HubActionButton
            title="进入翻译训练"
            onPress={() => navigation.navigate('AiTranslationPractice')}
            tone="teal"
            style={styles.moduleActionBtn}
          />
        </View>

        <View style={styles.systemCard}>
          <View style={styles.systemCardHead}>
            <View style={[styles.stepBadge, styles.stepBadgeOrange]}>
              <Text style={styles.stepBadgeText}>03</Text>
            </View>
            <View style={styles.systemCardMeta}>
              <Text style={styles.systemCardTitle}>AI 场景对话</Text>
              <Text style={styles.systemCardDesc}>在真实场景多轮输出，综合运用语法、词汇与语用策略。</Text>
            </View>
          </View>
          <HubActionButton
            title="进入场景对话"
            onPress={() => navigation.navigate('AiConversation')}
            tone="amber"
            style={styles.moduleActionBtn}
          />
        </View>

        <View style={[styles.systemCard, styles.systemCardLast]}>
          <View style={styles.systemCardHead}>
            <View style={[styles.stepBadge, styles.stepBadgePurple]}>
              <Text style={styles.stepBadgeText}>04</Text>
            </View>
            <View style={styles.systemCardMeta}>
              <Text style={styles.systemCardTitle}>AI 写作达意</Text>
              <Text style={styles.systemCardDesc}>围绕目标写几句短文，训练信息覆盖、语法准确与表达自然度。</Text>
            </View>
          </View>
          <HubActionButton
            title="进入写作达意"
            onPress={() => navigation.navigate('AiWritingPractice')}
            tone="violet"
            style={styles.moduleActionBtn}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="document-text-outline" size={16} color={colors.text} />
          <Text style={styles.sectionTitle}>AI 生题</Text>
        </View>
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
        <HubActionButton
          title={buttonTitle}
          onPress={handleGenerateExam}
          disabled={loading}
          tone="indigo"
          style={styles.actionBtn}
        />
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
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -56,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ede9fe',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  heroTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
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
  heroBottomRow: {
    marginTop: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMetaRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  heroMetaChip: {
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: '#f5f3ff',
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  heroMetaText: {
    color: '#5b21b6',
    fontSize: 12,
    fontWeight: '700',
  },
  heroConfigEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.s,
    gap: 2,
  },
  heroConfigEntryText: {
    color: colors.primary,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tip: {
    color: colors.muted,
    marginTop: 2,
  },
  systemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  systemCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.m,
    backgroundColor: '#fbfdff',
    padding: spacing.s,
  },
  systemCardLast: {
    marginBottom: spacing.xs,
  },
  systemCardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
    marginTop: 1,
  },
  stepBadgeBlue: {
    backgroundColor: '#dbeafe',
  },
  stepBadgeGreen: {
    backgroundColor: '#dcfce7',
  },
  stepBadgeOrange: {
    backgroundColor: '#ffedd5',
  },
  stepBadgePurple: {
    backgroundColor: '#ede9fe',
  },
  stepBadgeTeal: {
    backgroundColor: '#ccfbf1',
  },
  stepBadgeText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  systemCardMeta: {
    flex: 1,
  },
  systemCardTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  systemCardDesc: {
    marginTop: 2,
    color: colors.muted,
    lineHeight: 20,
    fontSize: 12,
  },
  moduleActionBtn: {
    marginTop: spacing.s,
  },
  hubActionBtn: {
    borderRadius: radius.m,
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  hubActionBtnIndigo: {
    backgroundColor: '#3656d4',
    borderColor: '#2f49b8',
  },
  hubActionBtnTeal: {
    backgroundColor: '#0f766e',
    borderColor: '#0d645d',
  },
  hubActionBtnAmber: {
    backgroundColor: '#b45309',
    borderColor: '#92400e',
  },
  hubActionBtnSky: {
    backgroundColor: '#0c7bb8',
    borderColor: '#0369a1',
  },
  hubActionBtnViolet: {
    backgroundColor: '#5b21b6',
    borderColor: '#4c1d95',
  },
  hubActionBtnPressed: {
    opacity: 0.88,
  },
  hubActionBtnDisabled: {
    opacity: 0.55,
  },
  hubActionTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    flexShrink: 1,
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
  usageGrid: {
    marginTop: spacing.s,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  usageCard: {
    width: '48%',
    borderRadius: radius.m,
    borderWidth: 1,
    padding: spacing.s,
    minHeight: 76,
    justifyContent: 'space-between',
  },
  usageCardBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  usageCardGreen: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  usageCardOrange: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  usageCardSlate: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.s,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  usageLabel: {
    color: '#475569',
    fontSize: 12,
  },
  usageValue: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 17,
    marginTop: spacing.xs,
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
});
