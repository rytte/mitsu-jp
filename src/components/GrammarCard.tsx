import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { GrammarPoint } from '../types';

type FontSizes = {
  pattern: number;
  meaning: number;
  detail: number;
};

type Props = {
  grammar: GrammarPoint;
  compact?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  fontSizes: FontSizes;
  shadow?: boolean;
  footer?: ReactNode;
};

function renderBoldMarkup(text: string, boldStyle: TextStyle) {
  if (!text || !/<\/?b>/i.test(text)) return text;
  const parts = text.split(/(<\/?b>)/gi);
  let bold = false;
  let key = 0;
  const nodes: ReactNode[] = [];
  for (const part of parts) {
    if (!part) continue;
    const lower = part.toLowerCase();
    if (lower === '<b>') {
      bold = true;
      continue;
    }
    if (lower === '</b>') {
      bold = false;
      continue;
    }
    nodes.push(
      <Text key={`b-${key}`} style={bold ? boldStyle : undefined}>
        {part}
      </Text>
    );
    key += 1;
  }
  return nodes.length ? nodes : text;
}

export default function GrammarCard({
  grammar,
  compact = false,
  expanded = false,
  disabled = false,
  onPress,
  fontSizes,
  shadow = false,
  footer,
}: Props) {
  const showDetails = !compact || expanded;
  const cardStyles = [styles.card, shadow ? styles.cardShadow : null];

  const formationText = (grammar.formation ?? []).map((item) => item.trim()).filter(Boolean).join(' / ');
  const meaning = (grammar.meaning_cn ?? '').trim() || (grammar.usage?.[0] ?? '').trim();
  const usageLines = (grammar.usage ?? []).map((item) => item.trim()).filter((item) => item && item !== meaning);
  const noteLines = (grammar.notes ?? []).map((item) => item.trim()).filter(Boolean);
  const examTags = (grammar.sentenceTags ?? []).map((item) => item.trim()).filter(Boolean);

  const example = grammar.examples?.[0];
  const exampleJa = (example?.ja ?? '').trim();
  const exampleZh = (example?.zh ?? '').trim();
  const showExample = Boolean(exampleJa || exampleZh);

  const metaItems: string[] = [];
  if (grammar.level) metaItems.push(grammar.level);
  if (grammar.subOrder) metaItems.push(`序号 ${grammar.subOrder}`);

  const content = (
    <>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={[styles.pattern, { fontSize: fontSizes.pattern }]}>{grammar.pattern}</Text>
          {showDetails && formationText ? (
            <Text style={[styles.formation, { fontSize: fontSizes.detail }]}>{formationText}</Text>
          ) : null}
        </View>
        {showDetails && metaItems.length > 0 ? (
          <View style={styles.metaRow}>
            {metaItems.map((item, index) => (
              <View key={`${item}-${index}`} style={[styles.metaChip, index > 0 ? styles.metaChipGap : null]}>
                <Text style={styles.metaValue}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {showDetails && meaning ? (
        <Text style={[styles.meaning, { fontSize: fontSizes.meaning }]}>{meaning}</Text>
      ) : null}

      {showDetails && usageLines.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>用法</Text>
          {usageLines.map((line, index) => (
            <Text key={`usage-${index}`} style={[styles.blockText, { fontSize: fontSizes.detail }]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {showDetails && noteLines.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>备注</Text>
          {noteLines.map((line, index) => (
            <Text key={`note-${index}`} style={[styles.blockText, { fontSize: fontSizes.detail }]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {showDetails && examTags.length > 0 ? (
        <View style={styles.tagRow}>
          {examTags.map((tag, index) => (
            <View key={`${tag}-${index}`} style={[styles.tagChip, index > 0 ? styles.tagChipGap : null]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {showDetails && showExample ? (
        <View style={styles.example}>
          <View style={styles.exampleHeader}>
            <Text style={styles.exampleTag}>例句</Text>
          </View>
          {exampleJa ? (
            <Text style={[styles.exampleJa, { fontSize: fontSizes.detail, lineHeight: Math.round(fontSizes.detail * 1.5) }]}>
              {renderBoldMarkup(exampleJa, styles.exampleBold)}
            </Text>
          ) : null}
          {exampleZh ? (
            <Text style={[styles.exampleZh, { fontSize: fontSizes.detail, lineHeight: Math.round(fontSizes.detail * 1.5) }]}>
              {exampleZh}
            </Text>
          ) : null}
        </View>
      ) : null}

      {footer}
    </>
  );

  if (!onPress) {
    return <View style={cardStyles}>{content}</View>;
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [...cardStyles, pressed && !disabled ? styles.cardPressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.m,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headText: {
    flex: 1,
    paddingRight: spacing.s,
  },
  pattern: {
    fontWeight: '700',
    color: colors.text,
  },
  formation: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '45%',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaChipGap: {
    marginLeft: spacing.xs,
  },
  metaValue: {
    letterSpacing: 0.2,
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  meaning: {
    marginTop: spacing.s,
    color: colors.text,
  },
  block: {
    marginTop: spacing.s,
  },
  blockLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  blockText: {
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tagRow: {
    marginTop: spacing.s,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  tagChipGap: {
    marginLeft: spacing.xs,
    marginTop: spacing.xs,
  },
  tagText: {
    fontSize: 10,
    color: '#9a3412',
    fontWeight: '600',
  },
  example: {
    marginTop: spacing.s,
    padding: spacing.s,
    borderRadius: radius.m,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: '#c7d2fe',
  },
  exampleHeader: {
    marginBottom: spacing.s,
  },
  exampleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.s,
    backgroundColor: '#eef2ff',
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '600',
  },
  exampleJa: {
    color: colors.text,
  },
  exampleBold: {
    fontWeight: '700',
  },
  exampleZh: {
    marginTop: spacing.s,
    color: colors.muted,
  },
});
