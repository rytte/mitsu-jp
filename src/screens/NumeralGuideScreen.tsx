import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type NumberRow = {
  value: string;
  reading: string;
  note: string;
};

type CounterRow = {
  counter: string;
  usage: string;
  sample: string;
  tip: string;
};

type CompactCounterRow = {
  counter: string;
  usage: string;
};

type GuideRow = {
  label: string;
  content: string;
  hint?: string;
};

type GuideTone = 'order' | 'date' | 'time';

const BASIC_NUMBER_ROWS: NumberRow[] = [
  { value: '0', reading: 'ゼロ / れい', note: '口语常说ゼロ，报数也常见れい。' },
  { value: '1', reading: 'いち', note: '基础数字，复合时读音会音变。' },
  { value: '2', reading: 'に', note: '日期「二日」读作「ふつか」。' },
  { value: '3', reading: 'さん', note: '与助数词组合时一般保持清音。' },
  { value: '4', reading: 'よん / し', note: '数量常用よん；月份、日期里常见し。' },
  { value: '5', reading: 'ご', note: '如「五分（ごふん）」是分钟。' },
  { value: '6', reading: 'ろく', note: '接「分」常变「ろっぷん」。' },
  { value: '7', reading: 'なな / しち', note: '数量常用なな；月份常说しち。' },
  { value: '8', reading: 'はち', note: '接「本」等会出现促音：はっぽん。' },
  { value: '9', reading: 'きゅう / く', note: '数量常用きゅう，日期/月份常见く。' },
  { value: '10', reading: 'じゅう', note: '十位构词核心：二十=にじゅう。' },
  { value: '100', reading: 'ひゃく', note: '三百=さんびゃく，六百=ろっぴゃく。' },
  { value: '1000', reading: 'せん', note: '三千=さんぜん，八千=はっせん。' },
  { value: '10000', reading: 'いちまん', note: '日语以「万」为四位一组。' },
];

const DATE_ROWS: GuideRow[] = [
    {
    label: '星期',
    content:
      '月曜日（げつようび）、火曜日（かようび）、水曜日（すいようび）、木曜日（もくようび）、金曜日（きんようび）、土曜日（どようび）、日曜日（にちようび）。',
  },
    {
    label: '日期1-10',
    content: 'ついたち、ふつか、みっか、よっか、いつか、むいか、なのか、ようか、ここのか、とおか。',
    hint: '前10天是高频不规则读法。',
  },
  {
    label: '月份',
    content: '1月 いちがつ，4月 しがつ，7月 しちがつ，9月 くがつ。',
    hint: '重点记 4/7/9 月读法。',
  },
  {
    label: '特殊日期',
    content: '14日 じゅうよっか，20日 はつか，24日 にじゅうよっか。',
  },
];

const ORDER_ROWS: GuideRow[] = [
  {
    label: '序数',
    content: '第 + 数字 + 名词：第一課、第二章、第三回。',
    hint: '用于“第几”语义最自然。',
  },
  {
    label: '次数',
    content: '数字 + 回：一回、二回、三回。',
    hint: '回数表达口语和书面都高频。',
  },
  {
    label: '楼层',
    content: '数字 + 階：一階、七階（ななかい）、八階（はっかい）。',
  },
  {
    label: '编号',
    content: '〜番：1番線、3番出口、受付番号。',
  },
];

const TIME_ROWS: GuideRow[] = [
  {
    label: '整点',
    content: '7時（しちじ）、9時（くじ）、4時（よじ）。',
    hint: '4/7/9点有不规则读法。',
  },
  {
    label: '分钟',
    content: '1分（いっぷん）/ 3分（さんぷん）/ 6分（ろっぷん）/ 10分（じゅっぷん）。',
    hint: '常见促音：っぷん。',
  },
  {
    label: '半点',
    content: '〜時半（じはん），如 6時半（ろくじはん）。',
  },
  {
    label: '时长',
    content: '〜時間（じかん）、〜週間（しゅうかん）、〜か月（かげつ）。',
  },
];

const COUNTER_ROWS: CounterRow[] = [
  {
    counter: '〜人（にん）',
    usage: '人数',
    sample: '一人（ひとり）/ 二人（ふたり）/ 三人（さんにん）',
    tip: '1人、2人是不规则，3人起多为「数字+にん」。',
  },
  {
    counter: '〜つ',
    usage: '泛指物品数量',
    sample:
      '一つ（ひとつ）/ 二つ（ふたつ）/ 三つ（みっつ）/ 四つ（よっつ）/ 五つ（いつつ）/ 六つ（むっつ）/ 七つ（ななつ）/ 八つ（やっつ）/ 九つ（ここのつ）/ 十（とお）',
    tip: '1-10有和语读法，10个读「とお」。',
  },
  {
    counter: '〜本（ほん）',
    usage: '细长物（笔、瓶子、伞）',
    sample: '一本（いっぽん）/ 三本（さんぼん）/ 六本（ろっぽん）',
    tip: '会出现「っぽん/ぼん/ほん」三种音变。',
  },
  {
    counter: '〜枚（まい）',
    usage: '薄片状物体（纸、票、盘子）',
    sample: '一枚（いちまい）/ 四枚（よんまい）',
    tip: '几乎规则变化，口语高频。',
  },
  {
    counter: '〜歳（さい）',
    usage: '年龄',
    sample: '一歳（いっさい）/ 八歳（はっさい）/ 二十歳（はたち）',
    tip: '20岁为固定读法「はたち」。',
  },
];

const OTHER_COUNTER_ROWS: CompactCounterRow[] = [
  { counter: '〜冊（さつ）', usage: '书本、笔记本' },
  { counter: '〜匹（ひき）', usage: '小动物' },
  { counter: '〜台（だい）', usage: '机器、车辆' },
  { counter: '〜回（かい）', usage: '次数' },
  { counter: '〜杯（はい）', usage: '杯装饮品' },
  { counter: '〜着（ちゃく）', usage: '衣服、套装' },
  { counter: '〜軒（けん）', usage: '房屋、店铺' },
  { counter: '〜羽（わ）', usage: '鸟、兔等小动物' },
  { counter: '〜個（こ）', usage: '小件物体' },
  { counter: '〜部（ぶ）', usage: '书籍、文件、成套设备' },
];

const SOUND_CHANGE_RULES: Array<{ label: string; detail: string }> = [
  {
    label: '不变',
    detail: '量词首位假名不可浊化或已经浊化时，数词与量词都不变。',
  },
  {
    label: '促音变',
    detail: '量词首位假名可浊化时，遇 1、6、8、10 常发生促音变（如 か/さ/た/は 行）。',
  },
  {
    label: '浊化',
    detail: '量词首位假名为は行时，遇 1、6、8、10 常半浊化；遇 3、何 常浊化。',
  },
];

const SOUND_CHANGE_SPECIAL_CASES: string[] = [
  '月份（がつ）只用音读。',
  '分（ふん）遇 1、6、8、10、3、何、4 都要半浊化（ぷん）。',
  '階：三、何浊化。',
  '回：三、何不浊化。',
  '四：四人（よにん）、四円（よえん）、四時（よじ）。',
];

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

const GUIDE_TONE_COLORS: Record<
  GuideTone,
  {
    itemBorder: string;
    itemBg: string;
    tagBg: string;
    tagText: string;
    hintBg: string;
    hintText: string;
  }
> = {
  order: {
    itemBorder: '#f7e6cc',
    itemBg: '#fffdf9',
    tagBg: '#fff4e6',
    tagText: '#b45309',
    hintBg: '#fff7ec',
    hintText: '#c97a1a',
  },
  date: {
    itemBorder: '#d6eee7',
    itemBg: '#fbfffd',
    tagBg: '#ecfdf3',
    tagText: '#2f855a',
    hintBg: '#f1fbf6',
    hintText: '#2f9f79',
  },
  time: {
    itemBorder: '#dce6fb',
    itemBg: '#fbfdff',
    tagBg: '#edf3ff',
    tagText: '#3b5ba9',
    hintBg: '#f2f6ff',
    hintText: '#4f79c7',
  },
};

function GuideRows({ rows, tone }: { rows: GuideRow[]; tone: GuideTone }) {
  const palette = GUIDE_TONE_COLORS[tone];

  return (
    <View style={styles.guideList}>
      {rows.map((row) => (
        <View
          key={`${row.label}-${row.content}`}
          style={[styles.guideItem, { borderColor: palette.itemBorder, backgroundColor: palette.itemBg }]}
        >
          <View style={styles.guideHead}>
            <View style={[styles.guideTagWrap, { backgroundColor: palette.tagBg }]}>
              <Text style={[styles.guideTag, { color: palette.tagText }]}>{row.label}</Text>
            </View>
            {row.hint ? (
              <View style={[styles.guideHintTopWrap, { backgroundColor: palette.hintBg }]}>
                <Text style={[styles.guideHintTop, { color: palette.hintText }]}>{row.hint}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.guideBody}>
            <Text style={styles.guideContent}>{row.content}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function NumeralGuideScreen() {
  const topPadding = useScreenTopPadding();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <Text style={styles.pageTitle}>数词速查表</Text>
      <Text style={styles.pageSubtitle}>覆盖基数、序数、日期、时间与常见助数词，方便日常表达快速检索。</Text>

      <View style={styles.introCard}>
        <Text style={styles.introTitle}>先记两层结构</Text>
        <Text style={styles.introLine}>1. 基数词（いち、に、さん...）</Text>
        <Text style={styles.introLine}>2. 助数词（人、本、枚、冊、匹...）</Text>
        <Text style={styles.introHint}>真正难点主要在助数词搭配与音变。</Text>
      </View>

      <View style={styles.card}>
        <SectionTitle title="基数" subtitle="最常用的数字读法与关键音变提醒" />
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.valueCell, styles.headerText]}>数字</Text>
          <Text style={[styles.readingCell, styles.headerText]}>读法</Text>
          <Text style={[styles.noteCell, styles.headerText]}>说明</Text>
        </View>
        {BASIC_NUMBER_ROWS.map((item) => (
          <View key={item.value} style={styles.row}>
            <Text style={[styles.valueCell, styles.valueText]}>{item.value}</Text>
            <Text style={[styles.readingCell, styles.readingText]}>{item.reading}</Text>
            <Text style={[styles.noteCell, styles.noteText]}>{item.note}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.sectionCard, styles.orderCard]}>
        <SectionTitle title="序数与编号" subtitle="第几、几次、几楼、几号等常见表达" />
        <GuideRows rows={ORDER_ROWS} tone="order" />
      </View>

      <View style={[styles.card, styles.sectionCard, styles.dateCard]}>
        <SectionTitle title="日期与星期" subtitle="月份、几号、星期几的高频不规则读法" />
        <GuideRows rows={DATE_ROWS} tone="date" />
      </View>

      <View style={[styles.card, styles.sectionCard, styles.timeCard]}>
        <SectionTitle title="时间表达" subtitle="几点几分、时间长度、半点表达" />
        <GuideRows rows={TIME_ROWS} tone="time" />
      </View>

      <View style={[styles.card, styles.sectionCard, styles.counterMainCard]}>
        <SectionTitle title="高频助数词" subtitle="先掌握高频，再扩展低频计数词" />
        <View style={styles.counterList}>
          {COUNTER_ROWS.map((item, index) => (
            <View key={item.counter} style={[styles.counterItem, index === COUNTER_ROWS.length - 1 ? styles.counterItemLast : null]}>
              <View style={styles.counterHead}>
                <Text style={styles.counterName}>{item.counter}</Text>
                <Text style={styles.counterUsageText}>{item.usage}</Text>
              </View>
              <View style={styles.counterLine}>
                <Text style={styles.counterLineLabel}>示例</Text>
                <Text style={styles.counterExampleText}>{item.sample}</Text>
              </View>
              <View style={styles.counterLine}>
                <Text style={styles.counterLineLabel}>提示</Text>
                <Text style={styles.counterTipText}>{item.tip}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.otherCounterSection}>
          <Text style={styles.otherCounterTitle}>其它高频助数词</Text>
          <View style={styles.otherCounterList}>
            {OTHER_COUNTER_ROWS.map((item) => (
              <View key={item.counter} style={styles.otherCounterItem}>
                <Text style={styles.otherCounterName}>{item.counter}</Text>
                <Text style={styles.otherCounterUsage}>{item.usage}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.card, styles.sectionCard, styles.soundChangeCard]}>
        <SectionTitle title="数词与助数词结合音变情况" subtitle="先记规则，再记特殊例外" />
        <View style={styles.soundRuleList}>
          {SOUND_CHANGE_RULES.map((item) => (
            <View key={item.label} style={styles.soundRuleItem}>
              <View style={styles.soundRuleTagWrap}>
                <Text style={styles.soundRuleTag}>{item.label}</Text>
              </View>
              <Text style={styles.soundRuleText}>{item.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.specialCaseCard}>
          <Text style={styles.specialCaseTitle}>特殊情况</Text>
          {SOUND_CHANGE_SPECIAL_CASES.map((item, index) => (
            <Text key={item} style={styles.specialCaseText}>{`${index + 1}. ${item}`}</Text>
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
    color: colors.muted,
    lineHeight: 20,
  },
  introCard: {
    marginTop: spacing.s,
    backgroundColor: '#f8fafc',
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: spacing.s,
  },
  introTitle: {
    color: '#1e3a8a',
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
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    marginTop: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.s,
  },
  sectionCard: {
    marginTop: spacing.s,
  },
  orderCard: {
    borderColor: '#f7e6cc',
  },
  dateCard: {
    borderColor: '#d6eee7',
  },
  timeCard: {
    borderColor: '#dce6fb',
  },
  counterMainCard: {
    borderColor: '#dbe4f2',
    backgroundColor: '#ffffff',
  },
  soundChangeCard: {
    borderColor: '#f2d6a2',
    marginBottom: spacing.m,
  },
  sectionHead: {
    marginBottom: spacing.s,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
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
    borderBottomColor: '#cbd5e1',
  },
  headerText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 12,
  },
  valueCell: {
    width: 52,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
  },
  readingCell: {
    width: 90,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
  },
  noteCell: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
  },
  valueText: {
    color: colors.text,
    fontWeight: '700',
  },
  readingText: {
    color: '#1e40af',
    fontWeight: '600',
  },
  noteText: {
    color: '#334155',
  },
  counterList: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.s,
    overflow: 'hidden',
  },
  counterItem: {
    backgroundColor: '#ffffff',
    padding: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  counterHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  counterName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  counterUsageText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  counterLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.s,
  },
  counterLineLabel: {
    width: 34,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 18,
  },
  counterExampleText: {
    flex: 1,
    color: '#1e3a8a',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  counterTipText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  counterItemLast: {
    borderBottomWidth: 0,
  },
  otherCounterSection: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: spacing.xs,
  },
  otherCounterTitle: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  otherCounterList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  otherCounterItem: {
    width: '49%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.s,
    backgroundColor: '#f8fafc',
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
    marginBottom: 6,
  },
  otherCounterName: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  otherCounterUsage: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },
  guideList: {
    gap: spacing.xs,
  },
  guideItem: {
    borderWidth: 1,
    borderRadius: radius.s,
    padding: spacing.s,
  },
  guideHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  guideTagWrap: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  guideTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  guideBody: {
    width: '100%',
  },
  guideContent: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
  },
  guideHintTopWrap: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.s,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    maxWidth: '62%',
  },
  guideHintTop: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  soundRuleList: {
    gap: spacing.xs,
  },
  soundRuleItem: {
    borderWidth: 1,
    borderColor: '#f4e0bf',
    backgroundColor: '#fffaf2',
    borderRadius: radius.s,
    padding: spacing.s,
  },
  soundRuleTagWrap: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#ffedd5',
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    marginBottom: spacing.xs,
  },
  soundRuleTag: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
  },
  soundRuleText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
  },
  specialCaseCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#f5d7b3',
    backgroundColor: '#fff8ed',
    borderRadius: radius.s,
    padding: spacing.s,
  },
  specialCaseTitle: {
    color: '#7c2d12',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  specialCaseText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 2,
  },
});
