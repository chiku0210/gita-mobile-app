import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing, COMMENTATORS, CONTENT_LABELS } from '../theme/tokens';
import { getTranslationsForVerse } from '../db/queries';
import type { Translation } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'Commentary'>;
type Route = RouteProp<RootStackParamList, 'Commentary'>;
type AuthorCode = typeof COMMENTATORS[number]['code'];

export function CommentaryScreen() {
  const colors = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [rows, setRows] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('gambir');

  useEffect(() => {
    getTranslationsForVerse(params.verseId)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [params.verseId]);

  // Map rows by author_code for O(1) lookup
  const byCode = Object.fromEntries(rows.map((r) => [r.author_code, r]));
  const current: Translation | undefined = byCode[selected];
  const commentatorMeta = COMMENTATORS.find((c) => c.code === selected);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.background === '#FAFAF7' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} activeOpacity={0.6}>
          <Text style={[styles.closeBtn, { color: colors.accent }]}>↓ Close</Text>
        </TouchableOpacity>
        <Text style={[styles.verseLabel, { color: colors.muted }]}>
          {params.chapterNumber}.{params.verseNumber}
        </Text>
      </View>

      {/* Horizontal commentator chip picker */}
      <FlatList
        data={COMMENTATORS}
        keyExtractor={(item) => item.code}
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
                    : hasData ? colors.border : colors.border,
                  backgroundColor: active ? colors.accent : 'transparent',
                  opacity: hasData ? 1 : 0.4,
                },
              ]}
              onPress={() => setSelected(item.code)}
              activeOpacity={0.7}
              disabled={!hasData}
            >
              <Text style={[
                styles.chipText,
                { color: active ? colors.background : colors.muted },
              ]}>
                {item.author}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Commentary content */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {current ? (
          (commentatorMeta?.langs ?? ['et', 'ec', 'ht', 'hc', 'sc']).map((lang) => {
            const content = current[lang as keyof Translation] as string | null;
            if (!content) return null;
            return (
              <View key={lang} style={styles.section}>
                <Text style={[styles.langLabel, { color: colors.accent }]}>
                  {CONTENT_LABELS[lang] ?? lang.toUpperCase()}
                </Text>
                <Text style={[styles.body, { color: colors.text }]}>
                  {content}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={[styles.empty, { color: colors.muted }]}>
            No commentary available for this verse.
          </Text>
        )}
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
  closeBtn:   { ...Typography.ui, fontSize: 14 },
  verseLabel: { ...Typography.ui, fontSize: 13 },
  chips: {
    paddingHorizontal: Spacing.screenMargin,
    paddingVertical: 16,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { ...Typography.ui, fontSize: 12 },
  scroll: {
    paddingHorizontal: Spacing.screenMargin,
    paddingBottom: 64,
    gap: 28,
  },
  section:   { gap: 10 },
  langLabel: { ...Typography.ui, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  body:      { ...Typography.translation, fontSize: 16, lineHeight: 26 },
  empty:     { ...Typography.ui, marginTop: 40, textAlign: 'center' },
});
