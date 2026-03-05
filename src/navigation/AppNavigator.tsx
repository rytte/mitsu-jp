import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import WordScreen from '../screens/WordScreen';
import ZoneListScreen from '../screens/ZoneListScreen';
import StageListScreen from '../screens/StageListScreen';
import StageWordsScreen from '../screens/StageWordsScreen';
import ZoneWordsScreen from '../screens/ZoneWordsScreen';
import QuizScreen from '../screens/QuizScreen';
import ResultScreen from '../screens/ResultScreen';
import GrammarScreen from '../screens/GrammarScreen';
import GrammarListScreen from '../screens/GrammarListScreen';
import GrammarDetailScreen from '../screens/GrammarDetailScreen';
import GrammarQuizScreen from '../screens/GrammarQuizScreen';
import MistakesScreen from '../screens/MistakesScreen';
import SearchScreen from '../screens/SearchScreen';
import MyScreen from '../screens/MyScreen';
import ExamQuizScreen from '../screens/ExamQuizScreen';
import AiExamQuizPracticeScreen from '../screens/AiExamQuizPracticeScreen';
import AiHubScreen from '../screens/AiHubScreen';
import AiListeningPracticeScreen from '../screens/AiListeningPracticeScreen';
import AiSettingsScreen from '../screens/AiSettingsScreen';
import AiConversationScreen from '../screens/AiConversationScreen';
import AiTranslationPracticeScreen from '../screens/AiTranslationPracticeScreen';
import AiWritingPracticeScreen from '../screens/AiWritingPracticeScreen';
import AiSentenceAssemblePracticeScreen from '../screens/AiSentenceAssemblePracticeScreen';
import KanaChartScreen from '../screens/KanaChartScreen';
import NumeralGuideScreen from '../screens/NumeralGuideScreen';
import ParticleGuideScreen from '../screens/ParticleGuideScreen';
import AdjectiveGuideScreen from '../screens/AdjectiveGuideScreen';
import VerbClassificationScreen from '../screens/VerbClassificationScreen';
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
const AiHubStack = createNativeStackNavigator<MyStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const TAB_ICON_MAP: Record<
  keyof RootTabParamList,
  { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }
> = {
  Word: { focused: 'book', unfocused: 'book-outline' },
  Grammar: { focused: 'reader', unfocused: 'reader-outline' },
  Search: { focused: 'search', unfocused: 'search-outline' },
  Mistakes: { focused: 'alert-circle', unfocused: 'alert-circle-outline' },
  VocabBook: { focused: 'bookmark', unfocused: 'bookmark-outline' },
  KanaChart: { focused: 'grid', unfocused: 'grid-outline' },
  VerbConjugation: { focused: 'swap-horizontal', unfocused: 'swap-horizontal-outline' },
  KeigoChart: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  AiHub: { focused: 'sparkles', unfocused: 'sparkles-outline' },
  ExamQuiz: { focused: 'document-text', unfocused: 'document-text-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
  My: { focused: 'person', unfocused: 'person-outline' },
};

function LearnStackScreen() {
  const lexiconLevel = useAppStore((state) => state.settings.lexicon_level);
  const initialRouteName: keyof LearnStackParamList = lexiconLevel ? 'ZoneList' : 'Word';

  return (
    <LearnStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <LearnStack.Screen name="Word" component={WordScreen} options={{ title: '词汇', headerShown: false }} />
      <LearnStack.Screen
        name="ZoneList"
        component={ZoneListScreen}
        initialParams={lexiconLevel ? { level: lexiconLevel } : undefined}
        options={{ title: '分区列表', headerShown: false, headerBackVisible: false, headerLeft: () => null }}
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
      <GrammarStack.Screen name="Grammar" component={GrammarScreen} options={{ title: '文法', headerShown: false }} />
      <GrammarStack.Screen name="GrammarList" component={GrammarListScreen} options={{ title: '文法列表' }} />
      <GrammarStack.Screen name="GrammarDetail" component={GrammarDetailScreen} options={{ title: '文法详情' }} />
      <GrammarStack.Screen name="GrammarQuiz" component={GrammarQuizScreen} options={{ title: '文法练习' }} />
      <GrammarStack.Screen name="KanaChart" component={KanaChartScreen} options={{ title: '五十音图' }} />
      <GrammarStack.Screen name="NumeralGuide" component={NumeralGuideScreen} options={{ title: '数词速查表' }} />
      <GrammarStack.Screen name="AdjectiveGuide" component={AdjectiveGuideScreen} options={{ title: '形容词表' }} />
      <GrammarStack.Screen name="VerbClassification" component={VerbClassificationScreen} options={{ title: '动词分类表' }} />
      <GrammarStack.Screen name="VerbConjugation" component={VerbConjugationScreen} options={{ title: '动词变形表' }} />
      <GrammarStack.Screen name="ParticleGuide" component={ParticleGuideScreen} options={{ title: '助词表' }} />
      <GrammarStack.Screen name="KeigoChart" component={KeigoChartScreen} options={{ title: '敬语表' }} />
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
      <MyStack.Screen name="AiHub" component={AiHubScreen} options={{ title: 'AI 学习中心' }} />
      <MyStack.Screen name="AiListeningPractice" component={AiListeningPracticeScreen} options={{ title: 'AI 听力训练' }} />
      <MyStack.Screen name="AiExamQuizPractice" component={AiExamQuizPracticeScreen} options={{ title: 'AI 练习' }} />
      <MyStack.Screen name="AiSettings" component={AiSettingsScreen} options={{ title: 'AI 配置' }} />
      <MyStack.Screen name="AiConversation" component={AiConversationScreen} options={{ title: 'AI 场景对话' }} />
      <MyStack.Screen name="AiTranslationPractice" component={AiTranslationPracticeScreen} options={{ title: 'AI 翻译训练' }} />
      <MyStack.Screen name="AiWritingPractice" component={AiWritingPracticeScreen} options={{ title: 'AI 写作达意' }} />
      <MyStack.Screen
        name="AiSentenceAssemblePractice"
        component={AiSentenceAssemblePracticeScreen}
        options={{ title: 'AI 连词成句' }}
      />
      <MyStack.Screen name="ExamQuiz" component={ExamQuizScreen} options={{ title: '真题练习', headerShown: false }} />
      <MyStack.Screen name="Search" component={SearchScreen} options={{ title: '搜索' }} />
      <MyStack.Screen name="Mistakes" component={MistakesScreen} options={{ title: '错题本' }} />
      <MyStack.Screen name="KanaChart" component={KanaChartScreen} options={{ title: '五十音图' }} />
      <MyStack.Screen name="NumeralGuide" component={NumeralGuideScreen} options={{ title: '数词速查表' }} />
      <MyStack.Screen name="ParticleGuide" component={ParticleGuideScreen} options={{ title: '助词表' }} />
      <MyStack.Screen name="AdjectiveGuide" component={AdjectiveGuideScreen} options={{ title: '形容词表' }} />
      <MyStack.Screen name="VerbClassification" component={VerbClassificationScreen} options={{ title: '动词分类表' }} />
      <MyStack.Screen name="VerbConjugation" component={VerbConjugationScreen} options={{ title: '动词变形表' }} />
      <MyStack.Screen name="KeigoChart" component={KeigoChartScreen} options={{ title: '敬语表' }} />
      <MyStack.Screen name="VocabBook" component={VocabBookScreen} options={{ title: '生词本' }} />
      <MyStack.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
    </MyStack.Navigator>
  );
}

function AiHubStackScreen() {
  return (
    <AiHubStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <AiHubStack.Screen name="AiHub" component={AiHubScreen} options={{ title: 'AI 学习中心', headerShown: false }} />
      <AiHubStack.Screen name="AiListeningPractice" component={AiListeningPracticeScreen} options={{ title: 'AI 听力训练' }} />
      <AiHubStack.Screen name="AiSettings" component={AiSettingsScreen} options={{ title: 'AI 配置' }} />
      <AiHubStack.Screen name="AiConversation" component={AiConversationScreen} options={{ title: 'AI 场景对话' }} />
      <AiHubStack.Screen name="AiExamQuizPractice" component={AiExamQuizPracticeScreen} options={{ title: 'AI 练习' }} />
      <AiHubStack.Screen name="AiTranslationPractice" component={AiTranslationPracticeScreen} options={{ title: 'AI 翻译训练' }} />
      <AiHubStack.Screen name="AiWritingPractice" component={AiWritingPracticeScreen} options={{ title: 'AI 写作达意' }} />
      <AiHubStack.Screen
        name="AiSentenceAssemblePractice"
        component={AiSentenceAssemblePracticeScreen}
        options={{ title: 'AI 连词成句' }}
      />
    </AiHubStack.Navigator>
  );
}

export default function AppNavigator() {
  const navSearch = useAppStore((state) => state.settings.nav_show_search);
  const navMistakes = useAppStore((state) => state.settings.nav_show_mistakes);
  const navVocabBook = useAppStore((state) => state.settings.nav_show_vocab_book);
  const navKana = useAppStore((state) => state.settings.nav_show_kana);
  const navVerb = useAppStore((state) => state.settings.nav_show_verb_conjugation);
  const navKeigo = useAppStore((state) => state.settings.nav_show_keigo);
  const navAiHub = useAppStore((state) => state.settings.nav_show_ai_hub);
  const navExamQuiz = useAppStore((state) => state.settings.nav_show_exam_quiz);
  const navSettings = useAppStore((state) => state.settings.nav_show_settings);

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
        <Tab.Screen name="Word" component={LearnStackScreen} options={{ title: '词汇' }} />
        <Tab.Screen name="Grammar" component={GrammarStackScreen} options={{ title: '文法' }} />
        {navSearch ? <Tab.Screen name="Search" component={SearchScreen} options={{ title: '搜索' }} /> : null}
        {navMistakes ? <Tab.Screen name="Mistakes" component={MistakesScreen} options={{ title: '错题' }} /> : null}
        {navVocabBook ? <Tab.Screen name="VocabBook" component={VocabBookScreen} options={{ title: '生词本' }} /> : null}
        {navKana ? <Tab.Screen name="KanaChart" component={KanaChartScreen} options={{ title: '五十音' }} /> : null}
        {navVerb ? <Tab.Screen name="VerbConjugation" component={VerbConjugationScreen} options={{ title: '动词变形' }} /> : null}
        {navKeigo ? <Tab.Screen name="KeigoChart" component={KeigoChartScreen} options={{ title: '敬语表' }} /> : null}
        {navExamQuiz ? (
          <Tab.Screen
            name="ExamQuiz"
            component={ExamQuizScreen}
            options={{
              title: '真题练习',
            }}
          />
        ) : null}
        {navAiHub ? (
          <Tab.Screen
            name="AiHub"
            component={AiHubStackScreen}
            options={{ title: 'AI 学习中心' }}
          />
        ) : null}
        {navSettings ? <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} /> : null}
        <Tab.Screen name="My" component={MyStackScreen} options={{ title: '我的' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
