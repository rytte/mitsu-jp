import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { GRAMMARS } from '../data/grammars';
import { getGrammarLevelMeta } from '../data/levelMeta';
import { GrammarStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<GrammarStackParamList, 'GrammarHome'>;

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

type PitchLevel = 'H' | 'L';

type PitchPattern = {
  key: string;
  title: string;
  contour: string;
  note: string;
  example: string;
  labels: string[];
  levels: PitchLevel[];
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
    title: '形容词表',
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
    key: 'keitaikei',
    title: '敬体形',
    layer: '文体（礼貌层级）',
    formByPos: [
      '动词：ます/ました/ません/ませんでした',
      'い形容词：原形 + です（高いです）',
      'な形容词：词干 + です（静かです）',
      '名词：名词 + です（学生です）',
    ],
    role: '表达礼貌语气，常用于正式或不熟悉关系',
    linking: '常位于句末，也可与接续表达组合',
    example: '行きます。静かです。学生でした。',
  },
  {
    key: 'futsuukei',
    title: '普通形',
    layer: '文体（常体层级）',
    formByPos: [
      '动词：辞书形/た形/ない形（書く・書いた・書かない）',
      'い形容词：原形/过去/否定（高い・高かった・高くない）',
      'な形容词：词干 + だ/だった/ではない',
      '名词：名词 + だ/だった/ではない',
    ],
    role: '表达常体语气，也是多数从句和修饰结构的基础形',
    linking: '可接助词、助动词，常用于简体陈述',
    example: '行く。静かだ。学生ではない。',
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
  '敬体形 vs 普通形：敬体形强调礼貌层级；普通形是简体陈述与多数从句的基础。',
  '助词 vs 助动词：助词主要标记成分关系；助动词主要补充时态、语态、语气等语法意义。',
  '副词 vs 连体词：副词修饰用言或整句；连体词只修饰体言。',
  '终助词 vs 终止形：终助词是句末语气标记；终止形是谓语的句末形态。',
];

const PITCH_ACCENT_PATTERNS: PitchPattern[] = [
  {
    key: 'heiban',
    title: '平板型（0）',
    contour: '第1拍低，随后升高并保持高位',
    note: '后接助词仍保持高位，不会立刻下降',
    example: 'はし（桥）⓪、あした⓪',
    labels: ['1', '2', '3', '助'],
    levels: ['L', 'H', 'H', 'H'],
  },
  {
    key: 'atamadaka',
    title: '头高型（1）',
    contour: '第1拍高，第2拍开始下降',
    note: '起点高、很快下落，辨识度高',
    example: 'あめ（雨）①、いま①',
    labels: ['1', '2', '3', '助'],
    levels: ['H', 'L', 'L', 'L'],
  },
  {
    key: 'nakadaka',
    title: '中高型（2～n-1）',
    contour: '前低后高，在词中某拍后下降',
    note: '高点出现在中间，后部回落',
    example: 'あなた②、つかれる③、あたらしい④、ごめんなさい⑤',
    labels: ['1', '2', '3', '助'],
    levels: ['L', 'H', 'L', 'L'],
  },
  {
    key: 'odaka',
    title: '尾高型（n）',
    contour: '词内上升并在词尾保持高位',
    note: '后接助词时在助词前后出现下降',
    example: 'はな（花）②、おとこ③、いもうと④、こんにちは⑤',
    labels: ['1', '2', '3', '助'],
    levels: ['L', 'H', 'H', 'L'],
  },
];

const PITCH_ACCENT_TIPS = [
  'n 表示该词的总拍数（モーラ数）；例如 ことば 是 3 拍，所以它的 n=3。',
  '关注在哪一拍下降是核心，比如⓪型无下降，①型在第1拍后下降，②型在第2拍后下降，以此类推。',
  '同形词常靠音调区分：如「あめ」可因音调不同表示“雨/糖”。',
  '实际音调存在地域差，学习时先以标准语（东京式）为基准即可。',
];

const PITCH_GRAPH = {
  width: 320,
  height: 82,
  x: [22, 108, 194, 280],
  yHigh: 14,
  yLow: 48,
  labelY: 72,
};

function getLayerChip(layer: string) {
  return layer.split('（')[0];
}

function getPitchY(level: PitchLevel) {
  return level === 'H' ? PITCH_GRAPH.yHigh : PITCH_GRAPH.yLow;
}

export default function GrammarScreen({ navigation }: Props) {
  const [showTerms, setShowTerms] = useState(false);
  const [showPitch, setShowPitch] = useState(false);
  const [expandedTermKey, setExpandedTermKey] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        style={styles.list}
        data={GRAMMARS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>学习前置</Text>
            <Text style={styles.sectionHint}>核心名词与术语速览，便于快速定位概念。</Text>
          </View>

          <View style={styles.termCard}>
            <Pressable
              onPress={() => setShowTerms((prev) => !prev)}
              style={({ pressed }) => [styles.termHeaderRow, pressed ? styles.termHeaderRowPressed : null]}
            >
              <View style={styles.termHeaderLeft}>
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

          <View style={styles.pitchCard}>
            <Pressable
              onPress={() => setShowPitch((prev) => !prev)}
              style={({ pressed }) => [styles.pitchHeaderRow, pressed ? styles.pitchHeaderRowPressed : null]}
            >
              <View style={styles.pitchHeaderLeft}>
                <Text style={styles.pitchTitle}>日语音调速览</Text>
                <Text style={styles.pitchSubtitle}>日语是高低音调语言，核心看“在哪一拍下降”。</Text>
              </View>
              <Ionicons name={showPitch ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </Pressable>

            {showPitch ? (
              <View style={styles.pitchBody}>
                <View style={styles.pitchPatternWrap}>
                  {PITCH_ACCENT_PATTERNS.map((item) => (
                    <View key={item.key} style={styles.pitchPatternItem}>
                      <Text style={styles.pitchPatternTitle}>{item.title}</Text>
                      <View style={styles.pitchGraphCard}>
                        <Svg
                          width="100%"
                          height={PITCH_GRAPH.height}
                          viewBox={`0 0 ${PITCH_GRAPH.width} ${PITCH_GRAPH.height}`}
                        >
                          <SvgLine
                            x1={4}
                            y1={PITCH_GRAPH.yHigh}
                            x2={PITCH_GRAPH.width - 4}
                            y2={PITCH_GRAPH.yHigh}
                            stroke="#d6e3f3"
                            strokeWidth={1}
                          />
                          <SvgLine
                            x1={4}
                            y1={PITCH_GRAPH.yLow}
                            x2={PITCH_GRAPH.width - 4}
                            y2={PITCH_GRAPH.yLow}
                            stroke="#d6e3f3"
                            strokeWidth={1}
                          />

                          {item.levels.map((level, index) => {
                            if (index === item.levels.length - 1) {
                              return null;
                            }
                            return (
                              <SvgLine
                                key={`${item.key}-line-${item.labels[index]}`}
                                x1={PITCH_GRAPH.x[index]}
                                y1={getPitchY(level)}
                                x2={PITCH_GRAPH.x[index + 1]}
                                y2={getPitchY(item.levels[index + 1])}
                                stroke="#5078a6"
                                strokeWidth={2}
                                strokeLinecap="round"
                              />
                            );
                          })}

                          {item.levels.map((level, index) => (
                            <SvgCircle
                              key={`${item.key}-dot-${item.labels[index]}`}
                              cx={PITCH_GRAPH.x[index]}
                              cy={getPitchY(level)}
                              r={3.5}
                              fill="#31557e"
                              stroke="#ffffff"
                              strokeWidth={1}
                            />
                          ))}

                          {item.labels.map((label, index) => (
                            <SvgText
                              key={`${item.key}-label-${label}`}
                              x={PITCH_GRAPH.x[index]}
                              y={PITCH_GRAPH.labelY}
                              fill="#31557e"
                              fontSize="11"
                              fontWeight="700"
                              textAnchor="middle"
                            >
                              {label}
                            </SvgText>
                          ))}

                        </Svg>
                      </View>
                      <Text style={styles.pitchPatternLine}>音高走向：{item.contour}</Text>
                      <Text style={styles.pitchPatternLine}>识别要点：{item.note}</Text>
                      <Text style={styles.pitchPatternExample}>例：{item.example}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.pitchTipCard}>
                  <Text style={styles.pitchTipTitle}>学习提示</Text>
                  {PITCH_ACCENT_TIPS.map((tip) => (
                    <Text key={tip} style={styles.pitchTipItem}>
                      {`• ${tip}`}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.quickSection}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>文法配套速查</Text>
              <Text style={styles.sectionHint}>常用文法速查入口，方便随时查阅。</Text>
            </View>
            <View style={styles.quickGrid}>
              {QUICK_ENTRIES.map((entry) => (
                <Pressable
                  key={entry.key}
                  onPress={() => navigation.navigate(entry.route)}
                  style={({ pressed }) => [
                    styles.quickCard,
                    { borderColor: entry.accent },
                    pressed ? styles.quickCardPressed : null,
                  ]}
                >
                  <View style={styles.quickHead}>
                    <View style={styles.quickHeadLeft}>
                      <View
                        style={[
                          styles.quickIconWrap,
                          { borderColor: entry.accent, backgroundColor: entry.soft },
                        ]}
                      >
                        <Ionicons name={entry.icon} size={18} color={entry.accent} />
                      </View>
                      <Text style={[styles.quickTitle, { color: entry.accent }]}>{entry.title}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={entry.accent} />
                  </View>
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
        const meta = getGrammarLevelMeta(item.id);
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
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
    minHeight: 110,
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
  quickHeadLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.s,
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
    marginLeft: spacing.xs,
    flexShrink: 1,
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
  pitchCard: {
    backgroundColor: '#f8fbff',
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: '#ccddf4',
    marginBottom: spacing.m,
    overflow: 'hidden',
  },
  pitchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: '#eef4ff',
  },
  pitchHeaderRowPressed: {
    opacity: 0.82,
  },
  pitchHeaderLeft: {
    flex: 1,
    paddingRight: spacing.s,
  },
  pitchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  pitchSubtitle: {
    marginTop: 4,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  pitchBody: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#fbfdff',
  },
  pitchPatternWrap: {
    marginTop: spacing.xs,
  },
  pitchPatternItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dde6f2',
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    marginBottom: spacing.s,
  },
  pitchPatternTitle: {
    color: '#31557e',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  pitchGraphCard: {
    marginTop: spacing.xs,
    marginBottom: 4,
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dbe7f4',
    borderRadius: radius.s,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: 1,
  },
  pitchPatternLine: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
  },
  pitchPatternExample: {
    marginTop: 2,
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
  },
  pitchTipCard: {
    marginTop: spacing.xs,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d2e1f2',
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  pitchTipTitle: {
    color: '#31557e',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  pitchTipItem: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
});

