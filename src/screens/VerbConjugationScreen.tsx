import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import VerbConjugationPracticePanel from '../components/VerbConjugationPracticePanel';
import { CONJUGATION_OVERVIEW_ROWS, CONJUGATION_TABLE_ROWS } from '../features/verbConjugation/data';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type MergedConjugationRow = {
  form: string;
  meaning: string;
  godanRule: string;
  ichidanRule: string;
  godan: string;
  ichidan: string;
  suru: string;
  kuru: string;
};

type TeFormUsageRow = {
  usage: string;
  pattern: string;
  note: string;
  example: string;
};

type TeFormFixedPhrase = {
  expression: string;
  meaning: string;
  example: string;
};

const TE_FORM_USAGE_ROWS: TeFormUsageRow[] = [
  {
    usage: '动作接续',
    pattern: 'Vて、V',
    note: '先做A再做B',
    example: '朝ご飯を食べて、学校へ行きます。',
  },
  {
    usage: '原因/理由',
    pattern: 'Vて、〜',
    note: '表示原因并引出结果',
    example: '道が込んでいて、遅れました。',
  },
  {
    usage: '方式/手段',
    pattern: 'Vて、〜',
    note: '表示“通过该动作来完成后项”',
    example: 'メモを書いて覚えます。',
  },
  {
    usage: '请求/命令',
    pattern: 'Vてください',
    note: '礼貌请求或指示对方去做',
    example: 'もう一度言ってください。',
  },
  {
    usage: '许可',
    pattern: 'Vてもいい',
    note: '“可以做……”',
    example: 'ここで写真を撮ってもいいです。',
  },
  {
    usage: '禁止',
    pattern: 'Vてはいけない',
    note: '“不可以做……”',
    example: '教室で食べてはいけません。',
  },
  {
    usage: '进行/习惯',
    pattern: 'Vている',
    note: '表示正在进行或习惯性行为',
    example: '毎日、日本語を勉強しています。',
  },
  {
    usage: '让步',
    pattern: 'Vても、〜',
    note: '“即使……也……”',
    example: '雨が降っても、行きます。',
  },
];

const TE_FORM_USAGE_NOTES: string[] = [
  '「Vて、〜」在接续、原因、手段三类里都很常见，具体含义由语境决定。',
  '「Vている」除进行外，也常表示状态（例：結婚している）。',
];

const TE_FORM_FIXED_PHRASES: TeFormFixedPhrase[] = [
  {
    expression: 'Vてみる',
    meaning: '试着做',
    example: '新しい言い方を使ってみます。',
  },
  {
    expression: 'Vてしまう',
    meaning: '做完/不小心做了',
    example: '電車で寝てしまいました。',
  },
  {
    expression: 'Vておく',
    meaning: '事先做',
    example: '旅行の前にホテルを予約しておきます。',
  },
  {
    expression: 'Vてくれる',
    meaning: '别人为我方做',
    example: '友だちが道を教えてくれました。',
  },
  {
    expression: 'Vてもらう',
    meaning: '请别人为我做',
    example: '先生に文を直してもらいました。',
  },
  {
    expression: 'Vてあげる',
    meaning: '我为别人做',
    example: '弟に日本語を教えてあげます。',
  },
  {
    expression: 'Vてある',
    meaning: '（他动词）做完后状态保留',
    example: 'テーブルの上に料理が並べてあります。',
  },
  {
    expression: 'Vてくる / Vていく',
    meaning: '朝说话人方向变化 / 远离说话人方向变化',
    example: '日本語がだんだん分かってきました。',
  },
];

function ConjugationHeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerText, styles.colForm]}>形态</Text>
      <Text style={[styles.cell, styles.headerText, styles.ruleHeaderText, styles.colRule]}>五段规则</Text>
      <Text style={[styles.cell, styles.headerText, styles.ruleHeaderText, styles.colRule]}>一段规则</Text>
    </View>
  );
}

type ConjugationRowItemProps = {
  row: MergedConjugationRow;
  active: boolean;
  onPress: () => void;
};

function ConjugationRowItem({ row, active, onPress }: ConjugationRowItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, styles.pressableRow, active ? styles.activeRow : null, pressed ? styles.pressedRow : null]}>
      <Text style={[styles.cell, styles.colForm, styles.formCell, active ? styles.formCellActive : null]}>{row.form}</Text>
      <Text style={[styles.cell, styles.colRule, styles.ruleCell, active ? styles.ruleCellActive : null]}>{row.godanRule}</Text>
      <Text style={[styles.cell, styles.colRule, styles.ruleCell, active ? styles.ruleCellActive : null]}>{row.ichidanRule}</Text>
    </Pressable>
  );
}

export default function VerbConjugationScreen() {
  const topPadding = useScreenTopPadding();
  const [showPractice, setShowPractice] = useState(false);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);

  const mergedRows = useMemo<MergedConjugationRow[]>(() => {
    const overviewMap = new Map(CONJUGATION_OVERVIEW_ROWS.map((row) => [row.form, row]));
    return CONJUGATION_TABLE_ROWS.map((row) => {
      const overview = overviewMap.get(row.form);
      return {
        ...row,
        meaning: overview?.meaning ?? '—',
        godanRule: overview?.godanRule ?? '—',
        ichidanRule: overview?.ichidanRule ?? '—',
      };
    });
  }, []);

  const handleToggleRow = (form: string) => setSelectedForm((value) => (value === form ? null : form));

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <View style={styles.pageHeaderRow}>
        <Text style={styles.pageTitle}>动词变形表</Text>
        <Pressable
          onPress={() => setShowPractice((prev) => !prev)}
          style={({ pressed }) => [styles.pageActionBtn, pressed ? styles.pageActionBtnPressed : null]}
        >
          <Text style={styles.pageActionText}>{showPractice ? '返回表格' : '开始练习'}</Text>
        </Pressable>
      </View>

      {showPractice ? (
        <View style={styles.practicePanelWrap}>
          <VerbConjugationPracticePanel />
        </View>
      ) : (
        <>
          <View style={styles.tableSection}>
            <View style={styles.tableScroll}>
              <View style={styles.tableOuter}>
                <View style={styles.table}>
                  <ConjugationHeaderRow />
                  {mergedRows.map((row) => {
                    const expanded = selectedForm === row.form;
                    const extraNote =
                      row.form === 'ない形'
                        ? '补充：\n五段词尾「う」要变「わ」。\n例：買う→買わない'
                        : row.form === 'て形'
                          ? '补充（音便）：\n  う/つ/る → って\n  む/ぶ/ぬ → んで\n  く → いて\n  ぐ → いで\n  す → して\n例外：行く → 行って'
                          : row.form === 'た形'
                            ? '补充（音便）：\n  う/つ/る → った\n  む/ぶ/ぬ → んだ\n  く → いた\n  く → いだ\n  す → した\n例外：行く → 行った'
                        : row.form === '命令形'
                          ? '补充：\n一段命令形「ろ」多用于口语，「よ」多用于书面。'
                          : null;
                    return (
                      <View key={row.form} style={[styles.expandWrap, expanded ? styles.expandWrapActive : null]}>
                        <ConjugationRowItem row={row} active={expanded} onPress={() => handleToggleRow(row.form)} />
                        {expanded ? (
                          <View style={styles.inlineIntroCard}>
                            <Text style={styles.meaningText}>{row.meaning}</Text>
                            <View style={styles.detailLine}>
                              <Text style={[styles.detailLabel, styles.godanLabel]}>五段</Text>
                              <Text style={styles.detailValue}>{row.godan}</Text>
                            </View>
                            <View style={styles.detailLine}>
                              <Text style={[styles.detailLabel, styles.ichidanLabel]}>一段</Text>
                              <Text style={styles.detailValue}>{row.ichidan}</Text>
                            </View>
                            <View style={styles.detailLine}>
                              <Text style={[styles.detailLabel, styles.suruLabel]}>する</Text>
                              <Text style={styles.detailValue}>{row.suru}</Text>
                            </View>
                            <View style={styles.detailLine}>
                              <Text style={[styles.detailLabel, styles.kuruLabel]}>来る</Text>
                              <Text style={styles.detailValue}>{row.kuru}</Text>
                            </View>
                            {extraNote ? <Text style={styles.expandNote}>{extraNote}</Text> : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <Text style={styles.tipText}>
              提示：た形音便与て形对应。
            </Text>
            <Text style={styles.tipText}>提示：可能形与被动形在一段和来る中同形（〜られる），需靠语境判断。</Text>

            <View style={styles.usageTableSection}>
              <Text style={styles.usageTableTitle}>て形用法表</Text>
              <View style={styles.usageTableOuter}>
                <View style={[styles.usageRow, styles.usageHeaderRow]}>
                  <Text style={[styles.usageCellUsage, styles.usageHeaderText]}>用法</Text>
                  <Text style={[styles.usageCellPattern, styles.usageHeaderText]}>结构</Text>
                  <Text style={[styles.usageCellNote, styles.usageHeaderText]}>要点</Text>
                  <Text style={[styles.usageCellExample, styles.usageHeaderText]}>例句</Text>
                </View>
                {TE_FORM_USAGE_ROWS.map((item) => (
                  <View key={`${item.usage}-${item.pattern}`} style={styles.usageRow}>
                    <Text style={[styles.usageCellUsage, styles.usageUsageText]}>{item.usage}</Text>
                    <Text style={[styles.usageCellPattern, styles.usagePatternText]}>{item.pattern}</Text>
                    <Text style={[styles.usageCellNote, styles.usageNoteText]}>{item.note}</Text>
                    <Text style={[styles.usageCellExample, styles.usageExampleText]}>{item.example}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.usageNotesCard}>
                <Text style={styles.usageNotesTitle}>易混提醒</Text>
                {TE_FORM_USAGE_NOTES.map((note) => (
                  <Text key={note} style={styles.usageNotesText}>
                    {`• ${note}`}
                  </Text>
                ))}
              </View>

              <View style={styles.fixedPhraseCard}>
                <Text style={styles.fixedPhraseTitle}>高频固定搭配</Text>
                {TE_FORM_FIXED_PHRASES.map((item) => (
                  <View key={item.expression} style={styles.fixedPhraseItem}>
                    <View style={styles.fixedPhraseHead}>
                      <Text style={styles.fixedPhraseExpr}>{item.expression}</Text>
                      <Text style={styles.fixedPhraseMeaning}>{item.meaning}</Text>
                    </View>
                    <Text style={styles.fixedPhraseExample}>{item.example}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </>
      )}
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
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageActionBtn: {
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
  },
  pageActionBtnPressed: {
    opacity: 0.8,
  },
  pageActionText: {
    color: '#0369a1',
    fontWeight: '700',
    fontSize: 12,
  },
  practicePanelWrap: {
    marginTop: spacing.s,
  },
  tableSection: {
    marginBottom: spacing.m,
  },
  tableScroll: {
    marginTop: spacing.s,
  },
  tableOuter: {
    borderWidth: 1,
    borderColor: '#c5d4e7',
    borderRadius: radius.l,
    backgroundColor: '#fbfdff',
    padding: 1,
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  pressableRow: {
    paddingHorizontal: spacing.xs,
  },
  activeRow: {
    backgroundColor: '#eef5ff',
    borderBottomColor: '#c7dbf9',
  },
  pressedRow: {
    opacity: 0.9,
  },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#f8fafc',
    paddingHorizontal: spacing.xs,
  },
  cell: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: spacing.xs,
    flexShrink: 1,
  },
  headerText: {
    fontWeight: '700',
    color: colors.muted,
  },
  ruleHeaderText: {
    color: '#5b6b84',
  },
  formCell: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  formCellActive: {
    color: '#1d4ed8',
  },
  colForm: {
    width: 75,
  },
  colRule: {
    flex: 1,
    minWidth: 0,
  },
  ruleCell: {
    color: '#55657f',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  ruleCellActive: {
    color: '#365b8f',
    fontWeight: '600',
  },
  expandWrap: {
    backgroundColor: '#fff',
  },
  expandWrapActive: {
    borderWidth: 1,
    borderColor: '#bdd5f6',
    borderRadius: radius.s,
    marginBottom: spacing.xs,
    backgroundColor: '#eef4ff',
  },
  inlineIntroCard: {
    backgroundColor: '#f7faff',
    borderBottomLeftRadius: radius.s,
    borderBottomRightRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  meaningText: {
    marginBottom: spacing.s,
    color: '#344d74',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 19,
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginRight: spacing.xs,
    marginTop: 2.2,
    overflow: 'hidden',
  },
  godanLabel: {
    backgroundColor: '#6f8fbe',
  },
  ichidanLabel: {
    backgroundColor: '#7a93b3',
  },
  suruLabel: {
    backgroundColor: '#8b82b9',
  },
  kuruLabel: {
    backgroundColor: '#8f8f8f',
  },
  detailValue: {
    flex: 1,
    color: '#3f4f63',
    fontSize: 13,
    lineHeight: 19,
  },
  tipText: {
    marginTop: spacing.s,
    color: '#92400e',
    fontWeight: '600',
  },
  usageTableSection: {
    marginTop: spacing.m + 15,
  },
  usageTableTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  usageTableOuter: {
    borderWidth: 1,
    borderColor: '#d8e5f7',
    borderRadius: radius.l,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  usageHeaderRow: {
    backgroundColor: '#f8fafc',
    borderBottomColor: '#d8e5f7',
  },
  usageHeaderText: {
    color: '#5b6b84',
    fontWeight: '700',
    fontSize: 12,
  },
  usageCellUsage: {
    width: 60,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
  },
  usageCellPattern: {
    width: 88,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
  },
  usageCellNote: {
    width: 112,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
  },
  usageCellExample: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
  },
  usageUsageText: {
    color: colors.text,
    fontWeight: '700',
  },
  usagePatternText: {
    color: '#355582',
    fontWeight: '600',
  },
  usageNoteText: {
    color: '#334155',
    fontWeight: '500',
  },
  usageExampleText: {
    color: '#4b5563',
  },
  usageNotesCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  usageNotesTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  usageNotesText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  fixedPhraseCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#d6e4ff',
    backgroundColor: '#f4f8ff',
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  fixedPhraseTitle: {
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  fixedPhraseItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#dbe7ff',
    paddingVertical: spacing.xs,
  },
  fixedPhraseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  fixedPhraseExpr: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  fixedPhraseMeaning: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  fixedPhraseExample: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  expandNote: {
    marginTop: spacing.s,
    color: '#3f5068',
    lineHeight: 18,
    fontSize: 12,
    fontWeight: '500',
    borderTopWidth: 1,
    borderTopColor: '#d8e5f7',
    paddingTop: spacing.xs,
  },
});
