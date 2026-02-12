import { useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme';

type Options = {
  base?: number;
  mode?: 'auto' | 'always-safe' | 'never-safe';
};

export function useScreenTopPadding(options: Options = {}) {
  const { base = spacing.m, mode = 'auto' } = options;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  if (Platform.OS === 'web') {
    return base;
  }

  const currentType = navigation.getState()?.type;
  const currentIndex = navigation.getState()?.index ?? -1;
  const immediateParent = navigation.getParent();
  const parentType = immediateParent?.getState()?.type;

  const shouldAddSafeTop =
    mode === 'always-safe'
      ? true
      : mode === 'never-safe'
      ? false
      : currentType === 'tab' || (currentType === 'stack' && parentType === 'tab' && currentIndex === 0);

  return (shouldAddSafeTop ? insets.top : 0) + base;
}
