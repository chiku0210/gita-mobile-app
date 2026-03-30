import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ImageBackground,
  BackHandler,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useNavigation,
  useRoute,
  useNavigationState,
  useFocusEffect,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StackActions, CommonActions } from '@react-navigation/native';

import { useTheme } from '../theme/useTheme';
import { Typography, Spacing } from '../theme/tokens';
import {
  getVerseById,
  getGitaPressTranslation,
  getPrimaryTranslation,
} from '../db/queries';
import { getSpeakerImage, SPEAKER_LABELS } from '../theme/speakers';
import type { Verse } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VerseDetail'>;
type Route = RouteProp<RootStackParamList, 'VerseDetail'>;

const SPEAKER_IMAGE_HEIGHT = 650;
const LINE_HEIGHT_ESTIMATE = 24;

/**
 * Minimum horizontal distance (px) a swipe must travel to trigger navigation.
 * Keeping it at 60 avoids accidental triggers while still feeling snappy.
 */
const SWIPE_THRESHOLD = 60;

/**
 * Max vertical drift (px) allowed before we decide the gesture is a scroll,
 * not a horizontal swipe. Prevents the swipe handler from eating scroll events.
 */
const SWIPE_VERTICAL_LIMIT = 80;

export function VerseDetailScreen() {
  const colors = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const { height: screenHeight } = useWindowDimensions();
  const HORIZON_LINE = screenHeight * 0.4;

  const chapterNumber = parseInt(params.chapterId.replace('ch_', ''), 10);
  const verseNumber = params.verseNumber;
  const totalVerses = params.totalVerses;

  const [verse, setVerse] = useState<Verse | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [translationLines, setTranslationLines] = useState<number | null>(null);

  // Guard against triggering multiple navigations for a single swipe gesture
  const swipeLocked = useRef(false);

  const verseDetailCount = useNavigationState(
    state => state.routes.filter(r => r.name === 'VerseDetail').length
  );

  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          nav.dispatch(StackActions.pop(verseDetailCount));
          return true;
        }
      );
      return () => subscription.remove();
    }, [verseDetailCount])
  );

  useEffect(() => {
    setTranslationLines(null);
    setLoading(true);
    swipeLocked.current = false;

    async function load() {
      const [v, gitaPressTranslation] = await Promise.all([
        getVerseById(params.verseId),
        getGitaPressTranslation(params.verseId),
      ]);
      setVerse(v);

      if (gitaPressTranslation) {
        // Primary source: Gita Press translation seeded from OCR
        setTranslation(gitaPressTranslation);
      } else {
        // Fallback: API-sourced translation from the translations table
        const fallback = await getPrimaryTranslation(params.verseId);
        setTranslation(fallback);
      }
    }
    load().finally(() => setLoading(false));
  }, [params.verseId]);

  function navigateTo(targetVerseNumber: number, direction: 'prev' | 'next') {
    const targetParams = {
      verseId: `${chapterNumber}_${targetVerseNumber}`,
      chapterId: params.chapterId,
      chapterTitle: params.chapterTitle,
      verseNumber: targetVerseNumber,
      totalVerses: totalVerses,
    };

    if (direction === 'next') {
      nav.dispatch(StackActions.push('VerseDetail', targetParams));
    } else {
      nav.dispatch(state => {
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
   * PanResponder that detects left/right swipes and maps them to verse navigation.
   *
   * Direction semantics (matches physical intuition of a book):
   *   Swipe LEFT  (dx < -THRESHOLD) → next verse  (right page turn)
   *   Swipe RIGHT (dx >  THRESHOLD) → prev verse  (left page turn)
   *
   * The responder only claims the gesture when horizontal movement clearly
   * dominates vertical movement, so the ScrollView below keeps working.
   */
  const panResponder = useRef(
    PanResponder.create({
      // Offer to become the responder on every touch move
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5;
      },

      onPanResponderRelease: (_evt, gestureState) => {
        const { dx, dy } = gestureState;

        // Reject near-vertical or tiny gestures
        if (
          Math.abs(dy) > SWIPE_VERTICAL_LIMIT ||
          Math.abs(dx) < SWIPE_THRESHOLD
        )
          return;

        // Prevent double-fires on the same swipe
        if (swipeLocked.current) return;
        swipeLocked.current = true;

        if (dx < 0 && canGoNext) {
          // Left swipe → go to next verse
          navigateTo(verseNumber + 1, 'next');
        } else if (dx > 0 && canGoPrev) {
          // Right swipe → go to previous verse
          navigateTo(verseNumber - 1, 'prev');
        } else {
          // No valid target; release the lock immediately
          swipeLocked.current = false;
        }
      },

      // Release lock if the gesture is cancelled (e.g. multi-touch)
      onPanResponderTerminate: () => {
        swipeLocked.current = false;
      },
    })
  ).current;

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

  const speakerKey = verse.speaker ?? 'krishna';
  const speakerImage = getSpeakerImage(verse.speaker);
  const speakerLabel = SPEAKER_LABELS[speakerKey] ?? speakerKey;

  const linesCount = translationLines || 0;
  const extraLines = Math.max(0, linesCount - 4);
  const dynamicImageHeight = Math.max(
    250,
    SPEAKER_IMAGE_HEIGHT - extraLines * LINE_HEIGHT_ESTIMATE
  );

  const isLayoutReady = !translation || translationLines !== null;

  return (
    // Attach the PanResponder handlers to the root container so the entire
    // screen surface is swipeable, including the image area at the bottom.
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      {...panResponder.panHandlers}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

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
        // Allow horizontal pan events to bubble up to the root PanResponder
        // when the user clearly intends a horizontal swipe.
        scrollEventThrottle={16}
      >
        {/* SOLID MASK: Grows with text, but never shrinks above the horizon */}
        <View
          style={{
            backgroundColor: colors.background,
            minHeight: HORIZON_LINE,
          }}
        >
          {/* Header */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => nav.dispatch(StackActions.pop(verseDetailCount))}
              activeOpacity={0.6}
              hitSlop={{ top: 50, bottom: 50, left: 50, right: 50 }}
            >
              <View style={styles.backBtn}>
                <Text style={[styles.backChevron, { color: colors.accent }]}>
                  ‹
                </Text>
                <Text style={[styles.backLabel, { color: colors.muted }]}>
                  Verses
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.verseLabel, { color: colors.muted }]}>
              {chapterNumber}.{verseNumber}
            </Text>
            <TouchableOpacity
              onPress={() =>
                nav.navigate('Commentary', {
                  verseId: params.verseId,
                  chapterNumber: chapterNumber,
                  verseNumber: verseNumber,
                })
              }
              hitSlop={{ top: 50, bottom: 50, left: 50, right: 50 }}
              activeOpacity={0.6}
            >
              <Text style={styles.commentaryLink}>Commentary</Text>
            </TouchableOpacity>
          </View>

          {/* Text Content */}
          <View style={styles.scroll}>
            <Text style={[styles.sanskrit, { color: colors.text }]}>
              {verse.text_sanskrit}
            </Text>
            {verse.text_romanized ? (
              <Text style={[styles.romanized, { color: colors.muted }]}>
                {verse.text_romanized}
              </Text>
            ) : null}
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            {translation ? (
              <Text style={[styles.translation, { color: colors.text }]}>
                {translation}
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
  root: { flex: 1 },
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

  verseLabel: { ...Typography.ui, fontSize: 13 },

  commentaryLink: { ...Typography.ui, fontSize: 13, color: '#D4A843' },

  scroll: {
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 24,
  },

  sanskrit: { ...Typography.sanskrit },

  romanized: { ...Typography.romanized },

  divider: { height: 1, marginVertical: 4 },

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

  floatLeft: { left: 0 },

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
