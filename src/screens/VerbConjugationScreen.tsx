import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type FormRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

type TableSection = {
  title: string;
  subtitle: string;
  rows: FormRow[];
};

const TABLES: TableSection[] = [
  {
    title: '一段动词（る动词）',
    subtitle: '例：食べる（たべる）',
    rows: [
      { label: '基本形', value: '食べる', highlight: true },
      { label: 'ます形', value: '食べます' },
      { label: 'て形', value: '食べて' },
      { label: 'た形', value: '食べた' },
      { label: 'ない形', value: '食べない' },
      { label: '命令形', value: '食べろ' },
      { label: '意志形', value: '食べよう' },
      { label: '可能形', value: '食べられる' },
      { label: '被动形', value: '食べられる' },
      { label: '使役形', value: '食べさせる' },
      { label: '使役被动', value: '食べさせられる' },
    ],
  },
  {
    title: '五段动词（う段动词）',
    subtitle: '例：書く（かく）',
    rows: [
      { label: '基本形', value: '書く', highlight: true },
      { label: 'ます形', value: '書きます' },
      { label: 'て形', value: '書いて' },
      { label: 'た形', value: '書いた' },
      { label: 'ない形', value: '書かない' },
      { label: '命令形', value: '書け' },
      { label: '意志形', value: '書こう' },
      { label: '可能形', value: '書ける' },
      { label: '被动形', value: '書かれる' },
      { label: '使役形', value: '書かせる' },
      { label: '使役被动', value: '書かせられる' },
    ],
  },
  {
    title: '不规则动词',
    subtitle: '例：する',
    rows: [
      { label: '基本形', value: 'する', highlight: true },
      { label: 'ます形', value: 'します' },
      { label: 'て形', value: 'して' },
      { label: 'た形', value: 'した' },
      { label: 'ない形', value: 'しない' },
      { label: '命令形', value: 'しろ / せよ' },
      { label: '意志形', value: 'しよう' },
      { label: '可能形', value: 'できる' },
      { label: '被动形', value: 'される' },
      { label: '使役形', value: 'させる' },
      { label: '使役被动', value: 'させられる' },
    ],
  },
  {
    title: '不规则动词',
    subtitle: '例：来る（くる）',
    rows: [
      { label: '基本形', value: '来る（くる）', highlight: true },
      { label: 'ます形', value: '来ます（きます）' },
      { label: 'て形', value: '来て（きて）' },
      { label: 'た形', value: '来た（きた）' },
      { label: 'ない形', value: '来ない（こない）' },
      { label: '命令形', value: '来い（こい）' },
      { label: '意志形', value: '来よう（こよう）' },
      { label: '可能形', value: '来られる（こられる）' },
      { label: '被动形', value: '来られる（こられる）' },
      { label: '使役形', value: '来させる（こさせる）' },
      { label: '使役被动', value: '来させられる（こさせられる）' },
    ],
  },
];

function FormRowItem({ label, value, highlight }: FormRow) {
  return (
    <View style={[styles.row, highlight ? styles.rowHighlight : null]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight ? styles.rowValueHighlight : null]}>{value}</Text>
    </View>
  );
}

export default function VerbConjugationScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>动词变形表</Text>
      <Text style={styles.pageSubtitle}>一段 / 五段 / 不规则动词常用变形</Text>
      {TABLES.map((section) => (
        <View key={`${section.title}-${section.subtitle}`} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardSubtitle}>{section.subtitle}</Text>
          <View style={styles.table}>
            {section.rows.map((row) => (
              <FormRowItem key={`${section.subtitle}-${row.label}`} {...row} />
            ))}
          </View>
        </View>
      ))}
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  pageSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.m,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  table: {
    marginTop: spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowHighlight: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.s,
    paddingHorizontal: spacing.s,
  },
  rowLabel: {
    width: 80,
    color: colors.muted,
    fontWeight: '600',
  },
  rowValue: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
  rowValueHighlight: {
    color: colors.primaryDark,
  },
});
