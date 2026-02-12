import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExamQuizStackParamList } from '../navigation/types';
import { colors } from '../theme';
import ExamQuizBankScreen from './ExamQuizBankScreen';
import ExamQuizPracticeScreen from './ExamQuizPracticeScreen';

const ExamQuizStack = createNativeStackNavigator<ExamQuizStackParamList>();

export default function ExamQuizScreen() {
  return (
    <ExamQuizStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <ExamQuizStack.Screen name="ExamQuizBank" component={ExamQuizBankScreen} options={{ title: '真题练习' }} />
      <ExamQuizStack.Screen name="ExamQuizPractice" component={ExamQuizPracticeScreen} options={{ title: '真题练习' }} />
    </ExamQuizStack.Navigator>
  );
}
