import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { GRAMMARS } from '../data/grammars';
import { GrammarStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<GrammarStackParamList, 'Grammar'>;

type GrammarTerm = {
  key: string;
  title: string;
  layer: string;
  posScope?: string;
  formByPos?: string[];
  role: string;
  linking: string;
  example: string;
};

type QuickEntry = {
  key: string;
  title: string;
  subtitle: string;
  route:
    | 'KanaChart'
    | 'NumeralGuide'
    | 'AdjectiveGuide'
    | 'VerbClassification'
    | 'VerbConjugation'
    | 'ParticleGuide'
    | 'KeigoChart';
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  soft: string;
};

type LevelMeta = {
  tag: string;
  hint: string;
  accent: string;
  soft: string;
};

const QUICK_ENTRIES: QuickEntry[] = [
  {
    key: 'kana',
    title: '五十音图',
    subtitle: '平假名 / 片假名发音速查',
    route: 'KanaChart',
    icon: 'grid-outline',
    accent: '#4338ca',
    soft: '#e0e7ff',
  },
  {
    key: 'numeral-guide',
    title: '数词速查表',
    subtitle: '数字 / 日期 / 时间 / 助数词',
    route: 'NumeralGuide',
    icon: 'calculator-outline',
    accent: '#0ea5e9',
    soft: '#e0f2fe',
  },
  {
    key: 'adjective-guide',
    title: '形容词分类表',
    subtitle: 'い形容词 / な形容词 / 基础活用',
    route: 'AdjectiveGuide',
    icon: 'text-outline',
    accent: '#6366f1',
    soft: '#e0e7ff',
  },
  {
    key: 'verb-classification',
    title: '动词分类表',
    subtitle: '五段 / 一段 / 不规则动词',
    route: 'VerbClassification',
    icon: 'list-outline',
    accent: '#0891b2',
    soft: '#cffafe',
  },
  {
    key: 'verb-conjugation',
    title: '动词变形表',
    subtitle: 'ます形 / て形 / ない形等',
    route: 'VerbConjugation',
    icon: 'swap-horizontal-outline',
    accent: '#14b8a6',
    soft: '#ccfbf1',
  },
  {
    key: 'particle-guide',
    title: '助词表',
    subtitle: 'は / が / を / に / で 高频用法',
    route: 'ParticleGuide',
    icon: 'git-network-outline',
    accent: '#22c55e',
    soft: '#dcfce7',
  },
  {
    key: 'keigo',
    title: '敬语表',
    subtitle: '尊敬语 / 谦让语 / 丁宁语',
    route: 'KeigoChart',
    icon: 'chatbubbles-outline',
    accent: '#be185d',
    soft: '#fce7f3',
  },
];

const LEVEL_META: Record<string, LevelMeta> = {
  N5: {
    tag: '入门',
    hint: '基础句型与核心表达',
    accent: '#2563eb',
    soft: '#dbeafe',
  },
  N4: {
    tag: '夯实',
    hint: '连接表达与常见口语结构',
    accent: '#0d9488',
    soft: '#ccfbf1',
  },
  N3: {
    tag: '进阶',
    hint: '中级语法与书面表达',
    accent: '#7c3aed',
    soft: '#ede9fe',
  },
  N2: {
    tag: '强化',
    hint: '抽象表达与新闻场景',
    accent: '#db2777',
    soft: '#fce7f3',
  },
  N1: {
    tag: '高阶',
    hint: '细微语感与高难度语境',
    accent: '#b45309',
    soft: '#fef3c7',
  },
};

const GRAMMAR_TERMS: GrammarTerm[] = [
  {
    key: 'taigen',
    title: '体言',
    layer: '词类（自立语）',
    posScope: '名词、代词、数词',
    role: '充当主语、宾语、话题中心',
    linking: '后接助词，如 は/が/を/に',
    example: '学生、これ、三冊',
  },
  {
    key: 'yougen',
    title: '用言',
    layer: '词类（自立语）',
    posScope: '动词、形容词',
    role: '描述动作、性质、状态',
    linking: '根据活用形接助词/助动词',
    example: '書く、楽しい、静かだ',
  },
  {
    key: 'rentaishi',
    title: '连体词',
    layer: '词类（修饰语）',
    role: '直接修饰体言',
    linking: '后面必须接体言',
    example: 'この、ある、どんな',
  },
  {
    key: 'rentaikei',
    title: '连体形',
    layer: '活用形（用言形态）',
    formByPos: [
      '动词：辞书形（書く・食べる・する・来る）',
      'い形容词：原形（高い）',
      'な形容词：词干 + な（静かな）',
    ],
    role: '把用言变成“可修饰体言”的形式',
    linking: '后接体言',
    example: '読む本、静かな部屋',
  },
  {
    key: 'renyoukei',
    title: '连用形',
    layer: '活用形（用言形态）',
    formByPos: [
      '五段动词：い段词干（書き・読み）',
      '一段动词：去る后词干（食べ・見）',
      'サ变/カ变：し・き（します/きます的词干）',
      'い形容词：词干 + く（高く）',
      'な形容词：词干 + に / 词干 + で（静かに・静かで）',
    ],
    role: '连接后项，构成复合语法',
    linking: '后接 ます / て / たい 等',
    example: '読みます、食べて、見たい',
  },
  {
    key: 'shuushikei',
    title: '终止形',
    layer: '活用形（用言形态）',
    formByPos: [
      '动词：辞书形（書く・食べる・する・来る）',
      'い形容词：原形（高い）',
      'な形容词：词干 + だ（静かだ），丁宁体常用「です」',
    ],
    role: '句末收束，完成陈述',
    linking: '常位于句末',
    example: '本を読む。空が青い。',
  },
  {
    key: 'joshi',
    title: '助词',
    layer: '附属词',
    role: '标记成分关系和语气',
    linking: '附着在体言/用言后',
    example: 'は、が、を、に、で、と',
  },
  {
    key: 'jodoushi',
    title: '助动词',
    layer: '附属词',
    role: '补充时态、否定、被动、推量等',
    linking: '接在活用词后',
    example: 'た、ない、れる、そうだ',
  },
  {
    key: 'fukushi',
    title: '副词',
    layer: '词类（修饰语）',
    role: '修饰用言或整个句子',
    linking: '多接在用言前',
    example: 'とても、よく、たぶん',
  },
  {
    key: 'setsuzokushi',
    title: '接续词',
    layer: '词类（独立语）',
    role: '连接句与句、分句与分句',
    linking: '常位于句首或分句开头',
    example: 'しかし、だから、つまり',
  },
];

const IMPORTANT_COMPARISONS = [
  '体言 vs 用言：体言通常不活用；用言可活用且常作谓语核心。',
  '连体词 vs 连体形：连体词是独立词类；连体形是用言活用后用于修饰体言的形式。',
  '连用形 vs 连体形 vs 终止形：连用形偏接续，连体形偏修饰体言，终止形偏句末陈述。',
  '助词 vs 助动词：助词主要标记成分关系；助动词主要补充时态、语态、语气等语法意义。',
  '副词 vs 连体词：副词修饰用言或整句；连体词只修饰体言。',
  '终助词 vs 终止形：终助词是句末语气标记；终止形是谓语的句末形态。',
];

function getLayerChip(layer: string) {
  return layer.split('（')[0];
}

function getLevelMeta(level: string): LevelMeta {
  return (
    LEVEL_META[level] ?? {
      tag: '文法',
      hint: '按等级组织的文法条目',
      accent: colors.primary,
      soft: '#dbeafe',
    }
  );
}

export default function GrammarScreen({ navigation }: Props) {
  const [showTerms, setShowTerms] = useState(false);
  const [expandedTermKey, setExpandedTermKey] = useState<string | null>(null);

  return (
    <FlatList
      style={styles.container}
      data={GRAMMARS}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={(
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>学习前置</Text>
            <Text style={styles.sectionHint}>先过一遍核心名词，再进入速查与等级学习会更顺畅。</Text>
          </View>

          <View style={styles.termCard}>
            <Pressable
              onPress={() => setShowTerms((prev) => !prev)}
              style={({ pressed }) => [styles.termHeaderRow, pressed ? styles.termHeaderRowPressed : null]}
            >
              <View style={styles.termHeaderLeft}>
                <View style={styles.termLeadRow}>
                  <View style={styles.termLeadBadge}>
                    <Ionicons name="bulb-outline" size={12} color="#1d4ed8" />
                    <Text style={styles.termLeadBadgeText}>建议先看</Text>
                  </View>
                </View>
                <Text style={styles.termTitle}>专业名词速览</Text>
                <Text style={styles.termSubtitle}>体言 / 用言 / 活用形 / 助词等核心概念</Text>
              </View>
              <Ionicons name={showTerms ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </Pressable>

            {showTerms ? (
              <View style={styles.termBody}>
                <Text style={styles.tableHint}>点击条目展开详情，按词类快速建立概念框架。</Text>

                {GRAMMAR_TERMS.map((term) => {
                  const expanded = expandedTermKey === term.key;
                  return (
                    <View key={term.key} style={[styles.termItem, expanded ? styles.termItemExpanded : null]}>
                      <Pressable
                        onPress={() => setExpandedTermKey((prev) => (prev === term.key ? null : term.key))}
                        style={({ pressed }) => [styles.termItemHead, pressed ? styles.termItemHeadPressed : null]}
                      >
                        <View style={styles.termItemMainRow}>
                          <Text style={styles.termItemTitle}>{term.title}</Text>
                          <Text style={styles.termMetaChip}>{getLayerChip(term.layer)}</Text>
                        </View>
                        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
                      </Pressable>

                      {expanded ? (
                        <View style={styles.termItemDetail}>
                          {term.posScope ? (
                            <View style={styles.termDetailLine}>
                              <Text style={styles.termDetailLabel}>对应词性</Text>
                              <Text style={styles.termDetailValue}>{term.posScope}</Text>
                            </View>
                          ) : null}
                          {term.formByPos?.length ? (
                            <View style={styles.termDetailLine}>
                              <Text style={styles.termDetailLabel}>活用形（按词性）</Text>
                              <View>
                                {term.formByPos.map((item) => (
                                  <Text key={item} style={styles.termDetailListItem}>
                                    {item}
                                  </Text>
                                ))}
                              </View>
                            </View>
                          ) : null}
                          <View style={styles.termDetailLine}>
                            <Text style={styles.termDetailLabel}>核心作用</Text>
                            <Text style={styles.termDetailValue}>{term.role}</Text>
                          </View>
                          <View style={styles.termDetailLine}>
                            <Text style={styles.termDetailLabel}>典型接续</Text>
                            <Text style={styles.termDetailValue}>{term.linking}</Text>
                          </View>
                          <View style={styles.termDetailLine}>
                            <Text style={styles.termDetailLabel}>例子</Text>
                            <Text style={styles.termDetailValue}>{term.example}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                <View style={styles.termCompareCard}>
                  <Text style={styles.termCompareTitle}>常见对比</Text>
                  {IMPORTANT_COMPARISONS.map((item, index) => (
                    <View
                      key={item}
                      style={[
                        styles.termCompareRow,
                        index === IMPORTANT_COMPARISONS.length - 1 ? styles.termCompareRowLast : null,
                      ]}
                    >
                      <View style={styles.termCompareIndexBadge}>
                        <Text style={styles.termCompareIndexText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.termCompareItem}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.quickSection}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>文法配套速查</Text>
              <Text style={styles.sectionHint}>常用文法速查入口，建议先查后学。</Text>
            </View>
            <View style={styles.quickGrid}>
              {QUICK_ENTRIES.map((entry) => (
                <Pressable
                  key={entry.key}
                  onPress={() => navigation.navigate(entry.route)}
                  style={({ pressed }) => [
                    styles.quickCard,
                    { borderColor: entry.accent, backgroundColor: entry.soft },
                    pressed ? styles.quickCardPressed : null,
                  ]}
                >
                  <View style={styles.quickHead}>
                    <View style={[styles.quickIconWrap, { borderColor: entry.accent }]}>
                      <Ionicons name={entry.icon} size={18} color={entry.accent} />
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={entry.accent} />
                  </View>
                  <Text style={[styles.quickTitle, { color: entry.accent }]}>{entry.title}</Text>
                  <Text style={styles.quickSubtitle}>{entry.subtitle}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>JLPT 文法等级</Text>
            <Text style={styles.sectionHint}>按你的目标等级进入对应文法库。</Text>
          </View>
        </>
      )}
      renderItem={({ item }) => {
        const meta = getLevelMeta(item.id);
        return (
          <Pressable
            onPress={() => navigation.navigate('GrammarList', { level: item.id })}
            style={({ pressed }) => [
              styles.levelCard,
              { borderColor: meta.soft, borderLeftColor: meta.accent },
              pressed ? styles.levelCardPressed : null,
            ]}
          >
            <View style={[styles.levelBadge, { backgroundColor: meta.soft, borderColor: meta.accent }]}>
              <Text style={[styles.levelBadgeLabel, { color: meta.accent }]}>JLPT</Text>
              <Text style={[styles.levelBadgeValue, { color: meta.accent }]}>{item.label}</Text>
            </View>
            <View style={styles.levelInfo}>
              <View style={styles.levelTitleRow}>
                <Text style={styles.levelTitle}>{item.label} 文法</Text>
                <Text style={[styles.levelTag, { backgroundColor: meta.soft, color: meta.accent }]}>
                  {meta.tag}
                </Text>
              </View>
              <Text style={styles.levelHint}>{meta.hint}</Text>
              <Text style={styles.levelCount}>共 {item.items.length} 条</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        );
      }}
    />
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
  quickSection: {
    marginBottom: spacing.m,
  },
  sectionHead: {
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
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickCard: {
    width: '48.5%',
    borderRadius: radius.l,
    borderWidth: 1,
    padding: spacing.s,
    minHeight: 118,
    marginBottom: spacing.s,
  },
  quickCardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  quickHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  quickIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#ffffffaa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickSubtitle: {
    marginTop: spacing.xs,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
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
  termCard: {
    backgroundColor: '#f8fbff',
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: '#ccddf4',
    marginBottom: spacing.m,
    overflow: 'hidden',
  },
  termHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: '#eef4ff',
  },
  termHeaderRowPressed: {
    opacity: 0.8,
  },
  termHeaderLeft: {
    flex: 1,
    paddingRight: spacing.s,
  },
  termLeadRow: {
    marginBottom: 4,
  },
  termLeadBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  termLeadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  termTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  termSubtitle: {
    marginTop: 2,
    color: '#475569',
    fontSize: 12,
  },
  termBody: {
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#fbfdff',
  },
  tableHint: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: spacing.s,
  },
  termItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dde6f2',
    borderRadius: radius.m,
    marginBottom: spacing.s,
  },
  termItemExpanded: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f8fbff',
  },
  termItemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  termItemHeadPressed: {
    opacity: 0.82,
  },
  termItemMainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.s,
  },
  termItemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginRight: spacing.s,
  },
  termMetaChip: {
    fontSize: 11,
    color: '#31557e',
    borderWidth: 1,
    borderColor: '#c9ddf5',
    backgroundColor: '#edf5ff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  termItemDetail: {
    borderTopWidth: 1,
    borderTopColor: '#dbe5f1',
    paddingHorizontal: spacing.s,
    paddingBottom: spacing.s,
    paddingTop: spacing.xs,
  },
  termDetailLine: {
    marginTop: spacing.xs,
  },
  termDetailLabel: {
    color: '#31557e',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  termDetailValue: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
  },
  termDetailListItem: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  termCompareCard: {
    marginTop: spacing.s,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d2e1f2',
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    paddingTop: spacing.s,
    paddingBottom: spacing.xs,
  },
  termCompareTitle: {
    color: '#31557e',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  termCompareRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#e7eef7',
  },
  termCompareRowLast: {
    borderBottomWidth: 0,
    paddingBottom: spacing.xs,
  },
  termCompareIndexBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ecf4ff',
    borderWidth: 1,
    borderColor: '#c9ddf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    marginTop: 1,
  },
  termCompareIndexText: {
    color: '#31557e',
    fontSize: 11,
    fontWeight: '700',
  },
  termCompareItem: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
  },
});
