import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import {
  Typography,
  Spacing,
  COMMENTATORS,
  CONTENT_LABELS,
} from '../theme/tokens';
import { getTranslationsForVerse } from '../db/queries';
import type { Translation } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = 460;
const IMAGE_OVERSCAN = 240;
const HEADER_H = 52;
const GRADIENT_HEIGHT = 220;

type CommentatorImageConfig = { source: any; verticalOffset?: number };

const COMMENTATOR_IMAGES: Record<string, CommentatorImageConfig> = {
  siva: {
    source: require('../../assets/commentators/sivananda.jpg'),
    verticalOffset: -80,
  },
  gambir: {
    source: require('../../assets/commentators/gambhirananda.jpeg'),
    verticalOffset: 0,
  },
  san: {
    source: require('../../assets/commentators/Dr S Sankaranarayan.jpeg'),
    verticalOffset: 0,
  },
  purohit: {
    source: require('../../assets/commentators/purohit-swami.jpg'),
    verticalOffset: -150,
  },
  adi: {
    source: require('../../assets/commentators/adidevananda.jpg'),
    verticalOffset: -70,
  },
  raman: {
    source: require('../../assets/commentators/ramanuja.webp'),
    verticalOffset: -30,
  },
  sankar: {
    source: require('../../assets/commentators/shankaracharya.jpg'),
    verticalOffset: 0,
  },
  abhinav: {
    source: require('../../assets/commentators/abhinavagupta.webp'),
    verticalOffset: -65,
  },
  chinmay: {
    source: require('../../assets/commentators/Swami-Chinmayananda.jpg'),
    verticalOffset: -50,
  },
  rams: {
    source: require('../../assets/commentators/ramsukhdas.jpeg'),
    verticalOffset: 0,
  },
  tej: {
    source: require('../../assets/commentators/tejomayananda.webp'),
    verticalOffset: 0,
  },
  madhav: {
    source: require('../../assets/commentators/madhavacharya.jpg'),
    verticalOffset: -50,
  },
  ms: {
    source: require('../../assets/commentators/Madhusudan-Saraswati.webp'),
    verticalOffset: -30,
  },
  srid: {
    source: require('../../assets/commentators/sridhara-swami.jpg'),
    verticalOffset: 0,
  },
  neel: {
    source: require('../../assets/commentators/Bhavadipika_neelakantha.jpeg'),
    verticalOffset: 0,
  },
  venkat: {
    source: require('../../assets/commentators/Vedantadeshikacharya.webp'),
    verticalOffset: 0,
  },
};

type Nav = NativeStackNavigationProp<RootStackParamList, 'Commentary'>;
type Route = RouteProp<RootStackParamList, 'Commentary'>;

export function CommentaryScreen() {
  const colors = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const [rows, setRows] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('siva');

  // Track the dynamic heights to maintain the mathematical lock
  const [svHeight, setSvHeight] = useState(SCREEN_HEIGHT);
  const [stickyHeight, setStickyHeight] = useState(0);

  useEffect(() => {
    getTranslationsForVerse(params.verseId)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [params.verseId]);

  const byCode = Object.fromEntries(rows.map(r => [r.author_code, r]));
  const current = byCode[selected] as Translation | undefined;
  const commentatorMeta = COMMENTATORS.find(c => c.code === selected);
  const imgCfg = COMMENTATOR_IMAGES[selected];

  // ─── Mathematical Layout Constraints ───────────────────────────────────────
  const safeTop = Math.max(insets.top, 16);
  const spacerHeight = Math.max(0, IMAGE_HEIGHT - safeTop);

  // We use a fallback guess (safeTop + 100) before the first render completes
  // to avoid any layout jumping, then it locks to the exact measured height.
  const activeStickyHeight = stickyHeight || safeTop + HEADER_H + 55;
  const minContentHeight = Math.max(0, svHeight - activeStickyHeight);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#0F0F0D' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F0F0D"
        translucent={false}
      />

      {/* ── LAYER 0 · Fixed commentator image in background ── */}
      <View style={styles.imageContainer}>
        {imgCfg ? (
          <Image
            source={imgCfg.source}
            style={[
              styles.commentatorImage,
              imgCfg.verticalOffset !== undefined && {
                height: IMAGE_HEIGHT + IMAGE_OVERSCAN,
                transform: [{ translateY: imgCfg.verticalOffset }],
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[styles.imagePlaceholder, { backgroundColor: '#333' }]}
          />
        )}
      </View>

      {/* ── LAYER 1 · Native Scroll View covering the screen ── */}
      <ScrollView
        style={StyleSheet.absoluteFillObject}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        snapToOffsets={[0, spacerHeight]}
        snapToStart={true}
        snapToEnd={false}
        decelerationRate="normal"
        onLayout={e => setSvHeight(e.nativeEvent.layout.height)}
      >
        {/* Index 0: Transparent spacer WITH the gradient anchored to its bottom */}
        <View style={{ height: spacerHeight, justifyContent: 'flex-end' }}>
          <LinearGradient
            colors={[
              'rgba(15,15,13,0)',
              'rgba(15,15,13,0.01)',
              'rgba(15,15,13,0.05)',
              'rgba(15,15,13,0.22)',
              'rgba(15,15,13,0.4)',
              'rgba(15,15,13,1)',
            ]}
            locations={[0, 0.1, 0.2, 0.4, 0.55, 1]}
            style={{ height: GRADIENT_HEIGHT, width: '100%' }}
            pointerEvents="none"
          />
        </View>

        {/* Index 1: The Sticky Panel Header & Chips (Dynamically Measured) */}
        <View
          style={{ backgroundColor: '#0F0F0D', paddingTop: safeTop }}
          onLayout={e => setStickyHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => nav.goBack()}
              activeOpacity={0.6}
              hitSlop={{ top: 50, bottom: 50, left: 50, right: 50 }}
            >
              <View style={styles.backBtn}>
                <Text style={[styles.backChevron, { color: colors.accent }]}>
                  ‹
                </Text>
                <Text style={[styles.backLabel, { color: colors.muted }]}>
                  Close
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.verseLabel, { color: '#8A8A80' }]}>
              {params.chapterNumber}.{params.verseNumber}
            </Text>
          </View>

          <View style={styles.chipsWrapper}>
            <FlatList
              data={COMMENTATORS}
              keyExtractor={item => item.code}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              renderItem={({ item }) => {
                const active = item.code === selected;
                const hasData = !!byCode[item.code];
                return (
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      {
                        borderColor: active
                          ? colors.accent
                          : hasData
                            ? 'rgba(255,255,255,0.2)'
                            : 'rgba(255,255,255,0.1)',
                        backgroundColor: active ? colors.accent : 'transparent',
                        opacity: hasData ? 1 : 0.4,
                      },
                    ]}
                    onPress={() => setSelected(item.code)}
                    activeOpacity={0.7}
                    disabled={!hasData}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.background : '#8A8A80' },
                      ]}
                    >
                      {item.author}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>

        {/* Index 2: The Scrolling Content */}
        <View
          style={[
            styles.scrollContent,
            {
              minHeight: minContentHeight,
              paddingBottom: Math.max(insets.bottom, 24) + 20,
            },
          ]}
        >
          {current ? (
            (commentatorMeta?.langs ?? ['et', 'ec', 'ht', 'hc', 'sc']).map(
              lang => {
                const content = current[lang as keyof Translation] as
                  | string
                  | null;
                if (!content) return null;
                return (
                  <View key={lang} style={styles.section}>
                    <View style={styles.labelRow}>
                      <Text
                        style={[styles.langLabel, { color: colors.accent }]}
                      >
                        {CONTENT_LABELS[lang] ?? lang.toUpperCase()}
                      </Text>
                      <View
                        style={[
                          styles.labelRule,
                          { backgroundColor: colors.accent, opacity: 0.2 },
                        ]}
                      />
                    </View>
                    <Text style={[styles.body, { color: '#FAFAF7' }]}>
                      {content}
                    </Text>
                  </View>
                );
              }
            )
          ) : (
            <Text style={[styles.empty, { color: '#5A5A52' }]}>
              No commentary available for this verse.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F0D' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: IMAGE_HEIGHT,
    zIndex: 0,
    overflow: 'hidden',
  },
  commentatorImage: { width: SCREEN_WIDTH, height: IMAGE_HEIGHT },
  imagePlaceholder: { width: SCREEN_WIDTH, height: IMAGE_HEIGHT },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenMargin,
    paddingBottom: 8,
    height: HEADER_H,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backChevron: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '300',
    marginTop: -2,
  },
  backLabel: { ...Typography.ui, letterSpacing: 0.3 },
  verseLabel: { ...Typography.ui, fontSize: 13 },

  chipsWrapper: {
    paddingHorizontal: Spacing.screenMargin,
    paddingVertical: 12, // Pure padding handles the vertical spacing now
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  chips: { gap: 8 },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  chipText: {
    ...Typography.ui,
    fontSize: 14,
    flexShrink: 0,
  },
  scrollContent: {
    backgroundColor: '#0F0F0D',
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: 16,
    gap: 28,
  },
  section: { gap: 10 },
  langLabel: {
    ...Typography.ui,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelRule: { flex: 1, height: StyleSheet.hairlineWidth },
  body: { ...Typography.translation, fontSize: 16, lineHeight: 26 },
  empty: { ...Typography.ui, marginTop: 40, textAlign: 'center' },
});
