import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CONJUGATION_OVERVIEW_ROWS, CONJUGATION_TABLE_ROWS } from '../features/verbConjugation/data';
import { colors, radius, spacing } from '../theme';
import PrimaryButton from './PrimaryButton';

type VerbKey = 'godan' | 'ichidan' | 'suru' | 'kuru';
type PracticeMode = 'form_to_word' | 'word_to_form';

type Question = {
  id: string;
  form: string;
  base: string;
  word: string;
  answer: string;
  options: string[];
  ruleHint: string;
};

const SESSION_SIZE = 20;
const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const MODE_ITEMS: Array<{ id: PracticeMode; label: string }> = [
  { id: 'form_to_word', label: '选择单词变形' },
  { id: 'word_to_form', label: '选择单词形态' },
];
const MODE_LABEL: Record<PracticeMode, string> = {
  form_to_word: '选择单词变形',
  word_to_form: '选择单词形态',
};

const VERB_META: Array<{ key: VerbKey; base: string }> = [
  { key: 'godan', base: '書く' },
  { key: 'ichidan', base: '食べる' },
  { key: 'suru', base: 'する' },
  { key: 'kuru', base: '来る（くる）' },
];

function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildRuleMap() {
  const map = new Map<string, { godan: string; ichidan: string }>();
  for (const row of CONJUGATION_OVERVIEW_ROWS) {
    map.set(row.form, { godan: row.godanRule, ichidan: row.ichidanRule });
  }
  return map;
}

function buildSession(mode: PracticeMode): Question[] {
  const allForms = CONJUGATION_TABLE_ROWS.map((row) => row.form);
  const ruleMap = buildRuleMap();
  const allQuestions: Question[] = [];
  const valueCountMap = new Map<string, number>();

  if (mode === 'word_to_form') {
    for (const row of CONJUGATION_TABLE_ROWS) {
      for (const meta of VERB_META) {
        const value = row[meta.key];
        const counterKey = `${meta.key}::${value}`;
        valueCountMap.set(counterKey, (valueCountMap.get(counterKey) ?? 0) + 1);
      }
    }
  }

  for (const row of CONJUGATION_TABLE_ROWS) {
    for (const meta of VERB_META) {
      const word = row[meta.key];
      const duplicateCounterKey = `${meta.key}::${word}`;
      if (mode === 'word_to_form' && (valueCountMap.get(duplicateCounterKey) ?? 0) > 1) continue;

      const rule = ruleMap.get(row.form);
      const ruleHint =
        meta.key === 'godan'
          ? rule?.godan ?? '五段规则见上方规则表。'
          : meta.key === 'ichidan'
            ? rule?.ichidan ?? '一段规则见上方规则表。'
            : '不规则动词，固定变形。';
      let answer = '';
      let options: string[] = [];

      if (mode === 'form_to_word') {
        answer = word;
        const sameBaseValues = CONJUGATION_TABLE_ROWS.map((item) => item[meta.key]).filter((item) => item !== answer);
        const candidates = shuffle(sameBaseValues);
        options = [answer];

        for (const candidate of candidates) {
          if (options.length >= 4) break;
          if (!options.includes(candidate)) options.push(candidate);
        }
      } else {
        answer = row.form;
        const candidates = shuffle(allForms.filter((item) => item !== answer));
        options = [answer];
        for (const candidate of candidates) {
          if (options.length >= 4) break;
          if (!options.includes(candidate)) options.push(candidate);
        }
      }

      allQuestions.push({
        id: `${mode}-${row.form}-${meta.key}`,
        form: row.form,
        base: meta.base,
        word,
        answer,
        options: shuffle(options),
        ruleHint,
      });
    }
  }

  return shuffle(allQuestions).slice(0, SESSION_SIZE);
}

export default function VerbConjugationPracticePanel() {
  const [mode, setMode] = useState<PracticeMode>('form_to_word');
  const [session, setSession] = useState<Question[]>(() => buildSession('form_to_word'));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const finished = index >= session.length;
  const current = finished ? null : session[index];
  const answered = selected !== null;
  const currentCorrect = useMemo(() => (current ? selected === current.answer : false), [current, selected]);
  const progressRatio = session.length ? (finished ? 1 : (index + 1) / session.length) : 0;

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

  const handleReset = (targetMode: PracticeMode = mode) => {
    setSession(buildSession(targetMode));
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
  };

  const handleModeChange = (nextMode: PracticeMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    handleReset(nextMode);
  };

  if (finished) {
    const percent = session.length ? Math.round((correctCount / session.length) * 100) : 0;
    return (
      <View style={styles.card}>
        <View style={styles.modeRow}>
          {MODE_ITEMS.map((item) => {
            const active = item.id === mode;
            return (
              <Pressable key={item.id} onPress={() => handleModeChange(item.id)} style={[styles.modeChip, active ? styles.modeChipActive : null]}>
                <Text style={[styles.modeChipText, active ? styles.modeChipTextActive : null]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.title}>练习完成</Text>
        <Text style={styles.resultRate}>{percent}%</Text>
        <Text style={styles.summary}>正确 {correctCount} / {session.length}</Text>
        <Text style={styles.summary}>当前题型：{MODE_LABEL[mode]}</Text>
        <PrimaryButton title="再来一组" onPress={handleReset} style={styles.summaryButton} />
      </View>
    );
  }

  if (!current) return null;

  return (
    <View style={styles.card}>
      <View style={styles.modeRow}>
        {MODE_ITEMS.map((item) => {
          const active = item.id === mode;
          return (
            <Pressable key={item.id} onPress={() => handleModeChange(item.id)} style={[styles.modeChip, active ? styles.modeChipActive : null]}>
              <Text style={[styles.modeChipText, active ? styles.modeChipTextActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.headRow}>
        <Text style={styles.progress}>第 {index + 1} / {session.length} 题</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, Math.round(progressRatio * 100)))}%` }]} />
      </View>

      <View style={styles.promptCard}>
        <View style={styles.promptRow}>
          <Text style={styles.promptLabel}>{mode === 'form_to_word' ? '原型' : '单词'}</Text>
          <Text style={styles.promptValue}>{mode === 'form_to_word' ? current.base : current.word}</Text>
        </View>
        <Text style={styles.question}>{mode === 'form_to_word' ? `「${current.form}」是？` : '这是哪种形态？'}</Text>
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
              styles.option,
              answered && isCorrect ? styles.optionCorrect : null,
              answered && isSelected && !isCorrect ? styles.optionWrong : null,
              pressed && !answered ? styles.optionPressed : null,
            ]}
          >
            <View style={styles.optionInner}>
              <View
                style={[
                  styles.optionBadge,
                  answered && isCorrect ? styles.optionBadgeCorrect : null,
                  answered && isSelected && !isCorrect ? styles.optionBadgeWrong : null,
                ]}
              >
                <Text style={styles.optionBadgeText}>{OPTION_LABELS[optionIndex] ?? '?'}</Text>
              </View>
              <Text
                style={[
                  styles.optionText,
                  answered && isCorrect ? styles.optionTextStrong : null,
                  answered && isSelected && !isCorrect ? styles.optionTextStrong : null,
                ]}
              >
                {option}
              </Text>
              {answered && isCorrect ? <Text style={styles.optionMark}>正确</Text> : null}
            </View>
          </Pressable>
        );
      })}

      {answered ? (
        <>
          {mode === 'word_to_form' ? <Text style={styles.revealBase}>原型：{current.base}</Text> : null}
          <Text
            style={[
              styles.feedback,
              currentCorrect ? styles.feedbackOk : styles.feedbackNg,
              currentCorrect ? styles.feedbackCardOk : styles.feedbackCardNg,
            ]}
          >
            {currentCorrect ? '回答正确' : `回答错误，正确答案：${current.answer}`}
          </Text>
          <Text style={styles.ruleHint}>规则：{current.ruleHint}</Text>
          <PrimaryButton title={index === session.length - 1 ? '查看结果' : '下一题'} onPress={handleNext} style={styles.nextButton} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  summary: {
    marginTop: spacing.s,
    color: colors.muted,
  },
  resultRate: {
    marginTop: spacing.s,
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  summaryButton: {
    marginTop: spacing.m,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.s,
    gap: 4,
  },
  modeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  modeChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: colors.primary,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  progress: {
    color: colors.muted,
    fontWeight: '600',
  },
  progressTrack: {
    marginTop: spacing.s,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#e5edf8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3b82f6',
  },
  promptCard: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: radius.m,
    backgroundColor: '#f8fbff',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e3a8a',
    backgroundColor: '#dbeafe',
    borderRadius: radius.s,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    marginRight: spacing.xs,
  },
  promptValue: {
    color: '#3f6394',
    fontWeight: '700',
    fontSize: 17,
  },
  question: {
    marginTop: spacing.s,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  option: {
    marginTop: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: '#fff',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.s,
  },
  optionPressed: {
    opacity: 0.86,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.s,
  },
  optionBadgeCorrect: {
    backgroundColor: '#dcfce7',
  },
  optionBadgeWrong: {
    backgroundColor: '#fee2e2',
  },
  optionBadgeText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  optionCorrect: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  optionWrong: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  optionText: {
    color: colors.text,
    flex: 1,
  },
  optionTextStrong: {
    fontWeight: '700',
  },
  optionMark: {
    marginLeft: spacing.s,
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  feedback: {
    marginTop: spacing.s,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: radius.m,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  feedbackCardOk: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  feedbackCardNg: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  feedbackOk: {
    color: colors.success,
  },
  feedbackNg: {
    color: colors.danger,
  },
  revealBase: {
    marginTop: spacing.s,
    color: '#5b6675',
    fontSize: 12,
    fontWeight: '600',
  },
  ruleHint: {
    marginTop: spacing.xs,
    color: '#5b6675',
    lineHeight: 18,
  },
  nextButton: {
    marginTop: spacing.m,
  },
});
