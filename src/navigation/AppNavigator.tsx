import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import LevelSelectScreen from '../screens/LevelSelectScreen';
import ZoneListScreen from '../screens/ZoneListScreen';
import StageListScreen from '../screens/StageListScreen';
import StageWordsScreen from '../screens/StageWordsScreen';
import ZoneWordsScreen from '../screens/ZoneWordsScreen';
import QuizScreen from '../screens/QuizScreen';
import ResultScreen from '../screens/ResultScreen';
import GrammarLevelScreen from '../screens/GrammarLevelScreen';
import GrammarListScreen from '../screens/GrammarListScreen';
import GrammarDetailScreen from '../screens/GrammarDetailScreen';
import GrammarQuizScreen from '../screens/GrammarQuizScreen';
import MistakesScreen from '../screens/MistakesScreen';
import SearchScreen from '../screens/SearchScreen';
import MyScreen from '../screens/MyScreen';
import N1ExamQuizScreen from '../screens/N1ExamQuizScreen';
import KanaChartScreen from '../screens/KanaChartScreen';
import VerbConjugationScreen from '../screens/VerbConjugationScreen';
import KeigoChartScreen from '../screens/KeigoChartScreen';
import VocabBookScreen from '../screens/VocabBookScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { GrammarStackParamList, LearnStackParamList, MyStackParamList, RootTabParamList } from './types';
import { colors } from '../theme';
import { useAppStore } from '../store/useAppStore';

const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const GrammarStack = createNativeStackNavigator<GrammarStackParamList>();
const MyStack = createNativeStackNavigator<MyStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const TAB_ICON_MAP: Record<
  keyof RootTabParamList,
  { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }
> = {
  Learn: { focused: 'book', unfocused: 'book-outline' },
  Grammar: { focused: 'reader', unfocused: 'reader-outline' },
  Search: { focused: 'search', unfocused: 'search-outline' },
  Mistakes: { focused: 'alert-circle', unfocused: 'alert-circle-outline' },
  VocabBook: { focused: 'bookmark', unfocused: 'bookmark-outline' },
  KanaChart: { focused: 'grid', unfocused: 'grid-outline' },
  VerbConjugation: { focused: 'swap-horizontal', unfocused: 'swap-horizontal-outline' },
  KeigoChart: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
  My: { focused: 'person', unfocused: 'person-outline' },
};

function LearnStackScreen() {
  const lexiconLevel = useAppStore((state) => state.settings.lexicon_level);
  const initialRouteName: keyof LearnStackParamList = lexiconLevel ? 'ZoneList' : 'LevelSelect';

  return (
    <LearnStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <LearnStack.Screen name="LevelSelect" component={LevelSelectScreen} options={{ title: '等级选择' }} />
      <LearnStack.Screen
        name="ZoneList"
        component={ZoneListScreen}
        initialParams={lexiconLevel ? { level: lexiconLevel } : undefined}
        options={{ title: '分区选择', headerBackVisible: false, headerLeft: () => null }}
      />
      <LearnStack.Screen name="StageList" component={StageListScreen} options={{ title: '关卡列表' }} />
      <LearnStack.Screen name="StageWords" component={StageWordsScreen} options={{ title: '本关词汇' }} />
      <LearnStack.Screen name="ZoneWords" component={ZoneWordsScreen} options={{ title: '本区词汇' }} />
      <LearnStack.Screen name="Quiz" component={QuizScreen} options={{ title: '闯关测验' }} />
      <LearnStack.Screen name="Result" component={ResultScreen} options={{ title: '结果' }} />
    </LearnStack.Navigator>
  );
}

function GrammarStackScreen() {
  return (
    <GrammarStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <GrammarStack.Screen name="GrammarLevel" component={GrammarLevelScreen} options={{ title: '文法等级' }} />
      <GrammarStack.Screen name="GrammarList" component={GrammarListScreen} options={{ title: '文法列表' }} />
      <GrammarStack.Screen name="GrammarDetail" component={GrammarDetailScreen} options={{ title: '文法详情' }} />
      <GrammarStack.Screen name="GrammarQuiz" component={GrammarQuizScreen} options={{ title: '文法练习' }} />
    </GrammarStack.Navigator>
  );
}

function MyStackScreen() {
  return (
    <MyStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <MyStack.Screen name="MyHome" component={MyScreen} options={{ title: '我的' }} />
      <MyStack.Screen name="N1ExamQuiz" component={N1ExamQuizScreen} options={{ title: '真题练习' }} />
      <MyStack.Screen name="Search" component={SearchScreen} options={{ title: '搜索' }} />
      <MyStack.Screen name="Mistakes" component={MistakesScreen} options={{ title: '错题本' }} />
      <MyStack.Screen name="KanaChart" component={KanaChartScreen} options={{ title: '五十音图' }} />
      <MyStack.Screen name="VerbConjugation" component={VerbConjugationScreen} options={{ title: '动词变形表' }} />
      <MyStack.Screen name="KeigoChart" component={KeigoChartScreen} options={{ title: '敬语表' }} />
      <MyStack.Screen name="VocabBook" component={VocabBookScreen} options={{ title: '生词本' }} />
      <MyStack.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
    </MyStack.Navigator>
  );
}

export default function AppNavigator() {
  const navSearch = useAppStore((state) => state.settings.nav_show_search);
  const navMistakes = useAppStore((state) => state.settings.nav_show_mistakes);
  const navVocabBook = useAppStore((state) => state.settings.nav_show_vocab_book);
  const navKana = useAppStore((state) => state.settings.nav_show_kana);
  const navVerb = useAppStore((state) => state.settings.nav_show_verb_conjugation);
  const navKeigo = useAppStore((state) => state.settings.nav_show_keigo);
  const navSettings = useAppStore((state) => state.settings.nav_show_settings);

  const extraTabs = [
    { name: 'Search' as const, component: SearchScreen, title: '搜索', enabled: navSearch },
    { name: 'Mistakes' as const, component: MistakesScreen, title: '错题', enabled: navMistakes },
    { name: 'VocabBook' as const, component: VocabBookScreen, title: '生词本', enabled: navVocabBook },
    { name: 'KanaChart' as const, component: KanaChartScreen, title: '五十音', enabled: navKana },
    { name: 'VerbConjugation' as const, component: VerbConjugationScreen, title: '动词变形', enabled: navVerb },
    { name: 'KeigoChart' as const, component: KeigoChartScreen, title: '敬语表', enabled: navKeigo },
    { name: 'Settings' as const, component: SettingsScreen, title: '设置', enabled: navSettings },
  ].filter((item) => item.enabled);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarStyle: { backgroundColor: '#fff' },
          tabBarIcon: ({ color, size, focused }) => {
            const icons = TAB_ICON_MAP[route.name];
            const iconName = focused ? icons.focused : icons.unfocused;
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Learn" component={LearnStackScreen} options={{ title: '学习' }} />
        <Tab.Screen name="Grammar" component={GrammarStackScreen} options={{ title: '文法' }} />
        {extraTabs.map((item) => (
          <Tab.Screen key={item.name} name={item.name} component={item.component} options={{ title: item.title }} />
        ))}
        <Tab.Screen name="My" component={MyStackScreen} options={{ title: '我的' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
