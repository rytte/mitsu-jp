import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type ParticleUsageRow = {
  label: string;
  rule: string;
  example: string;
};

type ParticleGroup = {
  particle: string;
  title: string;
  summary: string;
  usages: ParticleUsageRow[];
};

type ContrastRow = {
  title: string;
  aRule: string;
  bRule: string;
  sample: string;
};

type PatternRow = {
  pattern: string;
  meaning: string;
  sample: string;
};

type ParticleSubclassRow = {
  name: string;
  role: string;
  markers: string;
  sample: string;
};

const PARTICLE_SUBCLASS_ROWS: ParticleSubclassRow[] = [
  {
    name: '格助词',
    role: '标记句子成分关系（主语、宾语、到达点、场所等）',
    markers: 'が / を / に / で / へ / と / から / まで / より',
    sample: '猫がいます。/ 本を読む。/ 学校に行く。',
  },
  {
    name: '提示助词',
    role: '把某成分拉到前台，形成话题、对比或强调',
    markers: 'は / も / こそ / しか / さえ',
    sample: '私は学生です。/ 水しか飲まない。',
  },
  {
    name: '并列助词',
    role: '连接两个或多个词语，形成并列关系',
    markers: 'と / や / とか / に',
    sample: '本と雑誌。/ 野菜や果物。/ 映画とか音楽とか。',
  },
  {
    name: '副助词',
    role: '补充范围、程度、限定、类比等附加语义',
    markers: 'だけ / ばかり / まで / など / ほど / くらい',
    sample: '一時間だけ休む。/ 子どもまで知っている。',
  },
  {
    name: '接续助词',
    role: '连接分句，表达因果、转折、条件、并行等关系',
    markers: 'から / ので / けど / が / て / たら / ば',
    sample: '雨だから行かない。/ 忙しいけど楽しい。',
  },
  {
    name: '终助词',
    role: '放在句尾，表达说话人的语气、态度和语用功能',
    markers: 'か / ね / よ / な / ぞ / わ',
    sample: '行くよ。/ いいね。/ 本当か。',
  },
  {
    name: '准体助词',
    role: '把前面的成分名词化，或代用前文信息',
    markers: 'の',
    sample: '赤いのをください。/ 来るのが遅い。',
  },
];

const PARTICLE_GROUPS: ParticleGroup[] = [
  {
    particle: 'は',
    title: '主题提示 / 对比',
    summary: '先告诉听者“接下来在说谁/什么”，再补充说明。',
    usages: [
      {
        label: '提示主题',
        rule: 'N は ...',
        example: '私は会社員です。',
      },
      {
        label: '对比两个对象',
        rule: 'A は ... が、B は ...',
        example: '日本語は話せますが、英語はあまり話せません。',
      },
      {
        label: '设定场景背景',
        rule: 'Time/Place は ...',
        example: '今日は雨です。',
      },
    ],
  },
  {
    particle: 'が',
    title: '主语标记 / 强调对象',
    summary: '回答“是谁/什么发生了动作或状态”。',
    usages: [
      {
        label: '引入新信息主语',
        rule: 'N が ...',
        example: '猫がいます。',
      },
      {
        label: '回答疑问词',
        rule: 'だれが / 何が ...',
        example: 'だれが来ましたか。田中さんが来ました。',
      },
      {
        label: '从句中的主语',
        rule: 'N が + 动词 + 名词',
        example: '私が作った料理です。',
      },
    ],
  },
  {
    particle: 'を',
    title: '宾语 / 经过点 / 离开点',
    summary: '最核心是“动作作用对象”，也可标记经过与离开。',
    usages: [
      {
        label: '宾语标记',
        rule: 'N を V',
        example: '本を読みます。',
      },
      {
        label: '经过某场所',
        rule: 'Place を V',
        example: '公園を散歩します。',
      },
      {
        label: '从某处离开',
        rule: 'Place を 出る/離れる',
        example: '7時に家を出ます。',
      },
    ],
  },
  {
    particle: 'に',
    title: '目的 / 对象 / 时间点 / 到达点',
    summary: '「に」的核心是“落在一个点上”。',
    usages: [
      {
        label: '目的',
        rule: 'Vます去ます + に 行く/来る',
        example: '本を買いに行きます。',
      },
      {
        label: '动作对象',
        rule: 'Person に あげる/教える/電話する',
        example: '先生にメールを送ります。',
      },
      {
        label: '时间点',
        rule: 'Time に V',
        example: '6時に起きます。',
      },
      {
        label: '到达点',
        rule: 'Place に 行く/来る/着く',
        example: '駅に着きました。',
      },
      {
        label: '存在地点',
        rule: 'Place に あります/います',
        example: '机の上に辞書があります。',
      },
      {
        label: '变化结果',
        rule: 'N/形容词语干 に なる',
        example: '医者になりたいです。',
      },
    ],
  },
  {
    particle: 'へ',
    title: '方向',
    summary: '强调“朝向哪里去”，到达感弱于「に」。',
    usages: [
      {
        label: '移动方向',
        rule: 'Place へ 行く/来る/帰る',
        example: '学校へ行きます。',
      },
      {
        label: '发送对象（书面）',
        rule: 'Person へ 手紙/メールを送る',
        example: '母へ手紙を書きます。',
      },
      {
        label: '指向性表达',
        rule: 'N へ の N',
        example: '海外への旅行です。',
      },
    ],
  },
  {
    particle: 'で',
    title: '动作场所 / 手段 / 原因 / 范围',
    summary: '表示“动作如何发生”，不是“存在在哪里”。',
    usages: [
      {
        label: '动作场所',
        rule: 'Place で V',
        example: '図書館で勉強します。',
      },
      {
        label: '手段工具',
        rule: 'Tool/Language で V',
        example: '日本語で説明します。',
      },
      {
        label: '材料原料',
        rule: 'Material で 作る',
        example: '木で机を作ります。',
      },
      {
        label: '原因理由',
        rule: 'Reason で ...',
        example: '事故で電車が遅れました。',
      },
      {
        label: '范围/人数',
        rule: 'Quantity で ...',
        example: '三人で旅行します。',
      },
    ],
  },
  {
    particle: 'と',
    title: '并列 / 共同 / 引用 / 条件',
    summary: '常见于“和”“与……一起”“说……”等结构。',
    usages: [
      {
        label: '完整并列',
        rule: 'A と B',
        example: 'りんごとバナナを買いました。',
      },
      {
        label: '共同对象',
        rule: 'Person と V',
        example: '友だちと映画を見ます。',
      },
      {
        label: '引用内容',
        rule: 'Sentence と 言う/思う/聞く',
        example: '明日休むと言いました。',
      },
      {
        label: '恒常条件',
        rule: 'Vる と ...',
        example: '春になると暖かくなります。',
      },
    ],
  },
  {
    particle: 'も',
    title: '追加 / 强调',
    summary: '在已知信息上“再加一个”。',
    usages: [
      {
        label: '也',
        rule: 'N も ...',
        example: '私も行きます。',
      },
      {
        label: '疑问词全否定',
        rule: '疑问词 + も + 否定',
        example: '何も食べませんでした。',
      },
      {
        label: '数量强调',
        rule: 'Quantity も ...',
        example: '一時間も待ちました。',
      },
    ],
  },
  {
    particle: 'の',
    title: '所属 / 修饰 / 名词化',
    summary: '把前项变成后项的限定信息，也能代指事物。',
    usages: [
      {
        label: '所属关系',
        rule: 'A の B',
        example: '私の本です。',
      },
      {
        label: '属性类别',
        rule: 'Category の N',
        example: '日本語の先生です。',
      },
      {
        label: '内容/同位',
        rule: 'N の N',
        example: '会議の資料を作ります。',
      },
      {
        label: '名词化/代用',
        rule: '普通形 + の',
        example: '赤いのをください。',
      },
    ],
  },
  {
    particle: 'から',
    title: '起点 / 来源 / 原因 / 材料',
    summary: '表示“从……出发”。',
    usages: [
      {
        label: '时间起点',
        rule: 'Time から ...',
        example: '9時から会議です。',
      },
      {
        label: '地点起点',
        rule: 'Place から ...',
        example: '駅から歩きます。',
      },
      {
        label: '来源对象',
        rule: 'Person から もらう/聞く',
        example: '先生から連絡をもらいました。',
      },
      {
        label: '原因理由',
        rule: 'Clause から ...',
        example: '時間がないから、急ぎます。',
      },
      {
        label: '原材料',
        rule: 'Material から 作る',
        example: '米から酒を作ります。',
      },
    ],
  },
  {
    particle: 'まで',
    title: '终点 / 范围终止 / 程度扩展',
    summary: '表示“到……为止”。',
    usages: [
      {
        label: '时间终点',
        rule: 'Time まで ...',
        example: '5時まで働きます。',
      },
      {
        label: '地点终点',
        rule: 'Place まで ...',
        example: '家まで送ります。',
      },
      {
        label: '范围界限',
        rule: 'A から B まで',
        example: '一ページから十ページまで読みます。',
      },
      {
        label: '程度扩展',
        rule: 'N まで ...',
        example: '子どもまで知っています。',
      },
    ],
  },
  {
    particle: 'か',
    title: '疑问 / 选择 / 不确定',
    summary: '表示疑问与不确定范围。',
    usages: [
      {
        label: '句末疑问',
        rule: '... か。',
        example: 'これは何ですか。',
      },
      {
        label: '选择关系',
        rule: 'A か B',
        example: 'コーヒーかお茶をください。',
      },
      {
        label: '疑问词不确定',
        rule: 'だれか / どこか / 何か',
        example: 'だれかいますか。',
      },
    ],
  },
  {
    particle: 'や',
    title: '不完全列举',
    summary: '表示“比如A、B之类”，不表示列举完毕。',
    usages: [
      {
        label: '列举示例',
        rule: 'A や B',
        example: '机の上に本やノートがあります。',
      },
      {
        label: '和「など」搭配',
        rule: 'A や B など',
        example: '休日は映画や音楽などを楽しみます。',
      },
      {
        label: '类别提示',
        rule: 'N や N を V',
        example: '野菜や果物を買いました。',
      },
    ],
  },
];

const CONTRAST_ROWS: ContrastRow[] = [
  {
    title: 'は vs が',
    aRule: 'は：话题/对比，语感偏“至于……”。',
    bRule: 'が：主语/强调，语感偏“是……在……”。',
    sample: '私は中国人です。/ だれが来ましたか。田中さんが来ました。',
  },
  {
    title: 'に vs で',
    aRule: 'に：存在点、到达点、时间点。',
    bRule: 'で：动作发生地点、手段、原因。',
    sample: '公園に猫がいます。/ 公園で走ります。',
  },
  {
    title: 'に vs へ',
    aRule: 'に：到达感更强。',
    bRule: 'へ：方向感更强。',
    sample: '大阪に行きます。/ 大阪へ行きます。',
  },
  {
    title: 'と vs や',
    aRule: 'と：完整并列，倾向“全部列完”。',
    bRule: 'や：示例并列，倾向“还有别的”。',
    sample: 'パンと牛乳を買う。/ パンや牛乳を買う。',
  },
];

const PATTERN_ROWS: PatternRow[] = [
  {
    pattern: 'N は N です',
    meaning: '主题 + 判断',
    sample: 'これは辞書です。',
  },
  {
    pattern: 'N が あります/います',
    meaning: '存在句',
    sample: '机の上に本があります。',
  },
  {
    pattern: 'N を V',
    meaning: '宾语句',
    sample: '日本語を勉強します。',
  },
  {
    pattern: 'Place で V',
    meaning: '地点动作',
    sample: '家で宿題をします。',
  },
  {
    pattern: 'Time に V',
    meaning: '时间点动作',
    sample: '毎朝6時に起きます。',
  },
  {
    pattern: 'A から B まで',
    meaning: '起点到终点',
    sample: '9時から17時まで働きます。',
  },
  {
    pattern: 'A と B / A や B',
    meaning: '完整并列 / 示例并列',
    sample: '本と雑誌 / 本や雑誌',
  },
];

const TIPS: string[] = [
  '先找动词，再判断它需要的是对象（を）、到达点（に）还是动作地点（で）。',
  '先把句子写成骨架：N は / が + N を + Place で + V，再补细节。',
  '优先练“对照对”而不是单个记忆：は-が、に-で、と-や。',
  '复习时把同一句替换不同助词，比较语义变化，会比死记更快。',
];

export default function ParticleGuideScreen() {
  const topPadding = useScreenTopPadding();
  const [compactMode, setCompactMode] = useState(true);
  const [expandedSubclass, setExpandedSubclass] = useState(false);
  const [expandedParticle, setExpandedParticle] = useState<string | null>(null);
  const [expandedContrast, setExpandedContrast] = useState(false);
  const [expandedPattern, setExpandedPattern] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <View style={styles.pageHeaderRow}>
        <View style={styles.pageHeaderTextWrap}>
          <Text style={styles.pageTitle}>助词表</Text>
          <Text style={styles.pageSubtitle}>按助词整理详细常用用法，每个助词都提供判断点、句型和例句。</Text>
        </View>
        <Pressable
          onPress={() => setCompactMode((prev) => !prev)}
          style={({ pressed }) => [styles.pageActionBtn, pressed ? styles.pageActionBtnPressed : null]}
        >
          <Text style={styles.pageActionText}>{compactMode ? '详细模式' : '精简模式'}</Text>
        </Pressable>
      </View>

      <View style={styles.introCard}>
        <Text style={styles.introTitle}>先抓核心</Text>
        <Text style={styles.introLine}>助词的本质是“语法关系标签”，不是简单翻译词。</Text>
        <Text style={styles.introHint}>
          {compactMode ? '当前为精简模式：按需点开单个助词查看细节。' : '当前为详细模式：连续展示全部助词用法。'}
        </Text>
      </View>

      <View style={[styles.card, styles.subclassCard]}>
        <Pressable
          onPress={() => {
            if (!compactMode) return;
            setExpandedSubclass((prev) => !prev);
          }}
          style={({ pressed }) => [styles.sectionHeadRow, compactMode && pressed ? styles.sectionHeadPressed : null]}
        >
          <Text style={[styles.sectionTitle, styles.sectionTitleInHead]}>助词子类速览</Text>
          {compactMode ? (
            <View style={styles.expandTagWrap}>
              <Text style={styles.expandTagText}>{expandedSubclass ? '收起' : '展开'}</Text>
            </View>
          ) : null}
        </Pressable>

        {!compactMode || expandedSubclass ? (
          PARTICLE_SUBCLASS_ROWS.map((item) => (
            <View key={item.name} style={styles.subclassItem}>
              <View style={styles.subclassHead}>
                <Text style={styles.subclassName}>{item.name}</Text>
                <Text style={styles.subclassRole}>{item.role}</Text>
              </View>
              <Text style={styles.subclassMarkers}>{`常见标记：${item.markers}`}</Text>
              <Text style={styles.subclassSample}>{`例：${item.sample}`}</Text>
            </View>
          ))
        ) : (
          <Pressable onPress={() => setExpandedSubclass(true)}>
            <Text style={styles.compactHint}>点击展开查看 7 类助词子类与判断重点</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>每个助词的常用用法</Text>
        {PARTICLE_GROUPS.map((group) => (
          <View key={group.particle} style={styles.particleBlock}>
            <Pressable
              onPress={() => {
                if (!compactMode) return;
                setExpandedParticle((prev) => (prev === group.particle ? null : group.particle));
              }}
              style={({ pressed }) => [styles.particleHead, compactMode && pressed ? styles.particleHeadPressed : null]}
            >
              <View style={styles.particleBadgeWrap}>
                <Text style={styles.particleBadgeText}>{group.particle}</Text>
              </View>
              <View style={styles.particleHeadText}>
                <Text style={styles.particleName}>{group.title}</Text>
                <Text style={styles.particleSummary}>{group.summary}</Text>
              </View>
              {compactMode ? (
                <View style={styles.expandTagWrap}>
                  <Text style={styles.expandTagText}>{expandedParticle === group.particle ? '收起' : '展开'}</Text>
                </View>
              ) : null}
            </Pressable>

            {!compactMode || expandedParticle === group.particle ? (
              group.usages.map((usage, index) => (
                <View key={`${group.particle}-${usage.label}`} style={styles.usageRow}>
                  <View style={styles.usageIndexWrap}>
                    <Text style={styles.usageIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.usageBody}>
                    <Text style={styles.usageLabel}>{usage.label}</Text>
                    <Text style={styles.usageRule}>{usage.rule}</Text>
                    <Text style={styles.usageExample}>{usage.example}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Pressable onPress={() => setExpandedParticle(group.particle)}>
                <Text style={styles.compactHint}>点击展开查看 {group.usages.length} 条常用用法</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.contrastCard]}>
        <Pressable
          onPress={() => {
            if (!compactMode) return;
            setExpandedContrast((prev) => !prev);
          }}
          style={({ pressed }) => [styles.sectionHeadRow, compactMode && pressed ? styles.sectionHeadPressed : null]}
        >
          <Text style={[styles.sectionTitle, styles.sectionTitleInHead]}>易混对比</Text>
          {compactMode ? (
            <View style={styles.expandTagWrap}>
              <Text style={styles.expandTagText}>{expandedContrast ? '收起' : '展开'}</Text>
            </View>
          ) : null}
        </Pressable>
        {!compactMode || expandedContrast ? (
          CONTRAST_ROWS.map((item) => (
            <View key={item.title} style={styles.contrastItem}>
              <Text style={styles.contrastTitle}>{item.title}</Text>
              <Text style={styles.contrastText}>{item.aRule}</Text>
              <Text style={styles.contrastText}>{item.bRule}</Text>
              <Text style={styles.contrastSample}>{item.sample}</Text>
            </View>
          ))
        ) : (
          <Pressable onPress={() => setExpandedContrast(true)}>
            <Text style={styles.compactHint}>点击展开查看常见助词易混点</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.card, styles.patternCard]}>
        <Pressable
          onPress={() => {
            if (!compactMode) return;
            setExpandedPattern((prev) => !prev);
          }}
          style={({ pressed }) => [styles.sectionHeadRow, compactMode && pressed ? styles.sectionHeadPressed : null]}
        >
          <Text style={[styles.sectionTitle, styles.sectionTitleInHead]}>基础句型</Text>
          {compactMode ? (
            <View style={styles.expandTagWrap}>
              <Text style={styles.expandTagText}>{expandedPattern ? '收起' : '展开'}</Text>
            </View>
          ) : null}
        </Pressable>
        {!compactMode || expandedPattern ? (
          PATTERN_ROWS.map((item) => (
            <View key={item.pattern} style={styles.patternRow}>
              <View style={styles.patternHead}>
                <Text style={styles.patternText}>{item.pattern}</Text>
                <Text style={styles.patternMeaning}>{item.meaning}</Text>
              </View>
              <Text style={styles.patternExample}>{item.sample}</Text>
            </View>
          ))
        ) : (
          <Pressable onPress={() => setExpandedPattern(true)}>
            <Text style={styles.compactHint}>点击展开查看高频基础句型</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.card, styles.tipCard]}>
        <Text style={styles.sectionTitle}>学习建议</Text>
        {TIPS.map((item, index) => (
          <Text key={item} style={styles.tipText}>{`${index + 1}. ${item}`}</Text>
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
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  pageHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
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
  pageSubtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
    lineHeight: 20,
  },
  introCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#d1fae5',
    backgroundColor: '#f0fdf4',
    borderRadius: radius.l,
    padding: spacing.s,
  },
  introTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  introLine: {
    color: '#334155',
    lineHeight: 20,
  },
  introHint: {
    marginTop: spacing.xs,
    color: '#15803d',
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
  subclassCard: {
    borderColor: '#d1fae5',
    backgroundColor: '#f8fffb',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.s,
  },
  sectionTitleInHead: {
    marginBottom: 0,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  sectionHeadPressed: {
    opacity: 0.85,
  },
  subclassItem: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    backgroundColor: '#ffffff',
    borderRadius: radius.s,
    padding: spacing.s,
    marginBottom: spacing.xs,
  },
  subclassHead: {
    marginBottom: 2,
  },
  subclassName: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },
  subclassRole: {
    marginTop: 2,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  subclassMarkers: {
    marginTop: spacing.xs,
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  subclassSample: {
    marginTop: 2,
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  particleBlock: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: radius.s,
    backgroundColor: '#f8fbff',
    padding: spacing.s,
    marginBottom: spacing.s,
  },
  particleHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.s,
  },
  particleHeadPressed: {
    opacity: 0.85,
  },
  particleBadgeWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
  },
  particleBadgeText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  particleHeadText: {
    flex: 1,
  },
  particleName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  particleSummary: {
    marginTop: 2,
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  expandTagWrap: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    marginTop: 2,
  },
  expandTagText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
  },
  compactHint: {
    marginTop: spacing.xs,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
    paddingTop: spacing.s,
    marginTop: spacing.xs,
  },
  usageIndexWrap: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
    marginTop: 1,
  },
  usageIndexText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  usageBody: {
    flex: 1,
  },
  usageLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  usageRule: {
    marginTop: 2,
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  usageExample: {
    marginTop: spacing.xs,
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  contrastCard: {
    borderColor: '#fde68a',
    backgroundColor: '#fffef8',
  },
  contrastItem: {
    borderWidth: 1,
    borderColor: '#fef3c7',
    backgroundColor: '#fffbeb',
    borderRadius: radius.s,
    padding: spacing.s,
    marginBottom: spacing.xs,
  },
  contrastTitle: {
    color: '#92400e',
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  contrastText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  contrastSample: {
    marginTop: 2,
    color: '#1e3a8a',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  patternCard: {
    borderColor: '#dbeafe',
    backgroundColor: '#f8fbff',
  },
  patternRow: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: radius.s,
    backgroundColor: '#ffffff',
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
  tipCard: {
    borderColor: '#c7d2fe',
    backgroundColor: '#f5f7ff',
    marginBottom: spacing.m,
  },
  tipText: {
    color: '#374151',
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 3,
  },
});

