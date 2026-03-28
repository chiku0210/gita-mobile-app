import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing } from '../theme/tokens';
import { getVerseById, getPrimaryTranslation } from '../db/queries';
import type { Verse } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'VerseDetail'>;
type Route = RouteProp<RootStackParamList, 'VerseDetail'>;

export function VerseDetailScreen() {
  const colors = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const [verse, setVerse] = useState<Verse | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [v, t] = await Promise.all([
        getVerseById(params.verseId),
        getPrimaryTranslation(params.verseId),
      ]);
      setVerse(v);
      setTranslation(t);
    }
    load().finally(() => setLoading(false));
  }, [params.verseId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!verse) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted }}>Verse not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.background === '#FAFAF7' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
      />
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} activeOpacity={0.6}>
          <Text style={[styles.back, { color: colors.accent }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.verseLabel, { color: colors.muted }]}>
          {params.chapterNumber}.{params.verseNumber}
        </Text>
        <TouchableOpacity
          onPress={() =>
            nav.navigate('Commentary', {
              verseId:       params.verseId,
              chapterNumber: params.chapterNumber,
              verseNumber:   params.verseNumber,
            })
          }
          activeOpacity={0.6}
        >
          <Text style={[styles.commentaryLink, { color: colors.accent }]}>Commentary</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sanskrit, { color: colors.text }]}>
          {verse.text_sanskrit}
        </Text>
        {verse.text_romanized ? (
          <Text style={[styles.romanized, { color: colors.muted }]}>
            {verse.text_romanized}
          </Text>
        ) : null}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {translation ? (
          <Text style={[styles.translation, { color: colors.text }]}>
            {translation}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back:            { ...Typography.chapterTitle, fontSize: 22 },
  verseLabel:      { ...Typography.ui, fontSize: 13 },
  commentaryLink:  { ...Typography.ui, fontSize: 13 },
  scroll: {
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: 32,
    paddingBottom: 64,
    gap: 24,
  },
  sanskrit:    { ...Typography.sanskrit },
  romanized:   { ...Typography.romanized },
  divider:     { height: 1, marginVertical: 8 },
  translation: { ...Typography.translation },
});
