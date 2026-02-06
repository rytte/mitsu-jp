import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { GRAMMARS } from '../data/grammars';
import { GrammarStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<GrammarStackParamList, 'GrammarLevel'>;

export default function GrammarLevelScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>文法学习</Text>
        <Text style={styles.headerText}>选择等级开始浏览文法</Text>
      </View>

      <FlatList
        data={GRAMMARS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('GrammarList', { level: item.id })}
            style={({ pressed }) => [styles.levelCard, pressed ? styles.levelCardPressed : null]}
          >
            <View style={styles.levelLeft}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeLabel}>JLPT</Text>
                <Text style={styles.levelBadgeValue}>{item.label}</Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelTitle}>文法库</Text>
                <Text style={styles.levelSubtitle}>共 {item.items.length} 条</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.m,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.s,
  },
  headerText: {
    color: colors.muted,
  },
  list: {
    paddingBottom: spacing.l,
  },
  levelCard: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelCardPressed: {
    opacity: 0.7,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.s,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.m,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  levelBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primaryDark,
  },
  levelBadgeValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  levelSubtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
    fontSize: 12,
  },
});
