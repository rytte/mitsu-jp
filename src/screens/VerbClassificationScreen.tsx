import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type VerbClassRow = {
  key: string;
  category: string;
  rule: string;
  examples: string;
  details: string;
  warning?: string;
};

type ExceptionRow = {
  verb: string;
  meaning: string;
};

type TransitivityRow = {
  intransitive: string;
  transitive: string;
  meaning: string;
  intransitiveExample: string;
  transitiveExample: string;
};

const VERB_CLASS_ROWS: VerbClassRow[] = [
  {
    key: 'godan',
    category: '五段动词（I类）',
    rule: '词尾在「う段」，变形时词尾在 a/i/u/e/o 段切换',
    examples: '書く / 読む / 話す / 待つ / 買う',
    details:
      '常见结尾：う・く・ぐ・す・つ・ぬ・ぶ・む・る。ます形通常是词尾换到 i 段后加 ます，如「書く→書きます」。',
    warning: '即使是「～いる / ～える」结尾，也可能是五段（例：入る、走る、帰る）。',
  },
  {
    key: 'ichidan',
    category: '一段动词（II类）',
    rule: '多为「～いる / ～える」，变形时去掉「る」再接词尾',
    examples: '食べる / 見る / 起きる / 借りる / 教える',
    details:
      'ます形通常是词干 + ます，如「食べる→食べます」。可能形、被动形常为「～られる」。',
  },
  {
    key: 'suru',
    category: 'サ变（する）',
    rule: '「する」及「～する」复合词，属于不规则动词',
    examples: 'する / 勉強する / 練習する / 連絡する',
    details:
      '核心变化：する→します / しない / して / した。可能形通常是「できる」。',
  },
  {
    key: 'kuru',
    category: 'カ变（来る）',
    rule: '只有「来る（くる）」一个核心不规则动词',
    examples: '来る（くる）',
    details:
      '核心变化：来ます（きます）/ 来ない（こない）/ 来て（きて）/ 来た（きた）/ 来よう（こよう）。',
  },
];

const GODAN_ICHIDAN_STEPS: Array<{ title: string; detail: string }> = [
  {
    title: '先排除不规则',
    detail: '「する」和「来る（くる）」不按五段/一段规则，单独记忆。',
  },
  {
    title: '看结尾是否是「る」',
    detail: '不是「る」结尾时，通常按五段动词判断（例：書く、読む、話す）。',
  },
  {
    title: '若是「る」结尾',
    detail: '前一假名在 i/e 段时，先按一段判断（例：食べる、見る）。',
  },
  {
    title: '最后核对例外词',
    detail: '「～いる / ～える」里也有五段例外（如：入る、走る、帰る、要る）。',
  },
];

const TRANSITIVITY_JUDGE_STEPS: Array<{ title: string; detail: string }> = [
  {
    title: '「～す」结尾多为他动词，尤其 「aす / oす」',
    detail: '',
  },
  {
    title: '「～eる」结尾多为他动词，「～れる」除外',
    detail: '',
  },
  {
    title: '上述的例外：可能态、出る、冷める。',
    detail: '',
  },
  {
    title: '其余都是自动词或自他双性词',
    detail: '',
  },
];

const TRANSITIVITY_SPECIAL_NOTES: string[] = [
  '“先按自动词，再回句子修正”是实用策略，避免死记硬判。',
  '遇到双性词时，优先看句中助词（が / を）和动作施事者。',
];

const GODAN_EXCEPTIONS: ExceptionRow[] = [
  { verb: '要る（いる）', meaning: '需要' },
  { verb: '入る（はいる）', meaning: '进入' },
  { verb: '走る（はしる）', meaning: '跑' },
  { verb: '帰る（かえる）', meaning: '回去' },
  { verb: '切る（きる）', meaning: '切' },
  { verb: '知る（しる）', meaning: '知道' },
  { verb: '減る（へる）', meaning: '减少' },
  { verb: '滑る（すべる）', meaning: '滑' },
  { verb: '焦る（あせる）', meaning: '着急' },
  { verb: '参る（まいる）', meaning: '来 / 去（自谦）' },
  { verb: '限る（かぎる）', meaning: '限定' },
  { verb: '握る（にぎる）', meaning: '握' },
  { verb: '混じる（まじる）', meaning: '混杂' },
  { verb: '交じる（まじる）', meaning: '夹杂' },
  { verb: '嘲る（あざける）', meaning: '嘲笑' },
  { verb: '蹴る（ける）', meaning: '踢' },
  { verb: '遮る（さえぎる）', meaning: '遮挡' },
  { verb: '茂る（しげる）', meaning: '茂盛' },
  { verb: '捻る（ひねる）', meaning: '拧 / 扭' },
  { verb: '喋る（しゃべる）', meaning: '说话（口语）' },
  { verb: '照る（てる）', meaning: '照耀 / 放晴' },
  { verb: '練る（ねる）', meaning: '揉 / 推敲' },
  { verb: '覆る（くつがえる）', meaning: '被推翻 / 颠覆' },
  { verb: '蘇る（よみがえる）', meaning: '复苏 / 复活' },
  { verb: '煎る（いる）', meaning: '烘炒（豆、芝麻等）' },
  { verb: '炒る（いる）', meaning: '炒（坚果、豆类等）' },
  { verb: '罵る（ののしる）', meaning: '辱骂' },
];

const TRANSITIVITY_NOTES: string[] = [
  '自动词：表示状态自然变化，常见句型是「N が V」。',
  '他动词：表示对对象施加动作，常见句型是「N を V」。',
  '判断重点：看“谁在变化”还是“谁让它变化”。',
  '实战记忆：成对背（开/打开、关/关上）比单独背更稳。',
];

const TRANSITIVITY_ROWS: TransitivityRow[] = [
  {
    intransitive: '開く（あく）',
    transitive: '開ける（あける）',
    meaning: '开 / 打开',
    intransitiveExample: 'ドアが開く',
    transitiveExample: 'ドアを開ける',
  },
  {
    intransitive: '閉まる（しまる）',
    transitive: '閉める（しめる）',
    meaning: '关 / 关上',
    intransitiveExample: 'ドアが閉まる',
    transitiveExample: 'ドアを閉める',
  },
  {
    intransitive: '始まる（はじまる）',
    transitive: '始める（はじめる）',
    meaning: '开始 / 开始（某事）',
    intransitiveExample: '会議が始まる',
    transitiveExample: '会議を始める',
  },
  {
    intransitive: '止まる（とまる）',
    transitive: '止める（とめる）',
    meaning: '停止 / 使停止',
    intransitiveExample: '車が止まる',
    transitiveExample: '車を止める',
  },
  {
    intransitive: '上がる（あがる）',
    transitive: '上げる（あげる）',
    meaning: '上升 / 提高',
    intransitiveExample: '温度が上がる',
    transitiveExample: '温度を上げる',
  },
  {
    intransitive: '下がる（さがる）',
    transitive: '下げる（さげる）',
    meaning: '下降 / 降低',
    intransitiveExample: '値段が下がる',
    transitiveExample: '値段を下げる',
  },
  {
    intransitive: '入る（はいる）',
    transitive: '入れる（いれる）',
    meaning: '进入 / 放入',
    intransitiveExample: '水が入る',
    transitiveExample: '水を入れる',
  },
  {
    intransitive: '出る（でる）',
    transitive: '出す（だす）',
    meaning: '出来 / 拿出',
    intransitiveExample: 'ゴミが出る',
    transitiveExample: 'ゴミを出す',
  },
  {
    intransitive: '消える（きえる）',
    transitive: '消す（けす）',
    meaning: '消失 / 消除',
    intransitiveExample: '電気が消える',
    transitiveExample: '電気を消す',
  },
  {
    intransitive: '壊れる（こわれる）',
    transitive: '壊す（こわす）',
    meaning: '坏掉 / 弄坏',
    intransitiveExample: '時計が壊れる',
    transitiveExample: '時計を壊す',
  },
];

function HeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cellCategory, styles.headerText]}>分类</Text>
      <Text style={[styles.cellRule, styles.headerText]}>判定规则</Text>
    </View>
  );
}

type ClassRowItemProps = {
  row: VerbClassRow;
  active: boolean;
  onPress: () => void;
};

function ClassRowItem({ row, active, onPress }: ClassRowItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, styles.pressableRow, active ? styles.activeRow : null, pressed ? styles.pressedRow : null]}>
      <Text style={[styles.cellCategory, styles.categoryText, active ? styles.categoryTextActive : null]}>{row.category}</Text>
      <Text style={[styles.cellRule, styles.valueText, active ? styles.valueTextActive : null]}>{row.rule}</Text>
    </Pressable>
  );
}

export default function VerbClassificationScreen() {
  const topPadding = useScreenTopPadding();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAllExceptions, setShowAllExceptions] = useState(false);

  const handleToggle = (key: string) => setSelectedKey((value) => (value === key ? null : key));
  const visibleExceptions = showAllExceptions ? GODAN_EXCEPTIONS : GODAN_EXCEPTIONS.slice(0, 8);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <Text style={styles.pageTitle}>动词分类表</Text>
      <Text style={styles.pageSubtitle}>快速区分五段 / 一段 / サ变 / カ变，并掌握自动词/他动词与常见例外词。</Text>

      <View style={styles.introCard}>
        <Text style={styles.introTitle}>先区分这两条主线</Text>
        <Text style={styles.introLine}>
          根据动词
          <Text style={styles.introStrong}>词尾的活用变形</Text>
          ，可以分为五段动词、一段动词、不规则动词。
        </Text>
        <Text style={styles.introLine}>
          根据动词
          <Text style={styles.introStrong}>是否需要宾语</Text>
          ，可以分为自动词、他动词。
        </Text>
        <Text style={styles.introHint}>自他动词涉及句意，五一段动词涉及变形。</Text>
      </View>

      <View style={styles.groupLabelWrap}>
        <View style={[styles.groupLabelCard, styles.groupLabelCardConjugation]}>
          <View style={[styles.groupLabelAccent, styles.groupLabelAccentConjugation]} />
          <Text style={[styles.groupLabelText, styles.groupLabelTextConjugation]}>活用分类：五段 / 一段 / 不规则</Text>
        </View>
      </View>

      <View style={[styles.card, styles.conjugationCard]}>
        <HeaderRow />
        {VERB_CLASS_ROWS.map((row) => {
          const expanded = selectedKey === row.key;
          return (
            <View key={row.key} style={[styles.expandWrap, expanded ? styles.expandWrapActive : null]}>
              <ClassRowItem row={row} active={expanded} onPress={() => handleToggle(row.key)} />
              {expanded ? (
                <View style={styles.inlineCard}>
                  <Text style={styles.inlineTitle}>例词</Text>
                  <Text style={styles.inlineText}>{row.examples}</Text>
                  <Text style={[styles.inlineTitle, styles.inlineSectionTitle]}>说明</Text>
                  <Text style={styles.inlineText}>{row.details}</Text>
                  {row.warning ? (
                    <>
                      <Text style={styles.inlineWarnTitle}>注意</Text>
                      <Text style={styles.inlineWarnText}>{row.warning}</Text>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={[styles.card, styles.sectionCard, styles.conjugationCard]}>
        <Text style={styles.sectionTitle}>五段 / 一段判断</Text>
        <Text style={styles.sectionHint}>判断动词活用类别（五段 or 一段）。</Text>
        {GODAN_ICHIDAN_STEPS.map((item, index) => (
          <View key={item.title} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{index + 1}</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={[styles.stepTitle, item.detail.trim().length > 0 ? styles.stepTitleWithDetail : null]}>{item.title}</Text>
              {item.detail.trim().length > 0 ? <Text style={styles.stepText}>{item.detail}</Text> : null}
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.sectionCard, styles.conjugationCard]}>
        <Text style={styles.sectionTitle}>「～いる / ～える」五段例外（完整词表）</Text>
        <Text style={styles.sectionHint}>这些词不要误判成一段动词，以下按常见教学词汇完整列举。</Text>
        {visibleExceptions.map((item) => (
          <View key={item.verb} style={styles.exceptionRow}>
            <Text style={styles.exceptionVerb}>{item.verb}</Text>
            <Text style={styles.exceptionMeaning}>{item.meaning}</Text>
          </View>
        ))}
        {GODAN_EXCEPTIONS.length > 8 ? (
          <Pressable
            onPress={() => setShowAllExceptions((prev) => !prev)}
            style={({ pressed }) => [styles.exceptionToggleBtn, pressed ? styles.exceptionToggleBtnPressed : null]}
            accessibilityRole="button"
            accessibilityLabel={showAllExceptions ? '收起例外词' : '展开例外词'}
          >
            <Ionicons name={showAllExceptions ? 'chevron-up' : 'chevron-down'} size={16} color="#1d4ed8" />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.groupLabelWrap, styles.groupLabelWrapSection]}>
        <View style={[styles.groupLabelCard, styles.groupLabelCardTransitivity]}>
          <View style={[styles.groupLabelAccent, styles.groupLabelAccentTransitivity]} />
          <Text style={[styles.groupLabelText, styles.groupLabelTextTransitivity]}>句义分类：自动词 / 他动词</Text>
        </View>
      </View>

      <View style={[styles.card, styles.transitivityCard, styles.groupFirstCard]}>
        <Text style={styles.sectionTitle}>自动词 / 他动词分类</Text>
        {TRANSITIVITY_NOTES.map((note) => (
          <Text key={note} style={styles.noteLine}>
            {note}
          </Text>
        ))}

        <View style={styles.transitivityTable}>
          <View style={[styles.row, styles.transitivityHeaderRow]}>
            <Text style={[styles.transitivityCellVerb, styles.headerText]}>自动词</Text>
            <Text style={[styles.transitivityCellVerb, styles.headerText]}>他动词</Text>
            <Text style={[styles.transitivityCellMeaning, styles.headerText]}>含义</Text>
          </View>
          {TRANSITIVITY_ROWS.map((item) => (
            <View key={`${item.intransitive}-${item.transitive}`} style={styles.transitivityPairBlock}>
              <View style={[styles.row, styles.transitivityDataRow]}>
                <Text style={[styles.transitivityCellVerb, styles.transitivityVerbText]}>{item.intransitive}</Text>
                <Text style={[styles.transitivityCellVerb, styles.transitivityVerbText]}>{item.transitive}</Text>
                <Text style={[styles.transitivityCellMeaning, styles.transitivityMeaningText]}>{item.meaning}</Text>
              </View>
              <Text style={styles.transitivityExampleText}>
                自：{item.intransitiveExample} ｜ 他：{item.transitiveExample}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, styles.sectionCard, styles.transitivityCard]}>
        <Text style={styles.sectionTitle}>自动词 / 他动词判断</Text>

        {TRANSITIVITY_JUDGE_STEPS.map((item, index) => (
          <View key={item.title} style={[styles.stepRow, styles.judgeStepRow]}>
            <View style={[styles.stepBadge, styles.judgeStepBadge]}>
              <Text style={[styles.stepBadgeText, styles.judgeStepBadgeText]}>{index + 1}</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text
                style={[
                  styles.stepTitle,
                  styles.judgeStepTitle,
                  item.detail.trim().length > 0 ? styles.stepTitleWithDetail : null,
                ]}
              >
                {item.title}
              </Text>
              {item.detail.trim().length > 0 ? <Text style={[styles.stepText, styles.judgeStepText]}>{item.detail}</Text> : null}
            </View>
          </View>
        ))}
        <View style={styles.judgeTipsWrap}>
          {TRANSITIVITY_SPECIAL_NOTES.map((note) => (
            <Text key={note} style={styles.judgeTipText}>
              {note}
            </Text>
          ))}
        </View>
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
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  pageSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.s,
    color: colors.muted,
    lineHeight: 20,
  },
  introCard: {
    backgroundColor: '#fffaf2',
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: '#f2d6a2',
    padding: spacing.s,
    marginBottom: spacing.m,
  },
  introTitle: {
    color: '#7c2d12',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  introLine: {
    color: '#334155',
    lineHeight: 21,
    marginBottom: spacing.xs,
  },
  introStrong: {
    color: '#92400e',
    fontWeight: '700',
  },
  introHint: {
    marginTop: 2,
    color: '#7c5a2f',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  groupLabelWrap: {
    marginBottom: spacing.xs,
  },
  groupLabelWrapSection: {
    marginTop: spacing.m + 4,
  },
  groupFirstCard: {
    marginTop: spacing.xs,
  },
  groupLabelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.s,
    borderWidth: 1,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  groupLabelCardConjugation: {
    borderColor: '#d8e5fb',
    backgroundColor: '#f8fbff',
  },
  groupLabelCardTransitivity: {
    borderColor: '#d2ebdd',
    backgroundColor: '#f7fcf9',
  },
  groupLabelAccent: {
    width: 4,
    height: 16,
    borderRadius: 999,
    marginRight: spacing.xs,
  },
  groupLabelAccentConjugation: {
    backgroundColor: '#2563eb',
  },
  groupLabelAccentTransitivity: {
    backgroundColor: '#16a34a',
  },
  groupLabelText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  groupLabelTextConjugation: {
    color: '#1e40af',
  },
  groupLabelTextTransitivity: {
    color: '#166534',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.s,
  },
  conjugationCard: {
    borderColor: '#bfdbfe',
  },
  transitivityCard: {
    borderColor: '#bbf7d0',
  },
  sectionCard: {
    marginTop: spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.s,
  },
  pressableRow: {
    paddingHorizontal: spacing.xs,
    borderRadius: radius.s,
  },
  headerRow: {
    borderBottomWidth: 0,
    backgroundColor: '#f8fafc',
    borderRadius: radius.s,
    marginBottom: spacing.s,
  },
  pressedRow: {
    opacity: 0.9,
  },
  activeRow: {
    backgroundColor: '#eef5ff',
    borderBottomColor: '#c7dbf9',
  },
  headerText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  cellCategory: {
    width: 110,
    fontSize: 12,
    paddingHorizontal: spacing.xs,
  },
  cellRule: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    paddingHorizontal: spacing.xs,
  },
  categoryText: {
    color: colors.primaryDark,
    fontWeight: '700',
    lineHeight: 18,
  },
  categoryTextActive: {
    color: '#1d4ed8',
  },
  valueText: {
    color: '#51627a',
    fontWeight: '500',
    lineHeight: 18,
  },
  valueTextActive: {
    color: '#355582',
    fontWeight: '600',
  },
  expandWrap: {
    backgroundColor: colors.card,
  },
  expandWrapActive: {
    borderWidth: 1,
    borderColor: '#c7dbf9',
    borderRadius: radius.s,
    marginBottom: spacing.xs,
    backgroundColor: '#eef5ff',
  },
  inlineCard: {
    borderBottomLeftRadius: radius.s,
    borderBottomRightRadius: radius.s,
    backgroundColor: '#f3f8ff',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  inlineTitle: {
    color: '#2f5d9c',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineSectionTitle: {
    marginTop: spacing.s,
  },
  inlineText: {
    marginTop: spacing.xs,
    color: '#3f4f63',
    lineHeight: 20,
    fontSize: 13,
  },
  inlineWarnTitle: {
    marginTop: spacing.s,
    color: '#92400e',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineWarnText: {
    marginTop: spacing.xs,
    color: '#7c2d12',
    lineHeight: 20,
    fontSize: 13,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  sectionHint: {
    color: colors.muted,
    marginBottom: spacing.s,
  },
  noteLine: {
    color: '#3f4f63',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.s,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
    marginTop: 1,
  },
  stepBadgeText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    color: '#3f4f63',
    lineHeight: 20,
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  stepTitleWithDetail: {
    marginBottom: 2,
  },
  judgeStepRow: {
    marginBottom: spacing.xs,
  },
  judgeStepBadge: {
    backgroundColor: '#eaf1ff',
  },
  judgeStepBadgeText: {
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: 11,
  },
  judgeStepTitle: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 19,
  },
  judgeStepText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  judgeTipsWrap: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: spacing.s,
  },
  judgeTipText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  transitivityTable: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#dbe4f2',
    borderRadius: radius.s,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  transitivityHeaderRow: {
    borderBottomColor: '#dbe4f2',
    backgroundColor: '#f8fafc',
    paddingHorizontal: spacing.xs,
  },
  transitivityDataRow: {
    borderBottomWidth: 0,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  transitivityPairBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  transitivityCellVerb: {
    flex: 1.2,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
  },
  transitivityCellMeaning: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
  },
  transitivityVerbText: {
    color: colors.text,
    fontWeight: '600',
  },
  transitivityMeaningText: {
    color: colors.muted,
    fontWeight: '500',
  },
  transitivityExampleText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: spacing.s,
    paddingBottom: 2,
  },
  exceptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: spacing.xs,
  },
  exceptionVerb: {
    color: colors.text,
    fontWeight: '600',
  },
  exceptionMeaning: {
    color: colors.muted,
  },
  exceptionToggleBtn: {
    marginTop: spacing.xs,
    alignSelf: 'stretch',
    minHeight: 20,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exceptionToggleBtnPressed: {
    opacity: 0.8,
  },
});
