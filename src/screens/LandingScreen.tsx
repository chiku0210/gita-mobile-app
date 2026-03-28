import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

export function LandingScreen() {
  const colors = useTheme();
  const nav = useNavigation<Nav>();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.background === '#FAFAF7' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.center}>
        <Text style={[styles.sanskrit, { color: colors.accent }]}>
          श्रीमद्भगवद्गीता
        </Text>
        <Text style={[styles.english, { color: colors.text }]}>
          Bhagavad Gita
        </Text>
        <Text style={[styles.sub, { color: colors.muted }]}>
          700 verses · 18 chapters
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, { borderColor: colors.accent }]}
        onPress={() => nav.navigate('ChapterList')}
        activeOpacity={0.7}
      >
        <Text style={[styles.btnText, { color: colors.accent }]}>Begin Reading</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.screenMargin,
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingBottom: 64,
  },
  center: {
    gap: 12,
  },
  sanskrit: {
    ...Typography.sanskrit,
    fontSize: 28,
    lineHeight: 48,
  },
  english: {
    ...Typography.chapterTitle,
    fontSize: 32,
  },
  sub: {
    ...Typography.ui,
    fontSize: 14,
    marginTop: 4,
  },
  btn: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignSelf: 'flex-start',
  },
  btnText: {
    ...Typography.ui,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
