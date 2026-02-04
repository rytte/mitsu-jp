import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import LevelSelectScreen from '../screens/LevelSelectScreen';
import StageListScreen from '../screens/StageListScreen';
import StageWordsScreen from '../screens/StageWordsScreen';
import QuizScreen from '../screens/QuizScreen';
import ResultScreen from '../screens/ResultScreen';
import MistakesScreen from '../screens/MistakesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { LearnStackParamList, RootTabParamList } from './types';
import { colors } from '../theme';

const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function LearnStackScreen() {
  return (
    <LearnStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <LearnStack.Screen name="LevelSelect" component={LevelSelectScreen} options={{ title: '等级选择' }} />
      <LearnStack.Screen name="StageList" component={StageListScreen} options={{ title: '关卡列表' }} />
      <LearnStack.Screen name="StageWords" component={StageWordsScreen} options={{ title: '本关词汇' }} />
      <LearnStack.Screen name="Quiz" component={QuizScreen} options={{ title: '闯关测验' }} />
      <LearnStack.Screen name="Result" component={ResultScreen} options={{ title: '结果' }} />
    </LearnStack.Navigator>
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
            } else if (route.name === 'Mistakes') {
              iconName = focused ? 'alert-circle' : 'alert-circle-outline';
            } else {
              iconName = focused ? 'settings' : 'settings-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Learn" component={LearnStackScreen} options={{ title: '学习' }} />
        <Tab.Screen name="Mistakes" component={MistakesScreen} options={{ title: '错题' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

