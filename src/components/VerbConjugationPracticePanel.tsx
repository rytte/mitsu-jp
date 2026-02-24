import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CONJUGATION_OVERVIEW_ROWS, CONJUGATION_TABLE_ROWS } from '../features/verbConjugation/data';
import { colors, radius, spacing } from '../theme';
import PrimaryButton from './PrimaryButton';

type VerbKey = 'godan' | 'ichidan' | 'suru' | 'kuru';

type Question = {
  id: string;
  form: string;
  base: string;
  answer: string;
  options: string[];
  ruleHint: string;
};

const SESSION_SIZE = 20;

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

function buildSession(): Question[] {
  const allValues = CONJUGATION_TABLE_ROWS.flatMap((row) => [row.godan, row.ichidan, row.suru, row.kuru]);
  const ruleMap = buildRuleMap();
  const allQuestions: Question[] = [];

  for (const row of CONJUGATION_TABLE_ROWS) {
    for (const meta of VERB_META) {
      const answer = row[meta.key];
      const rowValues = [row.godan, row.ichidan, row.suru, row.kuru].filter((item) => item !== answer);
      const candidates = shuffle([...rowValues, ...allValues.filter((item) => item !== answer)]);
      const options: string[] = [answer];

      for (const candidate of candidates) {
        if (options.length >= 4) break;
        if (!options.includes(candidate)) options.push(candidate);
      }

      const rule = ruleMap.get(row.form);
      const ruleHint =
        meta.key === 'godan'
          ? rule?.godan ?? '五段规则见上方规则表。'
          : meta.key === 'ichidan'
            ? rule?.ichidan ?? '一段规则见上方规则表。'
            : '不规则动词，固定变形。';

      allQuestions.push({
        id: `${row.form}-${meta.key}`,
        form: row.form,
        base: meta.base,
        answer,
        options: shuffle(options),
        ruleHint,
      });
    }
  }

  return shuffle(allQuestions).slice(0, SESSION_SIZE);
}

export default function VerbConjugationPracticePanel() {
  const [session, setSession] = useState<Question[]>(() => buildSession());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const finished = index >= session.length;
  const current = finished ? null : session[index];
  const answered = selected !== null;
  const currentCorrect = useMemo(() => (current ? selected === current.answer : false), [current, selected]);

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

  const handleReset = () => {
    setSession(buildSession());
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
  };

  if (finished) {
    const percent = session.length ? Math.round((correctCount / session.length) * 100) : 0;
    return (
      <View style={styles.card}>
        <Text style={styles.title}>练习完成</Text>
        <Text style={styles.summary}>正确 {correctCount} / {session.length}</Text>
        <Text style={styles.summary}>正确率 {percent}%</Text>
        <PrimaryButton title="再来一组" onPress={handleReset} style={styles.summaryButton} />
      </View>
    );
  }

  if (!current) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.progress}>第 {index + 1} / {session.length} 题</Text>
      </View>

      <Text style={styles.question}>「{current.base}」的「{current.form}」是？</Text>

      {current.options.map((option) => {
        const isSelected = option === selected;
        const isCorrect = option === current.answer;
        return (
          <Pressable
            key={`${current.id}-${option}`}
            onPress={() => handleSelect(option)}
            style={[
              styles.option,
              answered && isCorrect ? styles.optionCorrect : null,
              answered && isSelected && !isCorrect ? styles.optionWrong : null,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                answered && isCorrect ? styles.optionTextStrong : null,
                answered && isSelected && !isCorrect ? styles.optionTextStrong : null,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}

      {answered ? (
        <>
          <Text style={[styles.feedback, currentCorrect ? styles.feedbackOk : styles.feedbackNg]}>
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
  summaryButton: {
    marginTop: spacing.m,
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
  question: {
    marginTop: spacing.s,
    color: colors.text,
    fontSize: 17,
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
  },
  optionTextStrong: {
    fontWeight: '700',
  },
  feedback: {
    marginTop: spacing.s,
    fontWeight: '700',
  },
  feedbackOk: {
    color: colors.success,
  },
  feedbackNg: {
    color: colors.danger,
  },
  ruleHint: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  nextButton: {
    marginTop: spacing.m,
  },
});
