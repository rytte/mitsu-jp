import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type ClassRow = {
  category: string;
  rule: string;
  examples: string;
  tip: string;
};

type ConjugationRow = {
  form: string;
  iAdjective: string;
  naAdjective: string;
  note?: string;
};

type PatternRow = {
  pattern: string;
  meaning: string;
  example: string;
};

const CLASS_ROWS: ClassRow[] = [
  {
    category: 'い形容词',
    rule: '词典形通常以「い」结尾，直接活用。',
    examples: '高い、安い、面白い、忙しい',
    tip: '否定、过去、连接都在词尾「い」处变化。',
  },
  {
    category: 'な形容词',
    rule: '接名词时加「な」，活用依赖「だ/です」。',
    examples: '静か（な）、便利（な）、有名（な）',
    tip: '和名词句变化方式接近，重点记「じゃない / だった」。',
  },
  {
    category: '特殊：いい',
    rule: '词典形是「いい」，活用词干常用「よ」。',
    examples: 'いい→よくない、よかった',
    tip: '「かっこいい」等复合词也按「よ」活用：かっこよくない。',
  },
];

const CONJUGATION_ROWS: ConjugationRow[] = [
  {
    form: '现在肯定',
    iAdjective: '高い',
    naAdjective: '静かだ / 静かです',
  },
  {
    form: '现在否定',
    iAdjective: '高くない',
    naAdjective: '静かじゃない / 静かではありません',
  },
  {
    form: '过去肯定',
    iAdjective: '高かった',
    naAdjective: '静かだった / 静かでした',
  },
  {
    form: '过去否定',
    iAdjective: '高くなかった',
    naAdjective: '静かじゃなかった / 静かではありませんでした',
  },
  {
    form: '连接形',
    iAdjective: '高くて',
    naAdjective: '静かで',
    note: '用于并列、原因、状态补充。',
  },
  {
    form: '副词形',
    iAdjective: '高く',
    naAdjective: '静かに',
    note: '修饰动词：早く歩く、静かに話す。',
  },
  {
    form: '连体形',
    iAdjective: '高い + 名词',
    naAdjective: '静かな + 名词',
    note: '用于直接修饰名词；い形容词和词典形同形，な形容词需要加「な」。',
  },
  {
    form: '假定形',
    iAdjective: '高ければ',
    naAdjective: '静かなら(ば) / 静かであれば',
    note: '用于“如果……”条件句，常见结构是「〜ければ / 〜なら(ば)」。',
  },
];

const PATTERN_ROWS: PatternRow[] = [
  {
    pattern: 'Aは い形容词',
    meaning: '描述属性',
    example: 'この本は面白いです。',
  },
  {
    pattern: 'Aは な形容词 + です',
    meaning: '礼貌断定',
    example: 'この町は静かです。',
  },
  {
    pattern: 'い形容词 + 名词',
    meaning: '直接修饰名词',
    example: '新しい店、暑い日',
  },
  {
    pattern: 'な形容词 + な + 名词',
    meaning: '接名词必须加「な」',
    example: '便利なアプリ、有名な人',
  },
  {
    pattern: 'Aは Bより 形容词',
    meaning: '比较表达',
    example: '東京は大阪より人が多いです。',
  },
];

const COMMON_MISTAKES: string[] = [
  '不要说「きれいい」；「きれい」是な形容词。',
  'な形容词直接接名词前，必须加「な」（例：静かな部屋）。',
  'い形容词否定不是「〜いじゃない」，应改为「〜くない」。',
  '「いい」活用不用「いくない」，应说「よくない」。',
];

export default function AdjectiveGuideScreen() {
  const topPadding = useScreenTopPadding();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <Text style={styles.pageTitle}>形容词表</Text>
      <Text style={styles.pageSubtitle}>覆盖 い形容词 / な形容词 的判定、活用和常见句型，快速避免高频错误。</Text>

      <View style={styles.introCard}>
        <Text style={styles.introTitle}>先抓核心区别</Text>
        <Text style={styles.introLine}>1. い形容词本身会变形：高い→高くない→高かった。</Text>
        <Text style={styles.introLine}>2. な形容词借助「だ/です」变形：静かだ→静かじゃない→静かだった。</Text>
        <Text style={styles.introHint}>接名词时：い形容词直接接，な形容词要加「な」。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>分类与判定</Text>
        {CLASS_ROWS.map((item, index) => (
          <View key={item.category} style={[styles.classRow, index === CLASS_ROWS.length - 1 ? styles.classRowLast : null]}>
            <Text style={styles.classCategory}>{item.category}</Text>
            <Text style={styles.classRule}>{item.rule}</Text>
            <Text style={styles.classExamples}>例：{item.examples}</Text>
            <Text style={styles.classTip}>提示：{item.tip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>基础活用速查</Text>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.formCell, styles.headerText]}>形态</Text>
          <Text style={[styles.valueCell, styles.headerText]}>い形容词</Text>
          <Text style={[styles.valueCell, styles.headerText]}>な形容词</Text>
        </View>
        {CONJUGATION_ROWS.map((item) => (
          <View key={item.form} style={styles.row}>
            <Text style={styles.formCell}>{item.form}</Text>
            <Text style={styles.valueCell}>{item.iAdjective}</Text>
            <Text style={styles.valueCell}>{item.naAdjective}</Text>
          </View>
        ))}
        {CONJUGATION_ROWS.filter((item) => item.note).map((item) => (
          <Text key={`${item.form}-note`} style={styles.noteText}>
            {item.form}：{item.note}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>高频句型</Text>
        {PATTERN_ROWS.map((item) => (
          <View key={item.pattern} style={styles.patternRow}>
            <View style={styles.patternHead}>
              <Text style={styles.patternText}>{item.pattern}</Text>
              <Text style={styles.patternMeaning}>{item.meaning}</Text>
            </View>
            <Text style={styles.patternExample}>{item.example}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.warnCard]}>
        <Text style={styles.sectionTitle}>易错点</Text>
        {COMMON_MISTAKES.map((item, index) => (
          <Text key={item} style={styles.warnText}>{`${index + 1}. ${item}`}</Text>
        ))}
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
    color: colors.muted,
    lineHeight: 20,
  },
  introCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    borderRadius: radius.l,
    padding: spacing.s,
  },
  introTitle: {
    color: '#3730a3',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  introLine: {
    color: '#334155',
    lineHeight: 20,
    marginBottom: 2,
  },
  introHint: {
    marginTop: spacing.xs,
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    marginTop: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.s,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  classRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: spacing.s,
    marginBottom: spacing.s,
  },
  classRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 0,
  },
  classCategory: {
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  classRule: {
    color: '#334155',
    lineHeight: 19,
  },
  classExamples: {
    marginTop: 4,
    color: '#1d4ed8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  classTip: {
    marginTop: 2,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: spacing.xs,
  },
  headerRow: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.s,
    borderBottomColor: '#dbe4f2',
  },
  headerText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  formCell: {
    width: 72,
    paddingHorizontal: spacing.xs,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  valueCell: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.xs,
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
  },
  noteText: {
    marginTop: spacing.xs,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  patternRow: {
    borderWidth: 1,
    borderColor: '#dbe4f2',
    borderRadius: radius.s,
    backgroundColor: '#f8fafc',
    padding: spacing.s,
    marginBottom: spacing.xs,
  },
  patternHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  patternText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  patternMeaning: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  patternExample: {
    marginTop: spacing.xs,
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
  },
  warnCard: {
    borderColor: '#f2d6a2',
    backgroundColor: '#fffaf2',
    marginBottom: spacing.m,
  },
  warnText: {
    color: '#7c2d12',
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 3,
  },
});
