import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
  ImageBackground, BackHandler, useWindowDimensions,
  PanResponder,
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
const LINE_HEIGHT_ESTIMATE = 24;

const SWIPE_THRESHOLD     = 60;
const SWIPE_VERTICAL_LIMIT = 80;

export function VerseDetailScreen() {
  const colors = useTheme();
  const nav    = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const { height: screenHeight } = useWindowDimensions();
  const HORIZON_LINE = screenHeight * 0.40;

  const chapterNumber = parseInt(params.chapterId.replace('ch_', ''), 10);
  const verseNumber   = params.verseNumber;
  const totalVerses   = params.totalVerses;

  // ── Optimistic render state ──────────────────────────────────────────────
  // We keep a separate "displayed" state that holds the last fully-loaded
  // verse. When navigating, the new data loads silently in the background.
  // The screen only swaps content once the new data is ready — no spinner,
  // no blank flash. The user always sees a complete verse.
  const [displayedVerse, setDisplayedVerse]           = useState<Verse | null>(null);
  const [displayedTranslation, setDisplayedTranslation] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad]                 = useState(true);

  const [translationLines, setTranslationLines] = useState<number | null>(null);

  // Guard against triggering multiple navigations for a single swipe gesture
  const swipeLocked = useRef(false);

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
    swipeLocked.current = false;
    let cancelled = false;

    async function load() {
      const [v, t] = await Promise.all([
        getVerseById(params.verseId),
        getPrimaryTranslation(params.verseId),
      ]);
      if (cancelled) return;
      // Swap content atomically — no intermediate blank state
      setTranslationLines(null);
      setDisplayedVerse(v);
      setDisplayedTranslation(t);
      setIsFirstLoad(false);
    }

    load();
    return () => { cancelled = true; };
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
        const withoutCurrent = state.routes.slice(0, -1);
        const newRoutes = [
          ...withoutCurrent,
          { name: 'VerseDetail' as const, params: targetParams },
          state.routes[state.routes.length - 1],
        ];
        return CommonActions.reset({
          ...state,
          routes: newRoutes,
          index: newRoutes.length - 1,
        });
      });
      setTimeout(() => nav.dispatch(StackActions.pop()), 50);
    }
  }

  const canGoPrev = verseNumber > 1;
  const canGoNext = verseNumber < totalVerses;

  /**
   * PanResponder: detects left/right swipes and maps them to verse navigation.
   *   Swipe LEFT  (dx < -THRESHOLD) → next verse
   *   Swipe RIGHT (dx >  THRESHOLD) → prev verse
   *
   * Only claims the gesture when horizontal movement clearly dominates
   * vertical movement, so the ScrollView keeps working for long translations.
   */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, { dx, dy }) =>
        Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5,

      onPanResponderRelease: (_evt, { dx, dy }) => {
        if (Math.abs(dy) > SWIPE_VERTICAL_LIMIT || Math.abs(dx) < SWIPE_THRESHOLD) return;
        if (swipeLocked.current) return;
        swipeLocked.current = true;

        if (dx < 0 && canGoNext) {
          navigateTo(verseNumber + 1, 'next');
        } else if (dx > 0 && canGoPrev) {
          navigateTo(verseNumber - 1, 'prev');
        } else {
          swipeLocked.current = false;
        }
      },

      onPanResponderTerminate: () => { swipeLocked.current = false; },
    })
  ).current;

  // Show a spinner only on the very first load (cold open from VerseList).
  // All subsequent verse changes render optimistically.
  if (isFirstLoad) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!displayedVerse) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted }}>Verse not found.</Text>
      </View>
    );
  }

  const speakerKey   = displayedVerse.speaker ?? 'krishna';
  const speakerImage = getSpeakerImage(displayedVerse.speaker);
  const speakerLabel = SPEAKER_LABELS[speakerKey] ?? speakerKey;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} {...panResponder.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── LAYER 1: Fixed Background Image ── */}
      <ImageBackground
        source={speakerImage}
        style={styles.absoluteSpeakerImage}
        resizeMode="cover"
      />

      {/* ── LAYER 2: Scrollable Content & Dynamic Overlay Mask ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <View style={{ backgroundColor: colors.background, minHeight: HORIZON_LINE }}>

          {/* Header */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => nav.dispatch(StackActions.pop(verseDetailCount))}
              activeOpacity={0.6}
              hitSlop={{ top: 50, bottom: 50, left: 50, right: 50 }}
            >
              <View style={styles.backBtn}>
                <Text style={[styles.backChevron, { color: colors.accent }]}>‹</Text>
                <Text style={[styles.backLabel, { color: colors.muted }]}>Verses</Text>
              </View>
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

          {/* Text Content */}
          <View style={styles.scroll}>
            <Text style={[styles.sanskrit, { color: colors.text }]}>
              {displayedVerse.text_sanskrit}
            </Text>
            {displayedVerse.text_romanized ? (
              <Text style={[styles.romanized, { color: colors.muted }]}>
                {displayedVerse.text_romanized}
              </Text>
            ) : null}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {displayedTranslation ? (
              <Text style={[styles.translation, { color: colors.text }]}>
                {displayedTranslation}
              </Text>
            ) : null}
          </View>
        </View>

        {/* GRADIENT MASK */}
        <LinearGradient
          colors={[colors.background, 'rgba(10,8,5,0.0)']}
          style={styles.dynamicGradient}
        />

        {/* SPACER */}
        <View style={styles.speakerLabelContainer}>
          <Text style={styles.speakerName}>{speakerLabel}</Text>
        </View>
      </ScrollView>

      {/* ── LAYER 3: Floating nav arrows ── */}
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

  absoluteSpeakerImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: SPEAKER_IMAGE_HEIGHT,
  },

  dynamicGradient: {
    height: 180,
    width: '100%',
  },

  speakerLabelContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.screenMargin,
    paddingBottom: 20,
    minHeight: 250,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: 52,
    paddingBottom: 12,
  },

  backChevron: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '300',
    marginTop: -2,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  backLabel: {
    letterSpacing: 0.3,
    ...Typography.ui,
  },

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

  showMore: {
    ...Typography.ui,
    fontSize: 13,
    marginTop: 6,
  },
});
