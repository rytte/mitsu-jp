import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
import { replyConversationWithAi, startConversationWithAi } from '../features/ai/service';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { BankLevel } from '../types';

type Scenario = {
  id: string;
  title: string;
  description: string;
  goal: string;
};

type Turn = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  translation?: string;
  correction?: {
    original: string;
    better: string;
    reasonCn: string;
  } | null;
  hint?: string;
  score?: number;
  completionComment?: string;
  completed?: boolean;
};

const LEVELS: BankLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const SCENARIOS: Scenario[] = [
  {
    id: 'restaurant',
    title: '餐厅点餐',
    description: '你在日本餐厅点餐并提出一个简单需求。',
    goal: '完成点餐并礼貌确认饮料需求。',
  },
  {
    id: 'hospital',
    title: '医院挂号',
    description: '你在前台说明症状并咨询就诊安排。',
    goal: '说清症状并完成预约。',
  },
  {
    id: 'interview',
    title: '面试交流',
    description: '你与面试官进行简短问答。',
    goal: '完成自我介绍并表达应聘动机。',
  },
  {
    id: 'travel',
    title: '旅行问路',
    description: '你在车站问路并确认换乘。',
    goal: '问清路线并复述关键站名。',
  },
];

export default function AiConversationScreen() {
  const insets = useSafeAreaInsets();
  const settings = useAppStore((state) => state.settings);
  const [level, setLevel] = useState<BankLevel>('N5');
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const spokenAssistantIdsRef = useRef<Set<string>>(new Set());

  const speakAssistantText = (text: string) => {
    const speakingText = text.trim();
    if (!speakingText) return;
    InteractionManager.runAfterInteractions(() => {
      Speech.stop();
      Speech.speak(speakingText, {
        language: 'ja-JP',
        rate: settings.tts_rate,
        voice: settings.tts_voice ?? undefined,
      });
    });
  };

  const history = useMemo(
    () =>
      turns.map((item) => ({
        role: item.role,
        text: item.text,
      })),
    [turns]
  );

  const canSend = sessionStarted && !loading && inputText.trim().length > 0;

  useEffect(() => {
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      const turn = turns[i];
      if (turn.role !== 'assistant') continue;
      if (spokenAssistantIdsRef.current.has(turn.id)) break;
      spokenAssistantIdsRef.current.add(turn.id);
      speakAssistantText(turn.text);
      break;
    }
  }, [settings.tts_rate, settings.tts_voice, turns]);

  useEffect(() => () => {
    Speech.stop();
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setError('');
    setTurns([]);
    spokenAssistantIdsRef.current.clear();
    setSessionStarted(false);
    try {
      const first = await startConversationWithAi({
        level,
        scenarioTitle: scenario.title,
        scenarioDescription: scenario.description,
        goal: scenario.goal,
      });
      setTurns([
        {
          id: `assistant-1`,
          role: 'assistant',
          text: first.assistantReplyJa,
          translation: first.assistantReplyZh,
          correction: first.correction,
          hint: first.nextHintCn,
          score: first.score,
          completed: first.isGoalCompleted,
          completionComment: first.completionCommentCn,
        },
      ]);
      setSessionStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    const nextTurns = [...turns, { id: `user-${turns.length + 1}`, role: 'user' as const, text }];
    setTurns(nextTurns);
    setInputText('');
    setLoading(true);
    setError('');

    try {
      const result = await replyConversationWithAi({
        level,
        scenarioTitle: scenario.title,
        scenarioDescription: scenario.description,
        goal: scenario.goal,
        userInput: text,
        history: nextTurns.map((item) => ({ role: item.role, text: item.text })),
        turnIndex: nextTurns.length,
      });

      setTurns((prev) => [
        ...(() => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i -= 1) {
            if (updated[i].role === 'user') {
              updated[i] = {
                ...updated[i],
                correction: result.correction,
              };
              break;
            }
          }
          updated.push({
            id: `assistant-${updated.length + 1}`,
            role: 'assistant',
            text: result.assistantReplyJa,
            translation: result.assistantReplyZh,
            hint: result.nextHintCn,
            score: result.score,
            completed: result.isGoalCompleted,
            completionComment: result.completionCommentCn,
          });
          return updated;
        })(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.m }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="chatbubbles-outline" size={16} color="#0f766e" />
            </View>
            <Text style={styles.heroTag}>对话训练</Text>
          </View>
          <Text style={styles.heroTitle}>AI 对话训练</Text>
          <Text style={styles.heroSub}>选择场景后开始对话，AI 会实时给你纠错和下一句提示。</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>等级</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((item) => {
              const active = item === level;
              return (
                <Pressable key={item} onPress={() => setLevel(item)} style={[styles.levelChip, active ? styles.levelChipActive : null]}>
                  <Text style={[styles.levelChipText, active ? styles.levelChipTextActive : null]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>场景</Text>
          {SCENARIOS.map((item) => {
            const active = item.id === scenario.id;
            return (
              <Pressable key={item.id} onPress={() => setScenario(item)} style={[styles.scenarioCard, active ? styles.scenarioCardActive : null]}>
                <Text style={styles.scenarioTitle}>{item.title}</Text>
                <Text style={styles.scenarioDesc}>{item.description}</Text>
                <Text style={styles.scenarioGoal}>目标：{item.goal}</Text>
              </Pressable>
            );
          })}
          <PrimaryButton title={loading ? '启动中...' : '开始对话训练'} onPress={handleStart} disabled={loading} style={styles.startBtn} />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>错误：{error}</Text>
          </View>
        ) : null}

        {turns.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>对话记录</Text>
            {turns.map((turn) => (
              <Pressable
                key={turn.id}
                disabled={turn.role !== 'assistant'}
                onPress={() => {
                  if (turn.role === 'assistant') {
                    speakAssistantText(turn.text);
                  }
                }}
                style={({ pressed }) => [
                  styles.turnBubble,
                  turn.role === 'assistant' ? styles.assistantBubble : styles.userBubble,
                  pressed && turn.role === 'assistant' ? styles.assistantBubblePressed : null,
                ]}
              >
                <View style={styles.turnHeadRow}>
                  <Text style={styles.turnRole}>{turn.role === 'assistant' ? 'AI' : '你'}</Text>
                  {turn.role === 'assistant' ? (
                    <View style={styles.playHintWrap}>
                      <Ionicons name="volume-high-outline" size={13} color="#0369a1" />
                      <Text style={styles.playHintText}>点击播放</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.turnText}>{turn.text}</Text>
                {turn.translation ? <Text style={styles.turnTranslation}>{turn.translation}</Text> : null}
                {turn.role === 'user' && turn.correction ? (
                  <View style={styles.correctionBox}>
                    <Text style={styles.correctionTitle}>改进建议</Text>
                    <Text style={styles.correctionText}>原句：{turn.correction.original}</Text>
                    <Text style={styles.correctionText}>更自然：{turn.correction.better}</Text>
                    <Text style={styles.correctionText}>原因：{turn.correction.reasonCn}</Text>
                  </View>
                ) : null}
                {turn.hint ? <Text style={styles.hintText}>下一步提示：{turn.hint}</Text> : null}
                {typeof turn.score === 'number' ? <Text style={styles.scoreText}>本轮建议分：{turn.score}</Text> : null}
                {turn.completed ? <Text style={styles.doneText}>{turn.completionComment || '目标已完成，做得很好！'}</Text> : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {sessionStarted ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>你的回复</Text>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="输入你想说的日语句子"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <PrimaryButton title={loading ? '发送中...' : '发送并继续'} onPress={handleSend} disabled={!canSend} style={styles.sendBtn} />
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingLabel}>AI 正在思考回复...</Text>
              </View>
            ) : null}
          </View>
        ) : null}

      </ScrollView>
    </View>
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
    backgroundColor: '#ccfbf1',
    marginRight: spacing.xs,
  },
  heroTag: {
    color: '#0f766e',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
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
  scenarioCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: spacing.s,
    marginBottom: spacing.s,
    backgroundColor: '#fff',
  },
  scenarioCardActive: {
    borderColor: '#0f766e',
    backgroundColor: '#f0fdfa',
  },
  scenarioTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  scenarioDesc: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  scenarioGoal: {
    marginTop: spacing.xs,
    color: '#0f766e',
    fontSize: 12,
  },
  startBtn: {
    marginTop: spacing.s,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: radius.m,
    padding: spacing.s,
    marginBottom: spacing.m,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  turnBubble: {
    borderWidth: 1,
    borderRadius: radius.m,
    padding: spacing.s,
    marginBottom: spacing.s,
  },
  assistantBubble: {
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
  },
  userBubble: {
    borderColor: '#d1fae5',
    backgroundColor: '#f0fdf4',
  },
  turnRole: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
    fontWeight: '700',
  },
  turnHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playHintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  playHintText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
  },
  assistantBubblePressed: {
    opacity: 0.7,
  },
  turnText: {
    color: colors.text,
    lineHeight: 22,
    fontSize: 15,
  },
  turnTranslation: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  correctionBox: {
    marginTop: spacing.s,
    padding: spacing.s,
    borderRadius: radius.s,
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderWidth: 1,
  },
  correctionTitle: {
    color: '#c2410c',
    fontWeight: '700',
    marginBottom: 4,
  },
  correctionText: {
    color: '#7c2d12',
    fontSize: 12,
    marginBottom: 2,
  },
  hintText: {
    marginTop: spacing.s,
    color: '#0369a1',
    fontSize: 12,
  },
  scoreText: {
    marginTop: spacing.xs,
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '600',
  },
  doneText: {
    marginTop: spacing.s,
    color: colors.success,
    fontWeight: '700',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    color: colors.text,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  sendBtn: {
    marginTop: spacing.s,
  },
  loadingRow: {
    marginTop: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadingLabel: {
    color: colors.muted,
    fontSize: 12,
  },
});
