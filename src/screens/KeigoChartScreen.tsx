import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type KeigoRow = {
  plain: string;
  respectful: string;
  humble: string;
  polite: string;
};

type GiveRow = {
  scene: string;
  plain: string;
  keigo: string;
};

type RequestRow = {
  pattern: string;
  usage: string;
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

const GIVE_ROWS: GiveRow[] = [
  { scene: '我 → 他人', plain: 'あげる', keigo: '差し上げる（谦）' },
  { scene: '他人 → 我/我方', plain: 'くれる', keigo: 'くださる（尊）' },
  { scene: '从他人得到', plain: 'もらう', keigo: 'いただく（谦）' },
];

const REQUEST_ROWS: RequestRow[] = [
  { pattern: '～をください / ～をちょうだい', usage: '请求对方给东西（ちょうだい较随意）' },
  { pattern: '～てください / ～てちょうだい', usage: '请求对方做某事（ちょうだい较随意）' },
  { pattern: '～させてください', usage: '请求许可“让我做…”' },
  { pattern: '～ないでください', usage: '请求不要做某事' },
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

function GiveHeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerText]}>场景</Text>
      <Text style={[styles.cell, styles.headerText]}>普通形</Text>
      <Text style={[styles.cell, styles.headerText]}>敬语</Text>
    </View>
  );
}

function GiveRowItem({ scene, plain, keigo }: GiveRow) {
  return (
    <View style={styles.row}>
      <Text style={styles.cell}>{scene}</Text>
      <Text style={styles.cell}>{plain}</Text>
      <Text style={styles.cell}>{keigo}</Text>
    </View>
  );
}

function RequestHeaderRow() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerText]}>表达</Text>
      <Text style={[styles.cell, styles.headerText]}>用途</Text>
    </View>
  );
}

function RequestRowItem({ pattern, usage }: RequestRow) {
  return (
    <View style={styles.row}>
      <Text style={styles.cell}>{pattern}</Text>
      <Text style={styles.cell}>{usage}</Text>
    </View>
  );
}

export default function KeigoChartScreen() {
  const topPadding = useScreenTopPadding();
  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <Text style={styles.pageTitle}>敬语表</Text>
      <Text style={styles.pageSubtitle}>常用动词的尊敬语 / 谦让语 / 丁宁语</Text>

      <View style={styles.card}>
        <HeaderRow />
        {ROWS.map((row) => (
          <KeigoRowItem key={row.plain} {...row} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>授受表达</Text>
      <Text style={styles.sectionSubtitle}>常用的给与 / 接受敬语表达</Text>
      <View style={[styles.card, styles.sectionCard]}>
        <GiveHeaderRow />
        {GIVE_ROWS.map((row) => (
          <GiveRowItem key={`${row.scene}-${row.plain}`} {...row} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>请求表达</Text>
      <Text style={styles.sectionSubtitle}>常用的请求/许可表达</Text>
      <View style={[styles.card, styles.sectionCard]}>
        <RequestHeaderRow />
        {REQUEST_ROWS.map((row) => (
          <RequestRowItem key={row.pattern} {...row} />
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
  sectionTitle: {
    marginTop: spacing.m,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.s,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionCard: {
    marginBottom: spacing.m,
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
