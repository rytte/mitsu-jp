import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeaderBackButton } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BANK_LEVELS, getQuestionBank, SESSION_SIZE } from '../features/exam/examBank';
import { ExamQuizStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<ExamQuizStackParamList, 'ExamQuizBank'>;

export default function ExamQuizBankScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const parent = navigation.getParent();
  const parentType = (parent?.getState() as { type?: string } | undefined)?.type;
  const openedFromTab = parentType === 'tab';

  useLayoutEffect(() => {
    const parentCanGoBack = parent?.canGoBack?.() ?? false;
    const canGoBackSelf = navigation.canGoBack();
    navigation.setOptions({
      headerShown: !openedFromTab,
      headerLeft:
        !openedFromTab && !canGoBackSelf && parentType === 'stack' && parentCanGoBack
          ? (props) => <HeaderBackButton {...props} onPress={() => parent?.goBack()} />
          : undefined,
    });
  }, [navigation, openedFromTab, parent, parentType]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, openedFromTab ? { paddingTop: insets.top + spacing.xs } : null]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>真题练习</Text>
        <Text style={styles.tip}>先选择题库，再开始练习</Text>
      </View>
      {BANK_LEVELS.map((level) => {
        const count = getQuestionBank(level).length;
        const disabled = count === 0;
        const drawCount = Math.min(SESSION_SIZE, count);
        return (
          <Pressable
            key={level}
            onPress={() => (disabled ? undefined : navigation.navigate('ExamQuizPractice', { level }))}
            disabled={disabled}
            style={({ pressed }) => [
              styles.bankCard,
              pressed && !disabled ? styles.bankCardPressed : null,
              disabled ? styles.bankCardDisabled : null,
            ]}
          >
            <View style={styles.bankMain}>
              <View style={styles.bankTopRow}>
                <View style={styles.bankBadge}>
                  <Text style={styles.bankBadgeText}>{level}</Text>
                </View>
                <Text style={styles.bankTitle}>真题题库</Text>
              </View>
              <View style={styles.bankMetaRow}>
                <View style={styles.bankMetaChip}>
                  <Text style={styles.bankMetaText}>共 {count} 题</Text>
                </View>
                <View style={styles.bankMetaChip}>
                  <Text style={styles.bankMetaText}>每组 {drawCount} 题</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.m,
    paddingBottom: spacing.l,
  },
  headerBlock: {
    marginBottom: spacing.m,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  tip: {
    color: colors.muted,
    marginTop: spacing.xs,
    marginBottom: spacing.m,
  },
  bankCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftColor: colors.primary,
    borderLeftWidth: 5,
    marginBottom: spacing.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bankMain: {
    flex: 1,
    marginRight: spacing.s,
  },
  bankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  bankBadge: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
  },
  bankBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  bankCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  bankCardDisabled: {
    opacity: 0.6,
  },
  bankTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  bankMetaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  bankMetaChip: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
  },
  bankMetaText: {
    color: colors.muted,
    fontSize: 12,
  },
});
