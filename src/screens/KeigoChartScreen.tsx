import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type KeigoRow = {
  plain: string;
  respectful: string;
  humble: string;
  polite: string;
};

const ROWS: KeigoRow[] = [
  { plain: '見る', respectful: 'ご覧になる', humble: '拝見する', polite: '見ます' },
  { plain: '行く / 来る', respectful: 'いらっしゃる / おいでになる', humble: '伺う / 参る', polite: '行きます / 来ます' },
  { plain: 'いる', respectful: 'いらっしゃる', humble: 'おる', polite: 'います' },
  { plain: '言う', respectful: 'おっしゃる', humble: '申す / 申し上げる', polite: '言います' },
  { plain: 'する', respectful: 'なさる', humble: 'いたす', polite: 'します' },
  { plain: '食べる / 飲む', respectful: '召し上がる', humble: 'いただく', polite: '食べます / 飲みます' },
  { plain: '知る', respectful: 'ご存じだ', humble: '存じる', polite: '知っています' },
  { plain: '思う', respectful: 'お思いになる', humble: '存じる', polite: '思います' },
  { plain: '与える', respectful: 'くださる', humble: '差し上げる', polite: 'あげます' },
  { plain: 'もらう', respectful: 'お受け取りになる', humble: 'いただく', polite: 'もらいます' },
  { plain: '会う', respectful: 'お会いになる', humble: 'お目にかかる', polite: '会います' },
  { plain: '聞く / 尋ねる', respectful: 'お聞きになる / お尋ねになる', humble: '伺う / お聞きする', polite: '聞きます / 尋ねます' },
];

const NOTES: string[] = [
  '尊敬语：抬高对方的动作或状态',
  '谦让语：降低自己的动作或状态',
  '丁宁语：用礼貌形式表达',
  '遇到固定表达，优先使用固定敬语',
];

function HeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerText]}>普通形</Text>
      <Text style={[styles.cell, styles.headerText]}>尊敬语</Text>
      <Text style={[styles.cell, styles.headerText]}>谦让语</Text>
      <Text style={[styles.cell, styles.headerText]}>丁宁语</Text>
    </View>
  );
}

function KeigoRowItem({ plain, respectful, humble, polite }: KeigoRow) {
  return (
    <View style={styles.row}>
      <Text style={styles.cell}>{plain}</Text>
      <Text style={styles.cell}>{respectful}</Text>
      <Text style={styles.cell}>{humble}</Text>
      <Text style={styles.cell}>{polite}</Text>
    </View>
  );
}

export default function KeigoChartScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>敬语表</Text>
      <Text style={styles.pageSubtitle}>常用动词的尊敬语 / 谦让语 / 丁宁语</Text>

      <View style={styles.card}>
        <HeaderRow />
        {ROWS.map((row) => (
          <KeigoRowItem key={row.plain} {...row} />
        ))}
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>使用提示</Text>
        {NOTES.map((note) => (
          <Text key={note} style={styles.noteText}>
            {note}
          </Text>
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
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.s,
    borderBottomWidth: 0,
    marginBottom: spacing.s,
  },
  headerText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  cell: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: spacing.xs,
  },
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.m,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  noteText: {
    color: colors.muted,
    marginBottom: spacing.xs,
  },
});
