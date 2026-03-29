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
        {/*
          animation: 'none' here is intentional.
          VerseDetail → VerseDetail transitions happen via swipe gestures and
          arrow taps. Running a slide animation on top of a user-initiated swipe
          creates a ~300-400ms lag that feels broken. 'none' gives an instant
          content swap — the correct feel for paging through verses.
          All other screens entering VerseDetail still use slide_from_right
          (inherited from the navigator default above).
        */}
        <Stack.Screen
          name="VerseDetail"
          component={VerseDetailScreen}
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="Commentary"
          component={CommentaryScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
