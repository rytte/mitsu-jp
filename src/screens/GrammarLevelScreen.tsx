import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
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
          <View style={styles.levelCard}>
            <View>
              <Text style={styles.levelTitle}>文法 {item.label}</Text>
              <Text style={styles.levelSubtitle}>共 {item.items.length} 条</Text>
            </View>
            <PrimaryButton title="进入" onPress={() => navigation.navigate('GrammarList', { level: item.id })} />
          </View>
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
    padding: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  levelSubtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
