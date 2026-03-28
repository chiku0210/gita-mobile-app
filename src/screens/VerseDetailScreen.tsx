import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
  ImageBackground, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing } from '../theme/tokens';
import { getVerseById, getPrimaryTranslation } from '../db/queries';
import { SPEAKER_IMAGES, SPEAKER_LABELS } from '../theme/speakers';
import type { Verse } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'VerseDetail'>;
type Route = RouteProp<RootStackParamList, 'VerseDetail'>;

const SPEAKER_IMAGE_HEIGHT = 260;

export function VerseDetailScreen() {
  const colors = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const chapterNumber = parseInt(params.chapterId.replace('ch_', ''), 10);

  const [verse, setVerse]           = useState<Verse | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

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

  const speakerKey    = verse.speaker ?? 'krishna';
  const speakerImage  = SPEAKER_IMAGES[speakerKey];
  const speakerLabel  = SPEAKER_LABELS[speakerKey] ?? speakerKey;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Speaker image with top-down gradient */}
      <ImageBackground
        source={speakerImage}
        style={styles.speakerImage}
        resizeMode="cover"
      >
        {/* Gradient: opaque dark at top → transparent at bottom */}
        <LinearGradient
          colors={['rgba(10,8,5,0.82)', 'rgba(10,8,5,0.3)', 'transparent']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Header bar — sits on top of gradient */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => nav.goBack()} activeOpacity={0.6}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.verseLabel}>
            {chapterNumber}.{params.verseNumber}
          </Text>
          <TouchableOpacity
            onPress={() =>
              nav.navigate('Commentary', {
                verseId:       params.verseId,
                chapterNumber: chapterNumber,
                verseNumber:   params.verseNumber,
              })
            }
            activeOpacity={0.6}
          >
            <Text style={styles.commentaryLink}>Commentary</Text>
          </TouchableOpacity>
        </View>

        {/* Speaker name anchored to bottom of image */}
        <View style={styles.speakerLabel}>
          <Text style={styles.speakerName}>{speakerLabel}</Text>
        </View>
      </ImageBackground>

      {/* Verse content */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]}
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

  speakerImage: {
    width: '100%',
    height: SPEAKER_IMAGE_HEIGHT,
    justifyContent: 'space-between',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: 52,
    paddingBottom: 8,
  },
  back:           { ...Typography.chapterTitle, fontSize: 22, color: '#FAFAF7' },
  verseLabel:     { ...Typography.ui, fontSize: 13, color: 'rgba(250,250,247,0.6)' },
  commentaryLink: { ...Typography.ui, fontSize: 13, color: '#D4A843' },

  speakerLabel: {
    paddingHorizontal: Spacing.screenMargin,
    paddingBottom: 16,
  },
  speakerName: {
    ...Typography.ui,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(250,250,247,0.5)',
  },

  scroll: {
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: 28,
    paddingBottom: 64,
    gap: 24,
  },
  sanskrit:    { ...Typography.sanskrit },
  romanized:   { ...Typography.romanized },
  divider:     { height: 1, marginVertical: 4 },
  translation: { ...Typography.translation },
});
