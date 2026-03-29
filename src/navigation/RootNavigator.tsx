import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { LandingScreen }     from '../screens/LandingScreen';
import { ChapterListScreen } from '../screens/ChapterListScreen';
import { VerseListScreen }   from '../screens/VerseListScreen';
import { VerseDetailScreen } from '../screens/VerseDetailScreen';
import { CommentaryScreen }  from '../screens/CommentaryScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const colors = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Landing"     component={LandingScreen} />
        <Stack.Screen name="ChapterList" component={ChapterListScreen} />
        <Stack.Screen name="VerseList"   component={VerseListScreen} />
        <Stack.Screen name="VerseDetail" component={VerseDetailScreen} />
        <Stack.Screen
          name="Commentary"
          component={CommentaryScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}