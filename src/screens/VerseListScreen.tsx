import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing } from '../theme/tokens';
import { getVersesByChapter, getPrimaryTranslation } from '../db/queries';
import type { Verse } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'VerseList'>;
type Route = RouteProp<RootStackParamList, 'VerseList'>;

type VerseRow = Verse & { preview: string | null };

export function VerseListScreen() {
  const colors = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const [rows, setRows] = useState<VerseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const verseList = await getVersesByChapter(params.chapterId);
      const withPreviews = await Promise.all(
        verseList.map(async (v) => ({
          ...v,
          preview: await getPrimaryTranslation(v.id),
        }))
      );
      setRows(withPreviews);
    }
    load().finally(() => setLoading(false));
  }, [params.chapterId]);

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
      <TouchableOpacity
        style={styles.back}
        onPress={() => nav.goBack()}
        activeOpacity={0.6}
      >
        <Text style={[styles.backText, { color: colors.accent }]}>← Chapters</Text>
      </TouchableOpacity>
      <Text style={[styles.header, { color: colors.text }]}>
        Chapter {params.chapterNumber}
      </Text>
      <Text style={[styles.sub, { color: colors.muted }]}>
        {params.chapterTitle}
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() =>
              nav.navigate('VerseDetail', {
                verseId:      item.id,
                chapterId:    params.chapterId,
                chapterTitle: params.chapterTitle,
                verseNumber:  item.verse_number,
              })
            }
            activeOpacity={0.6}
          >
            <Text style={[styles.num, { color: colors.accent }]}>
              {params.chapterNumber}.{item.verse_number}
            </Text>
            <Text style={[styles.preview, { color: colors.muted }]} numberOfLines={2}>
              {item.text_sanskrit ?? ''}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: 72, offset: 72 * index, index })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back:   { paddingHorizontal: Spacing.screenMargin, paddingTop: 52, paddingBottom: 8 },
  backText: { ...Typography.ui, fontSize: 14 },
  header: { ...Typography.chapterTitle, paddingHorizontal: Spacing.screenMargin, paddingTop: 8 },
  sub:    { ...Typography.ui, paddingHorizontal: Spacing.screenMargin, paddingTop: 4, paddingBottom: 20 },
  list:   { paddingBottom: 48 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenMargin,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 16,
    alignItems: 'flex-start',
    minHeight: 72,
  },
  num:     { ...Typography.ui, width: 40, paddingTop: 2 },
  preview: { ...Typography.translation, fontSize: 14, lineHeight: 20, flex: 1 },
});
