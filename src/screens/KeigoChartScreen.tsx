import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import { colors, radius, spacing } from '../theme';
import { useScreenTopPadding } from '../utils/useScreenTopPadding';

type KeigoRow = {
  plain: string;
  respectful: string;
  humble: string;
  polite: string;
  gloss: string;
  respectfulIntro: string;
  humbleIntro: string;
};

type GiveRow = {
  scene: string;
  plain: string;
  keigo: string;
  intro: string;
  exampleJa: string;
  exampleZh: string;
};

type RequestRow = {
  pattern: string;
  usage: string;
  intro: string;
  exampleJa: string;
  exampleZh: string;
};

type KeigoPracticeField = 'respectful' | 'humble' | 'polite';
type KeigoPracticeMode = 'plain_to_keigo' | 'gloss_to_keigo' | 'keigo_to_plain' | 'keigo_to_gloss';

type KeigoPracticeQuestion = {
  id: string;
  plain: string;
  gloss: string;
  keigo: string;
  field: KeigoPracticeField;
  label: string;
  answer: string;
  options: string[];
};

const ROWS: KeigoRow[] = [
  {
    plain: '見る',
    respectful: 'ご覧になる',
    humble: '拝見する',
    polite: '見ます',
    gloss: '看',
    respectfulIntro: '对上级或客户说“看”时，用「ご覧になる」。',
    humbleIntro: '自己“看”对方资料或作品时，用「拝見する」。',
  },
  {
    plain: '行く / 来る',
    respectful: 'いらっしゃる / おいでになる',
    humble: '伺う / 参る',
    polite: '行きます / 来ます',
    gloss: '去 / 来',
    respectfulIntro: '谈对方来访或到场时，用「いらっしゃる / おいでになる」。',
    humbleIntro: '自己去拜访对方时，多用「伺う / 参る」。',
  },
  {
    plain: 'いる',
    respectful: 'いらっしゃる',
    humble: 'おる',
    polite: 'います',
    gloss: '在 / 存在',
    respectfulIntro: '描述对方“在”某地时，用「いらっしゃる」。',
    humbleIntro: '描述自己或己方“在”时，可用「おる」。',
  },
  {
    plain: '言う',
    respectful: 'おっしゃる',
    humble: '申す / 申し上げる',
    polite: '言います',
    gloss: '说',
    respectfulIntro: '引用客户、老师发言时，用「おっしゃる」。',
    humbleIntro: '自己发言对外表达时，用「申す / 申し上げる」。',
  },
  {
    plain: 'する',
    respectful: 'なさる',
    humble: 'いたす',
    polite: 'します',
    gloss: '做',
    respectfulIntro: '谈对方动作时，用「なさる」。',
    humbleIntro: '谈自己动作时，用「いたす / いたします」。',
  },
  {
    plain: '食べる / 飲む',
    respectful: '召し上がる',
    humble: 'いただく',
    polite: '食べます / 飲みます',
    gloss: '吃 / 喝',
    respectfulIntro: '请对方用餐、饮用时，用「召し上がる」。',
    humbleIntro: '自己受邀或受赠进食时，用「いただく」。',
  },
  {
    plain: '知る',
    respectful: 'ご存じだ',
    humble: '存じる',
    polite: '知っています',
    gloss: '知道',
    respectfulIntro: '询问对方是否知道时，用「ご存じだ / ご存じですか」。',
    humbleIntro: '表达自己“知道”时，用「存じる / 存じております」。',
  },
  {
    plain: '思う',
    respectful: 'お思いになる',
    humble: '存じる',
    polite: '思います',
    gloss: '想 / 认为',
    respectfulIntro: '陈述对方看法时，用「お思いになる」。',
    humbleIntro: '自谦表达自己的意见时，可用「存じる / 存じます」。',
  },
  {
    plain: '与える',
    respectful: 'くださる',
    humble: '差し上げる',
    polite: 'あげます',
    gloss: '给',
    respectfulIntro: '对方给我方时，用「くださる」。',
    humbleIntro: '我方给对方时，用「差し上げる」。',
  },
  {
    plain: 'もらう',
    respectful: 'お受け取りになる',
    humble: 'いただく',
    polite: 'もらいます',
    gloss: '得到 / 收到',
    respectfulIntro: '谈对方“收下、领取”时，可用「お受け取りになる」。',
    humbleIntro: '自己收到他人给予时，常用「いただく」。',
  },
  {
    plain: '会う',
    respectful: 'お会いになる',
    humble: 'お目にかかる',
    polite: '会います',
    gloss: '见面',
    respectfulIntro: '描述对方见面会面时，用「お会いになる」。',
    humbleIntro: '自己见客户或老师时，用「お目にかかる」。',
  },
  {
    plain: '聞く / 尋ねる',
    respectful: 'お聞きになる / お尋ねになる',
    humble: '伺う / お聞きする',
    polite: '聞きます / 尋ねます',
    gloss: '听 / 询问',
    respectfulIntro: '谈对方“听、询问”时，用「お聞きになる / お尋ねになる」。',
    humbleIntro: '自己向对方请教、询问时，用「伺う / お聞きする」。',
  },
];

const GIVE_ROWS: GiveRow[] = [
  {
    scene: '我 → 他人',
    plain: 'あげる',
    keigo: '差し上げる（谦）',
    intro: '当“我方把东西给对方（上级/客户）”时，用「差し上げる」更礼貌。',
    exampleJa: '資料を先生に差し上げます。',
    exampleZh: '我把资料交给老师。',
  },
  {
    scene: '他人 → 我/我方',
    plain: 'くれる',
    keigo: 'くださる（尊）',
    intro: '当“对方给我方”时，用「くださる」来抬高对方的行为。',
    exampleJa: '部長が本をくださいました。',
    exampleZh: '部长给了我一本书。',
  },
  {
    scene: '从他人得到',
    plain: 'もらう',
    keigo: 'いただく（谦）',
    intro: '当“我方从对方得到东西”时，用「いただく」表示谦逊。',
    exampleJa: '先輩にアドバイスをいただきました。',
    exampleZh: '我得到了前辈的建议。',
  },
];

const REQUEST_ROWS: RequestRow[] = [
  {
    pattern: '～をください / ～をちょうだい',
    usage: '请求对方给东西（ちょうだい较随意）',
    intro: '「ください」较正式，适用于店铺、职场、陌生场合；「ちょうだい」更口语化。',
    exampleJa: 'お水をください。',
    exampleZh: '请给我一杯水。',
  },
  {
    pattern: '～てください / ～てちょうだい',
    usage: '请求对方做某事（ちょうだい较随意）',
    intro: '用于提出动作请求；正式场景优先用「～てください」。',
    exampleJa: 'ここに名前を書いてください。',
    exampleZh: '请在这里写上名字。',
  },
  {
    pattern: '～させてください',
    usage: '请求许可“让我做…”',
    intro: '用于向对方申请许可，语气是“请允许我……”。',
    exampleJa: '先に失礼させてください。',
    exampleZh: '请允许我先告辞。',
  },
  {
    pattern: '～ないでください',
    usage: '请求不要做某事',
    intro: '用于礼貌地制止对方行为，语气比命令式更柔和。',
    exampleJa: 'ここで写真を撮らないでください。',
    exampleZh: '请不要在这里拍照。',
  },
];

const NOTES: string[] = [
  '尊敬语：抬高对方的动作或状态',
  '谦让语：降低自己的动作或状态',
  '丁宁语：用礼貌形式表达',
  '遇到固定表达，优先使用固定敬语',
];

const KEIGO_PRACTICE_SIZE = 18;
const KEIGO_PRACTICE_FIELDS: KeigoPracticeField[] = ['respectful', 'humble', 'polite'];
const KEIGO_FIELD_LABEL: Record<KeigoPracticeField, string> = {
  respectful: '尊敬语',
  humble: '谦让语',
  polite: '丁宁语',
};
const KEIGO_MODE_ITEMS: Array<{ id: KeigoPracticeMode; label: string }> = [
  { id: 'plain_to_keigo', label: '原型选敬语' },
  { id: 'gloss_to_keigo', label: '释义选敬语' },
  { id: 'keigo_to_plain', label: '敬语选原型' },
  { id: 'keigo_to_gloss', label: '敬语选释义' },
];
const KEIGO_MODE_LABEL: Record<KeigoPracticeMode, string> = {
  plain_to_keigo: '原型选敬语',
  gloss_to_keigo: '释义选敬语',
  keigo_to_plain: '敬语选原型',
  keigo_to_gloss: '敬语选释义',
};
const PRACTICE_OPTION_LABELS = ['A', 'B', 'C', 'D'];

function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildKeigoPracticeSession(mode: KeigoPracticeMode): KeigoPracticeQuestion[] {
  const questions: KeigoPracticeQuestion[] = [];

  for (const row of ROWS) {
    for (const field of KEIGO_PRACTICE_FIELDS) {
      const keigo = row[field];
      const label = KEIGO_FIELD_LABEL[field];
      let answer = '';
      let pool: string[] = [];

      if (mode === 'plain_to_keigo' || mode === 'gloss_to_keigo') {
        answer = keigo;
        pool = ROWS.map((item) => item[field]);
      } else if (mode === 'keigo_to_plain') {
        answer = row.plain;
        pool = ROWS.map((item) => item.plain);
      } else {
        answer = row.gloss;
        pool = ROWS.map((item) => item.gloss);
      }

      const uniquePool = [...new Set(pool.filter((item) => item !== answer))];
      const options: string[] = [answer];

      for (const candidate of shuffle(uniquePool)) {
        if (options.length >= 4) break;
        options.push(candidate);
      }

      questions.push({
        id: `${mode}-${row.plain}-${field}`,
        plain: row.plain,
        gloss: row.gloss,
        keigo,
        field,
        label,
        answer,
        options: shuffle(options),
      });
    }
  }

  return shuffle(questions).slice(0, KEIGO_PRACTICE_SIZE);
}

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

type KeigoRowItemProps = KeigoRow & {
  active: boolean;
  onPress: () => void;
};

function KeigoRowItem({ plain, respectful, humble, polite, active, onPress }: KeigoRowItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, styles.pressableRow, active ? styles.activeRow : null, pressed ? styles.pressedRow : null]}>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{plain}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{respectful}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{humble}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{polite}</Text>
    </Pressable>
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

type GiveRowItemProps = GiveRow & {
  active: boolean;
  onPress: () => void;
};

function GiveExpandableRowItem({ scene, plain, keigo, active, onPress }: GiveRowItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, styles.pressableRow, active ? styles.activeRow : null, pressed ? styles.pressedRow : null]}>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{scene}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{plain}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{keigo}</Text>
    </Pressable>
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

type RequestRowItemProps = RequestRow & {
  active: boolean;
  onPress: () => void;
};

function RequestRowItem({ pattern, usage, active, onPress }: RequestRowItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, styles.pressableRow, active ? styles.activeRow : null, pressed ? styles.pressedRow : null]}>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{pattern}</Text>
      <Text style={[styles.cell, active ? styles.activeCell : null]}>{usage}</Text>
    </Pressable>
  );
}

function KeigoPracticePanel() {
  const [mode, setMode] = useState<KeigoPracticeMode>('plain_to_keigo');
  const [session, setSession] = useState<KeigoPracticeQuestion[]>(() => buildKeigoPracticeSession('plain_to_keigo'));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const finished = index >= session.length;
  const current = finished ? null : session[index];
  const answered = selected !== null;
  const currentCorrect = useMemo(() => (current ? selected === current.answer : false), [current, selected]);
  const progressRatio = session.length ? (finished ? 1 : (index + 1) / session.length) : 0;
  const promptMain =
    mode === 'plain_to_keigo'
      ? current?.plain ?? ''
      : mode === 'gloss_to_keigo'
        ? current?.gloss ?? ''
        : current?.keigo ?? '';

  const resetSession = (targetMode: KeigoPracticeMode = mode) => {
    setSession(buildKeigoPracticeSession(targetMode));
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
  };

  const handleSelect = (option: string) => {
    if (!current || answered) return;
    setSelected(option);
    if (option === current.answer) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (!answered) return;
    setSelected(null);
    setIndex((prev) => prev + 1);
  };

  const handleModeChange = (nextMode: KeigoPracticeMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetSession(nextMode);
  };

  if (finished) {
    const percent = session.length ? Math.round((correctCount / session.length) * 100) : 0;
    return (
      <View style={styles.practiceCard}>
        <View style={styles.practiceModeRow}>
          {KEIGO_MODE_ITEMS.map((item) => {
            const active = item.id === mode;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleModeChange(item.id)}
                style={[styles.practiceModeChip, active ? styles.practiceModeChipActive : null]}
              >
                <Text style={[styles.practiceModeChipText, active ? styles.practiceModeChipTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.practiceTitle}>练习完成</Text>
        <Text style={styles.practiceResultRate}>{percent}%</Text>
        <Text style={styles.practiceSummary}>正确 {correctCount} / {session.length}</Text>
        <Text style={styles.practiceSummary}>当前题型：{KEIGO_MODE_LABEL[mode]}</Text>
        <PrimaryButton title="再来一组" onPress={resetSession} style={styles.practiceButton} />
      </View>
    );
  }

  if (!current) return null;

  return (
    <View style={styles.practiceCard}>
      <View style={styles.practiceModeRow}>
        {KEIGO_MODE_ITEMS.map((item) => {
          const active = item.id === mode;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleModeChange(item.id)}
              style={[styles.practiceModeChip, active ? styles.practiceModeChipActive : null]}
            >
              <Text style={[styles.practiceModeChipText, active ? styles.practiceModeChipTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.practiceHeadRow}>
        <Text style={styles.practiceProgress}>第 {index + 1} / {session.length} 题</Text>
      </View>
      <View style={styles.practiceProgressTrack}>
        <View style={[styles.practiceProgressFill, { width: `${Math.max(0, Math.min(100, Math.round(progressRatio * 100)))}%` }]} />
      </View>

      <View style={styles.practicePromptCard}>
        <View style={styles.practiceTargetRow}>
          <Text style={styles.practiceTargetLabel}>目标敬语</Text>
          <Text style={styles.practiceTargetValue}>{current.label}</Text>
        </View>
        <Text style={styles.practicePrompt}>「{promptMain}」</Text>
      </View>

      {current.options.map((option, optionIndex) => {
        const isSelected = option === selected;
        const isCorrect = option === current.answer;
        return (
          <Pressable
            key={`${current.id}-${option}`}
            onPress={() => handleSelect(option)}
            disabled={answered}
            style={({ pressed }) => [
              styles.practiceOption,
              answered && isCorrect ? styles.practiceOptionCorrect : null,
              answered && isSelected && !isCorrect ? styles.practiceOptionWrong : null,
              pressed && !answered ? styles.practiceOptionPressed : null,
            ]}
          >
            <View style={styles.practiceOptionInner}>
              <View
                style={[
                  styles.practiceOptionBadge,
                  answered && isCorrect ? styles.practiceOptionBadgeCorrect : null,
                  answered && isSelected && !isCorrect ? styles.practiceOptionBadgeWrong : null,
                ]}
              >
                <Text style={styles.practiceOptionBadgeText}>{PRACTICE_OPTION_LABELS[optionIndex] ?? '?'}</Text>
              </View>
              <Text
                style={[
                  styles.practiceOptionText,
                  answered && (isCorrect || isSelected) ? styles.practiceOptionTextStrong : null,
                ]}
              >
                {option}
              </Text>
              {answered && isCorrect ? <Text style={styles.practiceOptionMark}>正确</Text> : null}
            </View>
          </Pressable>
        );
      })}

      {answered ? (
        <>
          <Text
            style={[
              styles.practiceFeedback,
              currentCorrect ? styles.practiceFeedbackOk : styles.practiceFeedbackNg,
              currentCorrect ? styles.practiceFeedbackCardOk : styles.practiceFeedbackCardNg,
            ]}
          >
            {currentCorrect ? '回答正确' : `回答错误，正确答案：${current.answer}`}
          </Text>
          <PrimaryButton title={index === session.length - 1 ? '查看结果' : '下一题'} onPress={handleNext} style={styles.practiceButton} />
        </>
      ) : null}
    </View>
  );
}

export default function KeigoChartScreen() {
  const topPadding = useScreenTopPadding();
  const [showPractice, setShowPractice] = useState(false);
  const [selectedPlain, setSelectedPlain] = useState<string | null>(null);
  const [selectedGiveKey, setSelectedGiveKey] = useState<string | null>(null);
  const [selectedRequestKey, setSelectedRequestKey] = useState<string | null>(null);
  const handleToggleRow = (plain: string) => setSelectedPlain((value) => (value === plain ? null : plain));
  const handleToggleGive = (key: string) => setSelectedGiveKey((value) => (value === key ? null : key));
  const handleToggleRequest = (key: string) => setSelectedRequestKey((value) => (value === key ? null : key));

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <View style={styles.pageHeaderRow}>
        <Text style={styles.pageTitle}>敬语表</Text>
        <Pressable
          onPress={() => setShowPractice((prev) => !prev)}
          style={({ pressed }) => [styles.pageActionBtn, pressed ? styles.pageActionBtnPressed : null]}
        >
          <Text style={styles.pageActionText}>{showPractice ? '返回表格' : '开始练习'}</Text>
        </Pressable>
      </View>

      {showPractice ? (
        <KeigoPracticePanel />
      ) : (
        <>
          <View style={styles.card}>
            <HeaderRow />
            {ROWS.map((row) => {
              const expanded = selectedPlain === row.plain;
              return (
                <View key={row.plain} style={[styles.expandWrap, expanded ? styles.expandWrapActive : null]}>
                  <KeigoRowItem
                    {...row}
                    active={expanded}
                    onPress={() => handleToggleRow(row.plain)}
                  />
                  {expanded ? (
                    <View style={styles.inlineIntroCard}>
                      <Text style={styles.introGloss}>{row.gloss}</Text>
                      <View style={styles.introLine}>
                        <Text style={[styles.introLabel, styles.respectfulLabel]}>尊</Text>
                        <Text style={styles.introValue}>{row.respectfulIntro}</Text>
                      </View>
                      <View style={styles.introLine}>
                        <Text style={[styles.introLabel, styles.humbleLabel]}>谦</Text>
                        <Text style={styles.introValue}>{row.humbleIntro}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>授受表达</Text>
          <Text style={styles.sectionSubtitle}>常用的给与 / 接受敬语表达</Text>
          <View style={[styles.card, styles.sectionCard]}>
            <GiveHeaderRow />
            {GIVE_ROWS.map((row) => {
              const rowKey = `${row.scene}-${row.plain}`;
              const expanded = selectedGiveKey === rowKey;
              return (
                <View key={rowKey} style={[styles.expandWrap, expanded ? styles.expandWrapActive : null]}>
                  <GiveExpandableRowItem
                    {...row}
                    active={expanded}
                    onPress={() => handleToggleGive(rowKey)}
                  />
                  {expanded ? (
                    <View style={styles.inlineIntroCard}>
                      <Text style={styles.introDetailText}>{row.intro}</Text>
                      <View style={styles.introLine}>
                        <Text style={[styles.introLabel, styles.exampleLabel]}>例</Text>
                        <Text style={styles.introValue}>{row.exampleJa}</Text>
                      </View>
                      <Text style={styles.exampleZh}>{row.exampleZh}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>请求表达</Text>
          <Text style={styles.sectionSubtitle}>常用的请求/许可表达</Text>
          <View style={[styles.card, styles.sectionCard]}>
            <RequestHeaderRow />
            {REQUEST_ROWS.map((row) => {
              const rowKey = row.pattern;
              const expanded = selectedRequestKey === rowKey;
              return (
                <View key={rowKey} style={[styles.expandWrap, expanded ? styles.expandWrapActive : null]}>
                  <RequestRowItem
                    {...row}
                    active={expanded}
                    onPress={() => handleToggleRequest(rowKey)}
                  />
                  {expanded ? (
                    <View style={styles.inlineIntroCard}>
                      <Text style={styles.introDetailText}>{row.intro}</Text>
                      <View style={styles.introLine}>
                        <Text style={[styles.introLabel, styles.exampleLabel]}>例</Text>
                        <Text style={styles.introValue}>{row.exampleJa}</Text>
                      </View>
                      <Text style={styles.exampleZh}>{row.exampleZh}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>使用提示</Text>
            {NOTES.map((note) => (
              <Text key={note} style={styles.noteText}>
                {note}
              </Text>
            ))}
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
    backgroundColor: colors.card,
  },
  pressableRow: {
    borderRadius: radius.s,
    paddingHorizontal: spacing.xs,
  },
  activeRow: {
    backgroundColor: '#eef5ff',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: '#c7dbf9',
  },
  pressedRow: {
    opacity: 0.92,
  },
  headerRow: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.s,
    borderBottomWidth: 0,
    marginBottom: spacing.s,
    paddingHorizontal: spacing.xs,
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
  activeCell: {
    color: '#2f558f',
    fontWeight: '700',
  },
  expandWrap: {
    backgroundColor: colors.card,
  },
  expandWrapActive: {
    borderWidth: 1,
    borderColor: '#c7dbf9',
    borderRadius: radius.s,
    marginBottom: spacing.xs,
    backgroundColor: '#eef5ff',
  },
  inlineIntroCard: {
    backgroundColor: '#f3f8ff',
    borderBottomLeftRadius: radius.s,
    borderBottomRightRadius: radius.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  introGloss: {
    color: '#3f6eb7',
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  introLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  introDetailText: {
    color: '#3f4f63',
    lineHeight: 20,
    marginBottom: spacing.s,
  },
  introValue: {
    flex: 1,
    color: '#3f4f63',
    lineHeight: 20,
  },
  introLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginRight: spacing.xs,
    marginTop: 2.2,
    overflow: 'hidden',
  },
  respectfulLabel: {
    backgroundColor: '#6f8fbe',
  },
  humbleLabel: {
    backgroundColor: '#7a93b3',
  },
  exampleLabel: {
    backgroundColor: '#7f93af',
  },
  exampleZh: {
    marginLeft: 28,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  practiceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  practiceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  practiceResultRate: {
    marginTop: spacing.s,
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  practiceSummary: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  practiceModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
    gap: 4,
  },
  practiceModeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  practiceModeChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  practiceModeChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  practiceModeChipTextActive: {
    color: colors.primary,
  },
  practiceHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  practiceProgress: {
    color: colors.muted,
    fontWeight: '600',
  },
  practiceProgressTrack: {
    marginTop: spacing.s,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#e5edf8',
    overflow: 'hidden',
  },
  practiceProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3b82f6',
  },
  practicePromptCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: radius.m,
    backgroundColor: '#f8fbff',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  practiceTargetRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: radius.s,
    overflow: 'hidden',
    marginBottom: spacing.s,
  },
  practiceTargetLabel: {
    color: '#1e3a8a',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
  },
  practiceTargetValue: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  practicePrompt: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  practiceOption: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.s,
  },
  practiceOptionPressed: {
    opacity: 0.85,
  },
  practiceOptionInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  practiceOptionBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
  },
  practiceOptionBadgeCorrect: {
    backgroundColor: '#dcfce7',
  },
  practiceOptionBadgeWrong: {
    backgroundColor: '#fee2e2',
  },
  practiceOptionBadgeText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  practiceOptionCorrect: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  practiceOptionWrong: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  practiceOptionText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
  },
  practiceOptionTextStrong: {
    fontWeight: '700',
  },
  practiceOptionMark: {
    marginLeft: spacing.s,
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  practiceFeedback: {
    marginTop: spacing.s,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  practiceFeedbackCardOk: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  practiceFeedbackCardNg: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  practiceFeedbackOk: {
    color: colors.success,
  },
  practiceFeedbackNg: {
    color: colors.danger,
  },
  practiceButton: {
    marginTop: spacing.m,
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
