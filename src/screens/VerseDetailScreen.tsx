import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
  ImageBackground,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useNavigationState, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StackActions, CommonActions } from '@react-navigation/native';

import { useTheme } from '../theme/useTheme';
import { Typography, Spacing } from '../theme/tokens';
import { getVerseById, getPrimaryTranslation } from '../db/queries';
import { getSpeakerImage, SPEAKER_LABELS } from '../theme/speakers';
import type { Verse } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';


type Nav   = NativeStackNavigationProp<RootStackParamList, 'VerseDetail'>;
type Route = RouteProp<RootStackParamList, 'VerseDetail'>;

const SPEAKER_IMAGE_HEIGHT = 650;

export function VerseDetailScreen() {
  const colors = useTheme();
  const nav    = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const chapterNumber = parseInt(params.chapterId.replace('ch_', ''), 10);
  const verseNumber   = params.verseNumber;
  const totalVerses   = params.totalVerses;

  const [verse, setVerse]             = useState<Verse | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  const verseDetailCount = useNavigationState(
    state => state.routes.filter(r => r.name === 'VerseDetail').length
  );
  
  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        nav.dispatch(StackActions.pop(verseDetailCount));
        return true;
      });
      return () => subscription.remove();
    }, [verseDetailCount])
  );

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

  function navigateTo(targetVerseNumber: number, direction: 'prev' | 'next') {
    const targetParams = {
      verseId:      `${chapterNumber}_${targetVerseNumber}`,
      chapterId:    params.chapterId,
      chapterTitle: params.chapterTitle,
      verseNumber:  targetVerseNumber,
      totalVerses:  totalVerses,
    };

    if (direction === 'next') {
      nav.dispatch(StackActions.push('VerseDetail', targetParams));
    } else {
      nav.dispatch((state) => {
        const withoutCurrent = state.routes.slice(0, -1); // e.g. [..., VerseList]
        const newRoutes = [
          ...withoutCurrent,
          { name: 'VerseDetail' as const, params: targetParams }, // target injected here
          state.routes[state.routes.length - 1],                  // current screen stays on top
        ];
        return CommonActions.reset({
          ...state,
          routes: newRoutes,
          index: newRoutes.length - 1, // still on current screen
        });
      });

      // Now goBack() animates back to target (not VerseList)
      // Small timeout ensures reset has settled before pop
      setTimeout(() => nav.dispatch(StackActions.pop()), 50);
    }
  }

  const canGoPrev = verseNumber > 1;
  const canGoNext = verseNumber < totalVerses;

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

  const speakerKey   = verse.speaker ?? 'krishna';
  const speakerImage = getSpeakerImage(verse.speaker);
  const speakerLabel = SPEAKER_LABELS[speakerKey] ?? speakerKey;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <View style={[styles.topBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => nav.dispatch(StackActions.pop(verseDetailCount))}
          activeOpacity={0.6}
          hitSlop={{ top: 50, bottom: 50, left: 50, right: 50 }}
        >
          <Text style={[styles.back, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.verseLabel, { color: colors.muted }]}>
          {chapterNumber}.{verseNumber}
        </Text>
        <TouchableOpacity
          onPress={() =>
            nav.navigate('Commentary', {
              verseId:       params.verseId,
              chapterNumber: chapterNumber,
              verseNumber:   verseNumber,
            })
          }
          activeOpacity={0.6}
        >
          <Text style={styles.commentaryLink}>Commentary</Text>
        </TouchableOpacity>
      </View>

      {/* ── Verse content ── */}
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

      {/* ── Speaker image pinned to bottom ── */}
      <ImageBackground
        source={speakerImage}
        style={styles.speakerImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[colors.background, 'rgba(10,8,5,0.0)']}
          locations={[0, 0.55]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.speakerLabelContainer}>
          <Text style={styles.speakerName}>{speakerLabel}</Text>
        </View>
      </ImageBackground>

      {/* ── Floating nav arrows ── */}
      {canGoPrev && (
        <TouchableOpacity
          style={[styles.floatArrow, styles.floatLeft]}
          onPress={() => navigateTo(verseNumber - 1, 'prev')}
          activeOpacity={0.4}
        >
          <Text style={styles.floatArrowText}>‹</Text>
        </TouchableOpacity>
      )}
      {canGoNext && (
        <TouchableOpacity
          style={[styles.floatArrow, styles.floatRight]}
          onPress={() => navigateTo(verseNumber + 1, 'next')}
          activeOpacity={0.4}
        >
          <Text style={styles.floatArrowText}>›</Text>
        </TouchableOpacity>
      )}

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
    paddingBottom: 12,
  },
  back:           { ...Typography.chapterTitle, fontSize: 22 },
  verseLabel:     { ...Typography.ui, fontSize: 13 },
  commentaryLink: { ...Typography.ui, fontSize: 13, color: '#D4A843' },

  scroll: {
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 24,
  },
  sanskrit:    { ...Typography.sanskrit },
  romanized:   { ...Typography.romanized },
  divider:     { height: 1, marginVertical: 4 },
  translation: { ...Typography.translation },

  speakerImage: {
    width: '100%',
    height: SPEAKER_IMAGE_HEIGHT,
    justifyContent: 'flex-end',
  },
  speakerLabelContainer: {
    paddingHorizontal: Spacing.screenMargin,
    paddingBottom: 20,
  },
  speakerName: {
    ...Typography.ui,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(250,250,247,0.45)',
  },

  floatArrow: {
    position: 'absolute',
    top: 250,
    bottom: 0,
    width: '15%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatLeft:  { left: 0 },
  floatRight: { right: 0 },
  floatArrowText: {
    fontSize: 64,
    lineHeight: 68,
    color: 'rgba(255,255,255,0.28)',
    fontWeight: '100',
    includeFontPadding: false,
  },
});