import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrimaryButton from '../components/PrimaryButton';
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
  { key: 'nav_show_search', label: '搜索' },
  { key: 'nav_show_mistakes', label: '错题' },
  { key: 'nav_show_vocab_book', label: '生词本' },
  { key: 'nav_show_kana', label: '五十音图' },
  { key: 'nav_show_verb_conjugation', label: '动词变形表' },
  { key: 'nav_show_keigo', label: '敬语表' },
  { key: 'nav_show_settings', label: '设置' },
] as const;

type NavItemKey = (typeof NAV_ITEMS)[number]['key'];

function buildNavState(source: Settings): Record<NavItemKey, boolean> {
  return {
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
  const insets = useSafeAreaInsets();
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.m }]}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>发音速度</Text>
        <View style={styles.rateRow}>
          {RATE_OPTIONS.map((rate, index) => (
            <PrimaryButton
              key={rate}
              title={`${rate}x`}
              onPress={() => handleRate(rate)}
              style={[
                styles.rateBtn,
                index < RATE_OPTIONS.length - 1 ? styles.rateBtnGap : null,
                settings.tts_rate === rate ? styles.rateActive : null,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>词汇字号</Text>
        <View style={styles.rateRow}>
          {FONT_OPTIONS.map((option, index) => (
            <PrimaryButton
              key={option.value}
              title={option.label}
              onPress={() => handleFontScale(option.value)}
              style={[
                styles.rateBtn,
                index < FONT_OPTIONS.length - 1 ? styles.rateBtnGap : null,
                settings.font_scale === option.value ? styles.rateActive : null,
              ]}
            />
          ))}
        </View>
        <Text style={styles.tip}>词条与释义使用统一字号</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>释义语言</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>中文</Text>
          <Switch
            value={meaningEnglish}
            onValueChange={handleMeaningLanguage}
            trackColor={{ false: colors.primary, true: colors.primary }}
          />
          <Text style={styles.toggleText}>英文</Text>
        </View>
        <Text style={styles.tip}>当中文释义缺失时，自动回退为英文</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>紧凑模式</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>仅展开一个词条</Text>
          <Switch
            value={compactSingleExpand}
            onValueChange={handleCompactSingleExpand}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={styles.tip}>在紧凑模式下，展开新词条会自动收起上一个</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>词汇题型设置</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>日语选释义</Text>
          <Switch
            value={mcqJaToMeaningEnabled}
            onValueChange={(value) => handleMcqModeToggle('ja_to_meaning', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>释义选日语</Text>
          <Switch
            value={mcqMeaningToJaEnabled}
            onValueChange={(value) => handleMcqModeToggle('meaning_to_ja', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>拼写题</Text>
          <Switch
            value={spellingEnabled}
            onValueChange={(value) => handleToggle('spelling', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>听力题</Text>
          <Switch
            value={listeningEnabled}
            onValueChange={(value) => handleToggle('listening', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={styles.tip}>至少开启一种题型；关闭后不再出该题型，多选题型等概率出题</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>文法题型设置</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>例句选文法</Text>
          <Switch
            value={grammarExampleToPatternEnabled}
            onValueChange={(value) => handleGrammarModeToggle('example_to_pattern', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>释义选文法</Text>
          <Switch
            value={grammarMeaningToPatternEnabled}
            onValueChange={(value) => handleGrammarModeToggle('meaning_to_pattern', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>文法选释义</Text>
          <Switch
            value={grammarPatternToMeaningEnabled}
            onValueChange={(value) => handleGrammarModeToggle('pattern_to_meaning', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={styles.tip}>至少开启一种题型；关闭后不再出该题型，多选题型等概率出题</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>导航栏入口</Text>
        {NAV_ITEMS.map((item) => (
          <View key={item.key} style={styles.toggleRow}>
            <Text style={styles.toggleText}>{item.label}</Text>
            <Switch
              value={navItems[item.key]}
              onValueChange={(value) => updateNavItems(item.key, value)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        ))}
        <Text style={styles.tip}>最多显示两个入口，搜索和错题默认开启</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>词库来源</Text>
        <Text style={styles.sourceText}>词汇：eggrolls JLPT10k（中文释义，CC BY-NC 4.0）</Text>
        <Text style={styles.sourceText}>文法：蓝宝书语法N1.N2.N3.N4.N5文法含振假名（AnkiWeb 共享牌组）</Text>
        <Text style={styles.tip}>发布版本中将附带完整授权说明</Text>
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
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.m,
  },
  rateRow: {
    flexDirection: 'row',
  },
  rateBtn: {
    flex: 1,
  },
  rateBtnGap: {
    marginRight: spacing.s,
  },
  rateActive: {
    backgroundColor: colors.success,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  toggleText: {
    fontSize: 16,
    color: colors.text,
  },
  tip: {
    color: colors.muted,
    marginTop: spacing.s,
  },
  sourceText: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
});
