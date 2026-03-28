import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing } from '../theme/tokens';
import { getChapters } from '../db/queries';
import type { Chapter } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChapterList'>;

export function ChapterListScreen() {
  const colors = useTheme();
  const nav = useNavigation<Nav>();
  const [chapterList, setChapterList] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChapters()
      .then(setChapterList)
      .finally(() => setLoading(false));
  }, []);

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
      <Text style={[styles.header, { color: colors.text }]}>Chapters</Text>
      <FlatList
        data={chapterList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() =>
              nav.navigate('VerseList', {
                chapterId:     item.id,
                chapterNumber: item.chapter_number,
                chapterTitle:  item.name_english ?? item.meaning_en ?? `Chapter ${item.chapter_number}`,
              })
            }
            activeOpacity={0.6}
          >
            <Text style={[styles.num, { color: colors.accent }]}>
              {item.chapter_number}
            </Text>
            <View style={styles.meta}>
              <Text style={[styles.sanskrit, { color: colors.text }]}>
                {item.name_sanskrit}
              </Text>
              <Text style={[styles.english, { color: colors.text }]}>
                {item.name_english ?? item.name_transliteration}
              </Text>
              {item.meaning_en ? (
                <Text style={[styles.meaning, { color: colors.muted }]} numberOfLines={1}>
                  {item.meaning_en}
                </Text>
              ) : null}
              <Text style={[styles.count, { color: colors.muted }]}>
                {item.verses_count} verses
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    ...Typography.chapterTitle,
    paddingHorizontal: Spacing.screenMargin,
    paddingTop: 56,
    paddingBottom: 24,
  },
  list: { paddingBottom: 48 },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenMargin,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 20,
  },
  num:     { ...Typography.chapterTitle, fontSize: 28, width: 36, lineHeight: 36 },
  meta:    { flex: 1, gap: 4 },
  sanskrit:{ ...Typography.sanskrit, fontSize: 17, lineHeight: 26 },
  english: { ...Typography.translation, fontSize: 15 },
  meaning: { ...Typography.ui, fontSize: 12, fontStyle: 'normal' },
  count:   { ...Typography.ui, marginTop: 2 },
});
