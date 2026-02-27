import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';
import { updateSettings } from '../db/queries';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing } from '../theme';
import { Settings } from '../types';

const RATE_OPTIONS = [0.8, 1.0, 1.2];
const MAX_NAV_ITEMS = 2;
const FONT_OPTIONS = [
  { label: '小', value: 's' },
  { label: '中', value: 'm' },
  { label: '大', value: 'l' },
] as const;
const NAV_ITEMS = [
  { key: 'nav_show_ai_hub', label: 'AI 学习中心' },
  { key: 'nav_show_exam_quiz', label: '真题练习' },
  { key: 'nav_show_search', label: '搜索' },
  { key: 'nav_show_mistakes', label: '错题' },
  { key: 'nav_show_vocab_book', label: '生词本' },
  { key: 'nav_show_kana', label: '五十音图' },
  { key: 'nav_show_verb_conjugation', label: '动词变形表' },
  { key: 'nav_show_keigo', label: '敬语表' },
  { key: 'nav_show_settings', label: '设置' },
] as const;
const SWITCH_TRACK_COLOR = { false: colors.border, true: colors.primary };

type NavItemKey = (typeof NAV_ITEMS)[number]['key'];

function buildNavState(source: Settings): Record<NavItemKey, boolean> {
  return {
    nav_show_ai_hub: source.nav_show_ai_hub,
    nav_show_exam_quiz: source.nav_show_exam_quiz,
    nav_show_search: source.nav_show_search,
    nav_show_mistakes: source.nav_show_mistakes,
    nav_show_vocab_book: source.nav_show_vocab_book,
    nav_show_kana: source.nav_show_kana,
    nav_show_verb_conjugation: source.nav_show_verb_conjugation,
    nav_show_keigo: source.nav_show_keigo,
    nav_show_settings: source.nav_show_settings,
  };
}

export default function SettingsScreen() {
  const topPadding = useScreenTopPadding();
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const [mcqJaToMeaningEnabled, setMcqJaToMeaningEnabled] = useState(settings.mcq_modes.ja_to_meaning);
  const [mcqMeaningToJaEnabled, setMcqMeaningToJaEnabled] = useState(settings.mcq_modes.meaning_to_ja);
  const [grammarExampleToPatternEnabled, setGrammarExampleToPatternEnabled] = useState(
    settings.grammar_quiz_modes.example_to_pattern
  );
  const [grammarMeaningToPatternEnabled, setGrammarMeaningToPatternEnabled] = useState(
    settings.grammar_quiz_modes.meaning_to_pattern
  );
  const [grammarPatternToMeaningEnabled, setGrammarPatternToMeaningEnabled] = useState(
    settings.grammar_quiz_modes.pattern_to_meaning
  );
  const [spellingEnabled, setSpellingEnabled] = useState(settings.quiz_mix.spelling > 0);
  const [listeningEnabled, setListeningEnabled] = useState(settings.quiz_mix.listening > 0);
  const [meaningEnglish, setMeaningEnglish] = useState(settings.meaning_language === 'en');
  const showExampleFurigana = settings.show_example_furigana;
  const compactSingleExpand = settings.compact_single_expand;
  const [navItems, setNavItems] = useState<Record<NavItemKey, boolean>>(buildNavState(settings));

  useEffect(() => {
    setMcqJaToMeaningEnabled(settings.mcq_modes.ja_to_meaning);
    setMcqMeaningToJaEnabled(settings.mcq_modes.meaning_to_ja);
    setGrammarExampleToPatternEnabled(settings.grammar_quiz_modes.example_to_pattern);
    setGrammarMeaningToPatternEnabled(settings.grammar_quiz_modes.meaning_to_pattern);
    setGrammarPatternToMeaningEnabled(settings.grammar_quiz_modes.pattern_to_meaning);
    setSpellingEnabled(settings.quiz_mix.spelling > 0);
    setListeningEnabled(settings.quiz_mix.listening > 0);
    setMeaningEnglish(settings.meaning_language === 'en');
    setNavItems(buildNavState(settings));
  }, [
    settings.mcq_modes.ja_to_meaning,
    settings.mcq_modes.meaning_to_ja,
    settings.grammar_quiz_modes.example_to_pattern,
    settings.grammar_quiz_modes.meaning_to_pattern,
    settings.grammar_quiz_modes.pattern_to_meaning,
    settings.meaning_language,
    settings.quiz_mix.listening,
    settings.quiz_mix.spelling,
    settings.nav_show_search,
    settings.nav_show_mistakes,
    settings.nav_show_vocab_book,
    settings.nav_show_kana,
    settings.nav_show_verb_conjugation,
    settings.nav_show_keigo,
    settings.nav_show_ai_hub,
    settings.nav_show_exam_quiz,
    settings.nav_show_settings,
  ]);

  const persist = async (next: typeof settings) => {
    setSettings(next);
    await updateSettings(next);
  };

  const buildMix = (mcqEnabled: boolean, spellEnabled: boolean, listenEnabled: boolean) => {
    const enabledCount = [mcqEnabled, spellEnabled, listenEnabled].filter(Boolean).length;
    if (enabledCount <= 0) return settings.quiz_mix;
    const weight = 1 / enabledCount;
    return {
      mcq: mcqEnabled ? weight : 0,
      spelling: spellEnabled ? weight : 0,
      listening: listenEnabled ? weight : 0,
    };
  };

  const handleMcqModeToggle = async (mode: 'ja_to_meaning' | 'meaning_to_ja', value: boolean) => {
    const nextModes = { ...settings.mcq_modes, [mode]: value };
    const nextMcqEnabled = nextModes.ja_to_meaning || nextModes.meaning_to_ja;
    if (!nextMcqEnabled && !spellingEnabled && !listeningEnabled) {
      if (mode === 'ja_to_meaning') {
        setMcqJaToMeaningEnabled(true);
      } else {
        setMcqMeaningToJaEnabled(true);
      }
      return;
    }
    if (mode === 'ja_to_meaning') {
      setMcqJaToMeaningEnabled(value);
    } else {
      setMcqMeaningToJaEnabled(value);
    }
    const nextMix = buildMix(nextMcqEnabled, spellingEnabled, listeningEnabled);
    await persist({ ...settings, mcq_modes: nextModes, quiz_mix: nextMix });
  };

  const handleGrammarModeToggle = async (mode: keyof Settings['grammar_quiz_modes'], value: boolean) => {
    const nextModes = { ...settings.grammar_quiz_modes, [mode]: value };
    const enabledCount = Object.values(nextModes).filter(Boolean).length;
    if (enabledCount <= 0) {
      if (mode === 'example_to_pattern') setGrammarExampleToPatternEnabled(true);
      if (mode === 'meaning_to_pattern') setGrammarMeaningToPatternEnabled(true);
      if (mode === 'pattern_to_meaning') setGrammarPatternToMeaningEnabled(true);
      return;
    }
    setGrammarExampleToPatternEnabled(nextModes.example_to_pattern);
    setGrammarMeaningToPatternEnabled(nextModes.meaning_to_pattern);
    setGrammarPatternToMeaningEnabled(nextModes.pattern_to_meaning);
    await persist({ ...settings, grammar_quiz_modes: nextModes });
  };

  const handleToggle = async (type: 'spelling' | 'listening', value: boolean) => {
    const nextSpelling = type === 'spelling' ? value : spellingEnabled;
    const nextListening = type === 'listening' ? value : listeningEnabled;
    const mcqEnabled = mcqJaToMeaningEnabled || mcqMeaningToJaEnabled;
    if (!mcqEnabled && !nextSpelling && !nextListening) {
      if (type === 'spelling') {
        setSpellingEnabled(true);
      } else {
        setListeningEnabled(true);
      }
      return;
    }
    if (type === 'spelling') setSpellingEnabled(value);
    if (type === 'listening') setListeningEnabled(value);
    const nextMix = buildMix(mcqEnabled, nextSpelling, nextListening);
    await persist({ ...settings, quiz_mix: nextMix });
  };

  const handleRate = async (rate: number) => {
    await persist({ ...settings, tts_rate: rate });
  };

  const handleMeaningLanguage = async (useEnglish: boolean) => {
    setMeaningEnglish(useEnglish);
    await persist({ ...settings, meaning_language: useEnglish ? 'en' : 'zh' });
  };

  const handleExampleFurigana = async (value: boolean) => {
    await persist({ ...settings, show_example_furigana: value });
  };

  const handleFontScale = async (value: (typeof FONT_OPTIONS)[number]['value']) => {
    await persist({ ...settings, font_scale: value });
  };

  const handleCompactSingleExpand = async (value: boolean) => {
    await persist({ ...settings, compact_single_expand: value });
  };

  const updateNavItems = async (key: NavItemKey, value: boolean) => {
    const next = { ...navItems, [key]: value };
    const enabledCount = NAV_ITEMS.filter((item) => next[item.key]).length;
    if (enabledCount > MAX_NAV_ITEMS) return;
    setNavItems(next);
    await persist({ ...settings, ...next });
  };

  const renderSwitchRow = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    isLast = false
  ) => (
    <View style={[styles.toggleRow, !isLast ? styles.toggleRowDivider : null]}>
      <Text style={styles.toggleText}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={SWITCH_TRACK_COLOR} />
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>设置</Text>
        <Text style={styles.pageSubtitle}>调整学习偏好与界面显示</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>发音速度</Text>
        <View style={styles.optionRow}>
          {RATE_OPTIONS.map((rate, index) => (
            <Pressable
              key={rate}
              onPress={() => handleRate(rate)}
              style={({ pressed }) => [
                styles.optionBtn,
                index < RATE_OPTIONS.length - 1 ? styles.optionBtnGap : null,
                settings.tts_rate === rate ? styles.optionBtnActive : null,
                pressed ? styles.optionBtnPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  settings.tts_rate === rate ? styles.optionBtnTextActive : null,
                ]}
              >
                {`${rate}x`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>词汇字号</Text>
        <View style={styles.optionRow}>
          {FONT_OPTIONS.map((option, index) => (
            <Pressable
              key={option.value}
              onPress={() => handleFontScale(option.value)}
              style={({ pressed }) => [
                styles.optionBtn,
                index < FONT_OPTIONS.length - 1 ? styles.optionBtnGap : null,
                settings.font_scale === option.value ? styles.optionBtnActive : null,
                pressed ? styles.optionBtnPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.optionBtnText,
                  settings.font_scale === option.value ? styles.optionBtnTextActive : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.tip}>词条与释义使用统一字号</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>释义语言</Text>
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleText, !meaningEnglish ? styles.toggleTextActive : styles.toggleTextMuted]}>
            中文
          </Text>
          <Switch value={meaningEnglish} onValueChange={handleMeaningLanguage} trackColor={SWITCH_TRACK_COLOR} />
          <Text style={[styles.toggleText, meaningEnglish ? styles.toggleTextActive : styles.toggleTextMuted]}>
            英文
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>紧凑模式</Text>
        {renderSwitchRow('仅展开一个词条', compactSingleExpand, handleCompactSingleExpand, true)}
        <Text style={styles.tip}>在紧凑模式下，展开新词条会自动收起上一个</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>例句注音</Text>
        {renderSwitchRow('显示假名注音', showExampleFurigana, handleExampleFurigana, true)}
        <Text style={styles.tip}>关闭时例句中的汉字不会显示注音</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>词汇题型设置</Text>
        {renderSwitchRow('日语选释义', mcqJaToMeaningEnabled, (value) =>
          handleMcqModeToggle('ja_to_meaning', value)
        )}
        {renderSwitchRow('释义选日语', mcqMeaningToJaEnabled, (value) =>
          handleMcqModeToggle('meaning_to_ja', value)
        )}
        {renderSwitchRow('拼写题', spellingEnabled, (value) => handleToggle('spelling', value))}
        {renderSwitchRow('听力题', listeningEnabled, (value) => handleToggle('listening', value), true)}
        <Text style={styles.tip}>至少开启一种题型；关闭后不再出该题型，多选题型等概率出题</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>文法题型设置</Text>
        {renderSwitchRow('例句选文法', grammarExampleToPatternEnabled, (value) =>
          handleGrammarModeToggle('example_to_pattern', value)
        )}
        {renderSwitchRow('释义选文法', grammarMeaningToPatternEnabled, (value) =>
          handleGrammarModeToggle('meaning_to_pattern', value)
        )}
        {renderSwitchRow('文法选释义', grammarPatternToMeaningEnabled, (value) =>
          handleGrammarModeToggle('pattern_to_meaning', value),
          true
        )}
        <Text style={styles.tip}>至少开启一种题型；关闭后不再出该题型，多选题型等概率出题</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>导航栏入口</Text>
        {NAV_ITEMS.map((item, index) => (
          <View
            key={item.key}
            style={[styles.toggleRow, index < NAV_ITEMS.length - 1 ? styles.toggleRowDivider : null]}
          >
            <Text style={styles.toggleText}>{item.label}</Text>
            <Switch
              value={navItems[item.key]}
              onValueChange={(value) => updateNavItems(item.key, value)}
              trackColor={SWITCH_TRACK_COLOR}
            />
          </View>
        ))}
        <Text style={styles.tip}>最多显示两个入口，搜索和错题默认开启</Text>
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
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.xl,
  },
  pageHeader: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.s,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  optionRow: {
    flexDirection: 'row',
  },
  optionBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingVertical: spacing.s,
    alignItems: 'center',
  },
  optionBtnGap: {
    marginRight: spacing.s,
  },
  optionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionBtnPressed: {
    opacity: 0.8,
  },
  optionBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  optionBtnTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingVertical: spacing.xs,
  },
  toggleRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleText: {
    fontSize: 16,
    color: colors.text,
  },
  toggleTextActive: {
    fontWeight: '700',
  },
  toggleTextMuted: {
    color: colors.muted,
  },
  tip: {
    color: colors.muted,
    marginTop: spacing.s,
    fontSize: 13,
    lineHeight: 19,
  },
});
