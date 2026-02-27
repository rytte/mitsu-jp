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
