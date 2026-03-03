import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { GRAMMARS } from '../data/grammars';
import { GrammarStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<GrammarStackParamList, 'GrammarLevel'>;

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

export default function GrammarLevelScreen({ navigation }: Props) {
  const [showTerms, setShowTerms] = useState(false);
  const [expandedTermKey, setExpandedTermKey] = useState<string | null>(null);

  return (
    <FlatList
      style={styles.container}
      data={GRAMMARS}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={(
        <>
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>文法学习</Text>
            <Text style={styles.headerText}>选择等级开始浏览文法</Text>
          </View>

          <View style={styles.termCard}>
            <Pressable
              onPress={() => setShowTerms((prev) => !prev)}
              style={({ pressed }) => [styles.termHeaderRow, pressed ? styles.termHeaderRowPressed : null]}
            >
              <View style={styles.termHeaderLeft}>
                <Text style={styles.termTitle}>专业名词速览</Text>
                <Text style={styles.termSubtitle}>体言 / 用言 / 连体词 / 连体形等</Text>
              </View>
              <Ionicons
                name={showTerms ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.muted}
              />
            </Pressable>

            {showTerms ? (
              <View style={styles.termBody}>
                <Text style={styles.tableHint}>点击条目展开详情，纵向浏览即可完成对比</Text>

                {GRAMMAR_TERMS.map((term) => {
                  const expanded = expandedTermKey === term.key;
                  return (
                    <View key={term.key} style={[styles.termItem, expanded ? styles.termItemExpanded : null]}>
                      <Pressable
                        onPress={() =>
                          setExpandedTermKey((prev) => (prev === term.key ? null : term.key))
                        }
                        style={({ pressed }) => [styles.termItemHead, pressed ? styles.termItemHeadPressed : null]}
                      >
                        <View style={styles.termItemMainRow}>
                          <View style={styles.termItemTitleSlot}>
                            <Text style={styles.termItemTitle}>{term.title}</Text>
                          </View>
                          <View style={styles.termItemMetaCol}>
                            <View style={styles.termItemMetaRow}>
                              <Text style={styles.termMetaChip}>{getLayerChip(term.layer)}</Text>
                            </View>
                          </View>
                        </View>
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.muted}
                        />
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
                  <View style={styles.termCompareHeadRow}>
                    <Text style={styles.termCompareTitle}>常见对比</Text>
                    <Text style={styles.termCompareHint}>高频易混点</Text>
                  </View>
                  {IMPORTANT_COMPARISONS.map((item, index) => {
                    const [pairPart, detailPart = ''] = item.split('：');
                    const [leftPart, rightPart] = pairPart.split(/\s+vs\s+/i);
                    const canHighlightPair = Boolean(leftPart && rightPart);
                    return (
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
                        {canHighlightPair ? (
                          <Text style={styles.termCompareItem}>
                            <Text style={styles.termCompareLeftTerm}>{leftPart.trim()}</Text>
                            <Text style={styles.termCompareVs}> vs </Text>
                            <Text style={styles.termCompareRightTerm}>{rightPart.trim()}</Text>
                            <Text style={styles.termCompareColon}>：</Text>
                            <Text style={styles.termCompareDetail}> {detailPart.trim()}</Text>
                          </Text>
                        ) : (
                          <Text style={styles.termCompareItem}>{item}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        </>
      )}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('GrammarList', { level: item.id })}
          style={({ pressed }) => [styles.levelCard, pressed ? styles.levelCardPressed : null]}
        >
          <View style={styles.levelLeft}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeLabel}>JLPT</Text>
              <Text style={styles.levelBadgeValue}>{item.label}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>文法库</Text>
              <Text style={styles.levelSubtitle}>共 {item.items.length} 条</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      )}
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
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  headerText: {
    color: colors.muted,
  },
  termCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
    overflow: 'hidden',
  },
  termHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
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
    color: colors.text,
  },
  termSubtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },
  termBody: {
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#f8fbff',
  },
  tableHint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.s,
  },
  termItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe5f1',
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
    justifyContent: 'flex-start',
    paddingRight: spacing.s,
  },
  termItemTitleSlot: {
    width: 72,
  },
  termItemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  termItemMetaCol: {
    flex: 1,
    marginLeft: spacing.m,
    alignItems: 'flex-start',
  },
  termItemMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  termMetaChip: {
    fontSize: 11,
    color: '#33567f',
    borderWidth: 1,
    borderColor: '#c9ddf5',
    backgroundColor: '#edf5ff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginVertical: 2,
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d2e1f2',
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    paddingTop: spacing.s,
    paddingBottom: spacing.xs,
  },
  termCompareHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#e7eef7',
  },
  termCompareTitle: {
    color: '#31557e',
    fontSize: 13,
    fontWeight: '700',
  },
  termCompareHint: {
    color: '#64748b',
    fontSize: 11,
  },
  termCompareRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
    paddingHorizontal: spacing.xs,
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
  termCompareLeftTerm: {
    color: '#1e40af',
    fontWeight: '700',
  },
  termCompareVs: {
    color: '#64748b',
    fontWeight: '600',
  },
  termCompareRightTerm: {
    color: '#0f766e',
    fontWeight: '700',
  },
  termCompareColon: {
    color: '#334155',
    fontWeight: '600',
  },
  termCompareDetail: {
    color: '#334155',
  },
  levelCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelCardPressed: {
    opacity: 0.7,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.s,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.m,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  levelBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primaryDark,
  },
  levelBadgeValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  levelSubtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
    fontSize: 12,
  },
});
