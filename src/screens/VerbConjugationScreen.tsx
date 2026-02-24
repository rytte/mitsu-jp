import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import VerbConjugationPracticePanel from '../components/VerbConjugationPracticePanel';
import { CONJUGATION_OVERVIEW_ROWS, CONJUGATION_TABLE_ROWS } from '../features/verbConjugation/data';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

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

          {CONJUGATION_OVERVIEW_ROWS.map((row) => (
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
        提示：五段音便速记 う/つ/る→って，む/ぶ/ぬ→んで，く→いて，ぐ→いで，す→して；行く→行って/行った。
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

          {CONJUGATION_TABLE_ROWS.map((row) => (
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
  const [showPractice, setShowPractice] = useState(false);

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
        <VerbConjugationPracticePanel />
      ) : (
        <>
          <Text style={styles.pageHint}>移动端可左右滑动查看完整表格。</Text>
          <FormOverviewTable />
          <ConjugationTable />
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
