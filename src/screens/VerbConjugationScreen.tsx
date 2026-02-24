import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type TableRow = {
  form: string;
  ichidan: string;
  godan: string;
  suru: string;
  kuru: string;
};

type OverviewRow = {
  form: string;
  meaning: string;
  godanRule: string;
  ichidanRule: string;
};

const FORM_OVERVIEW_ROWS: OverviewRow[] = [
  { form: '辞书形', meaning: '词典原形，是所有变形起点。', godanRule: '词尾保持 u 段原形。', ichidanRule: '原形通常以「る」结尾。' },
  { form: 'ます形', meaning: '礼貌体基础形。', godanRule: '词尾改 i 段 + ます。', ichidanRule: '词干 + ます。' },
  { form: 'て形', meaning: '连接、请求、进行时等高频形。', godanRule: '按音便变化（って/んで/いて/いで/して）。', ichidanRule: '词干 + て。' },
  { form: 'た形', meaning: '过去时基础形。', godanRule: '与て形对应音便（った/んだ/いた/いだ/した）。', ichidanRule: '词干 + た。' },
  { form: 'ない形', meaning: '否定基础形。', godanRule: '词尾改 a 段 + ない（う->わ）。', ichidanRule: '词干 + ない。' },
  { form: '意向形', meaning: '表示“要做……”“打算……”。', godanRule: '词尾改 o 段 + う。', ichidanRule: '词干 + よう。' },
  { form: '命令形', meaning: '直接命令语气。', godanRule: '词尾改 e 段。', ichidanRule: '词干 + ろ（口语）/ よ（书面）。' },
  { form: '条件形（ば）', meaning: '表示“如果……就……”。', godanRule: '词尾改 e 段 + ば。', ichidanRule: '词干 + れば。' },
  { form: '可能形', meaning: '表示“能做……”。', godanRule: '词尾改 e 段 + る。', ichidanRule: '词干 + られる。' },
  { form: '被动形', meaning: '表示“被……”。', godanRule: '词尾改 a 段 + れる。', ichidanRule: '词干 + られる。' },
  { form: '使役形', meaning: '表示“让/使某人做……”。', godanRule: '词尾改 a 段 + せる。', ichidanRule: '词干 + させる。' },
  { form: '使役被动形', meaning: '表示“被迫做……”。', godanRule: '词尾改 a 段 + せられる。', ichidanRule: '词干 + させられる。' },
];

const TABLE_ROWS: TableRow[] = [
  {
    form: '辞书形',
    ichidan: '食べる',
    godan: '書く',
    suru: 'する',
    kuru: '来る（くる）',
  },
  {
    form: 'ます形',
    ichidan: '食べます',
    godan: '書きます',
    suru: 'します',
    kuru: '来ます（きます）',
  },
  {
    form: 'て形',
    ichidan: '食べて',
    godan: '書いて',
    suru: 'して',
    kuru: '来て（きて）',
  },
  {
    form: 'た形',
    ichidan: '食べた',
    godan: '書いた',
    suru: 'した',
    kuru: '来た（きた）',
  },
  {
    form: 'ない形',
    ichidan: '食べない',
    godan: '書かない',
    suru: 'しない',
    kuru: '来ない（こない）',
  },
  {
    form: '意向形',
    ichidan: '食べよう',
    godan: '書こう',
    suru: 'しよう',
    kuru: '来よう（こよう）',
  },
  {
    form: '命令形',
    ichidan: '食べろ / 食べよ',
    godan: '書け',
    suru: 'しろ / せよ',
    kuru: '来い（こい）',
  },
  {
    form: '条件形（ば）',
    ichidan: '食べれば',
    godan: '書けば',
    suru: 'すれば',
    kuru: '来れば（くれば）',
  },
  {
    form: '可能形',
    ichidan: '食べられる',
    godan: '書ける',
    suru: 'できる',
    kuru: '来られる（こられる）',
  },
  {
    form: '被动形',
    ichidan: '食べられる',
    godan: '書かれる',
    suru: 'される',
    kuru: '来られる（こられる）',
  },
  {
    form: '使役形',
    ichidan: '食べさせる',
    godan: '書かせる',
    suru: 'させる',
    kuru: '来させる（こさせる）',
  },
  {
    form: '使役被动形',
    ichidan: '食べさせられる',
    godan: '書かせられる',
    suru: 'させられる',
    kuru: '来させられる（こさせられる）',
  },
];

function FormOverviewTable() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>变形规则表</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
        <View style={[styles.table, styles.overviewTable]}>
          <View style={[styles.tableRow, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.colForm]}>形态</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colMeaning]}>形态说明</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colRuleWide]}>五段规则</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colRuleWide, styles.noRightBorder]}>一段规则</Text>
          </View>

          {FORM_OVERVIEW_ROWS.map((row) => (
            <View key={row.form} style={styles.tableRow}>
              <Text style={[styles.cell, styles.colForm, styles.formCell]}>{row.form}</Text>
              <Text style={[styles.cell, styles.colMeaning, styles.ruleCell]}>{row.meaning}</Text>
              <Text style={[styles.cell, styles.colRuleWide, styles.ruleCell]}>{row.godanRule}</Text>
              <Text style={[styles.cell, styles.colRuleWide, styles.ruleCell, styles.noRightBorder]}>{row.ichidanRule}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.tipText}>
        提示：五段音便速记 う/つ/る->って，む/ぶ/ぬ->んで，く->いて，ぐ->いで，す->して；行く->行って/行った。
      </Text>
    </View>
  );
}

function ConjugationTable() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>变形对照表</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.colForm]}>形态</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colVerb]}>五段</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colVerb]}>一段</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colVerb]}>する</Text>
            <Text style={[styles.cell, styles.headerCell, styles.colVerb, styles.noRightBorder]}>来る</Text>
          </View>

          {TABLE_ROWS.map((row) => (
            <View key={row.form} style={styles.tableRow}>
              <Text style={[styles.cell, styles.colForm, styles.formCell]}>{row.form}</Text>
              <Text style={[styles.cell, styles.colVerb, styles.valueCell]}>{row.godan}</Text>
              <Text style={[styles.cell, styles.colVerb, styles.valueCell]}>{row.ichidan}</Text>
              <Text style={[styles.cell, styles.colVerb, styles.valueCell]}>{row.suru}</Text>
              <Text style={[styles.cell, styles.colVerb, styles.valueCell, styles.noRightBorder]}>{row.kuru}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.tipText}>提示：可能形与被动形在一段和来る中同形（〜られる），需靠语境判断。</Text>
    </View>
  );
}

export default function VerbConjugationScreen() {
  const topPadding = useScreenTopPadding();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <Text style={styles.pageTitle}>动词变形表</Text>
      <Text style={styles.pageHint}>移动端可左右滑动查看完整表格。</Text>

      <FormOverviewTable />
      <ConjugationTable />
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
  pageHint: {
    marginTop: spacing.xs,
    marginBottom: spacing.m,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tableScroll: {
    marginTop: spacing.s,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    overflow: 'hidden',
    minWidth: 640,
    backgroundColor: '#fff',
  },
  overviewTable: {
    minWidth: 980,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  headerRow: {
    borderTopWidth: 0,
    backgroundColor: '#f8fafc',
  },
  cell: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    color: colors.text,
  },
  headerCell: {
    fontWeight: '700',
    color: colors.text,
  },
  formCell: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  valueCell: {
    fontWeight: '600',
  },
  ruleCell: {
    color: colors.muted,
  },
  colForm: {
    width: 96,
  },
  colVerb: {
    width: 136,
  },
  colMeaning: {
    width: 220,
  },
  colRuleWide: {
    width: 280,
  },
  noRightBorder: {
    borderRightWidth: 0,
  },
  tipText: {
    marginTop: spacing.s,
    color: '#92400e',
    fontWeight: '600',
  },
});
