import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type Props = {
  message: string;
};

export default function ErrorScreen({ message }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>初始化失败</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.tip}>请查看终端或浏览器控制台日志。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.l,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.s,
  },
  message: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  tip: {
    color: colors.muted,
  },
});

