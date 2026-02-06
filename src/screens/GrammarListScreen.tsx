import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import GrammarCard from '../components/GrammarCard';
import PrimaryButton from '../components/PrimaryButton';
import { getGrammarByLevel } from '../data/grammars';
import { updateSettings } from '../db/queries';
import { GrammarStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing } from '../theme';
import { Settings } from '../types';
import { bumpFontScale, getGrammarFontSizes } from '../utils/fontScale';

type Props = NativeStackScreenProps<GrammarStackParamList, 'GrammarList'>;

export default function GrammarListScreen({ route, navigation }: Props) {
  const { level } = route.params;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const compactMode = settings.compact_mode;
  const compactSingleExpand = settings.compact_single_expand;
  const fontScale = settings.font_scale;

  const items = useMemo(() => getGrammarByLevel(level), [level]);

  const fontSizes = useMemo(() => {
    const effectiveScale = compactMode ? fontScale : bumpFontScale(fontScale);
    return getGrammarFontSizes(effectiveScale);
  }, [compactMode, fontScale]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (compactMode && compactSingleExpand) {
          return new Set([id]);
        }
        next.add(id);
      }
      return next;
    });
  };

  const handlePress = (id: string) => {
    if (compactMode) {
      toggleExpanded(id);
      return;
    }
    navigation.navigate('GrammarDetail', { level, id });
  };

  const persistSettings = async (next: Settings) => {
    setSettings(next);
    await updateSettings(next);
  };

  const toggleCompactMode = async (value: boolean) => {
    await persistSettings({ ...settings, compact_mode: value });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${level} 文法`,
      headerRight: () => (
        <View style={styles.headerToggle}>
          <Text style={styles.headerToggleText}>紧凑</Text>
          <Switch
            value={compactMode}
            onValueChange={toggleCompactMode}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      ),
    });
  }, [compactMode, level, navigation, toggleCompactMode]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>{level} 文法列表</Text>
              <Text style={styles.subtitle}>共 {items.length} 条</Text>
              {compactMode && <Text style={styles.hint}>点击条目展开/收起</Text>}
            </View>
            <PrimaryButton title="开始练习" onPress={() => navigation.navigate('GrammarQuiz', { level })} />
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedIds.has(item.id);
          return (
            <GrammarCard
              grammar={item}
              compact={compactMode}
              expanded={isExpanded}
              onPress={() => handlePress(item.id)}
              fontSizes={fontSizes}
            />
          );
        }}
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
  header: {
    marginBottom: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: spacing.s,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
  },
  hint: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
  },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerToggleText: {
    color: colors.muted,
    marginRight: spacing.xs,
    fontSize: 12,
  },
  list: {
    paddingBottom: spacing.l,
  },
});
