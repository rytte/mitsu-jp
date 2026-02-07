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
import KanaChartScreen from '../screens/KanaChartScreen';
import VerbConjugationScreen from '../screens/VerbConjugationScreen';
import KeigoChartScreen from '../screens/KeigoChartScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { GrammarStackParamList, LearnStackParamList, MyStackParamList, RootTabParamList } from './types';
import { colors } from '../theme';
import { useAppStore } from '../store/useAppStore';

const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const GrammarStack = createNativeStackNavigator<GrammarStackParamList>();
const MyStack = createNativeStackNavigator<MyStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

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
      <MyStack.Screen name="KanaChart" component={KanaChartScreen} options={{ title: '五十音图' }} />
      <MyStack.Screen name="VerbConjugation" component={VerbConjugationScreen} options={{ title: '动词变形表' }} />
      <MyStack.Screen name="KeigoChart" component={KeigoChartScreen} options={{ title: '敬语表' }} />
      <MyStack.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
    </MyStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarStyle: { backgroundColor: '#fff' },
          tabBarIcon: ({ color, size, focused }) => {
            let iconName: keyof typeof Ionicons.glyphMap;
            if (route.name === 'Learn') {
              iconName = focused ? 'book' : 'book-outline';
            } else if (route.name === 'Grammar') {
              iconName = focused ? 'reader' : 'reader-outline';
            } else if (route.name === 'Search') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'Mistakes') {
              iconName = focused ? 'alert-circle' : 'alert-circle-outline';
            } else {
              iconName = focused ? 'person' : 'person-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Learn" component={LearnStackScreen} options={{ title: '学习' }} />
        <Tab.Screen name="Grammar" component={GrammarStackScreen} options={{ title: '文法' }} />
        <Tab.Screen name="Search" component={SearchScreen} options={{ title: '搜索' }} />
        <Tab.Screen name="Mistakes" component={MistakesScreen} options={{ title: '错题' }} />
        <Tab.Screen name="My" component={MyStackScreen} options={{ title: '我的' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
