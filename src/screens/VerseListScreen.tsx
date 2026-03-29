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
import { getVersesByChapter } from '../db/queries';
import type { Verse } from '../db/schema';
import type { RootStackParamList } from '../navigation/types';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'VerseList'>;
type Route = RouteProp<RootStackParamList, 'VerseList'>;

export function VerseListScreen() {
  const colors = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const [rows, setRows] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const verseList = await getVersesByChapter(params.chapterId);
      setRows(verseList);
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
        <Text style={[styles.backChevron, { color: colors.accent }]}>‹</Text>
        <Text style={[styles.backLabel, { color: colors.muted }]}>Chapters</Text>
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
                totalVerses:  rows.length,
              })
            }
            activeOpacity={0.6}
          >
            <Text style={[styles.num, { color: colors.accent }]}>
              {params.chapterNumber}.{item.verse_number}
            </Text>
            <Text style={[styles.sanskrit, { color: colors.muted }]} numberOfLines={2}>
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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: Spacing.screenMargin,
  },
  backChevron: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '300',
    marginTop: -2,
  },
  backLabel: {
    letterSpacing: 0.3,
    ...Typography.ui,
  },
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
  sanskrit: { ...Typography.translation, fontSize: 14, lineHeight: 20, flex: 1 },
});
