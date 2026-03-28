import { getDb } from './client';
import { chapters, verses } from './schema';
import { eq } from 'drizzle-orm';
import type { Chapter, Verse } from './schema';

export async function getChapters(): Promise<Chapter[]> {
  return getDb().select().from(chapters).orderBy(chapters.chapter_number);
}

export async function getChapterById(chapterId: string): Promise<Chapter | null> {
  const result = await getDb()
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  return result[0] ?? null;
}

export async function getVersesByChapter(chapterId: string): Promise<Verse[]> {
  return getDb()
    .select()
    .from(verses)
    .where(eq(verses.chapter_id, chapterId))
    .orderBy(verses.verse_number);
}

export async function getVerseById(verseId: string): Promise<Verse | null> {
  const result = await getDb()
    .select()
    .from(verses)
    .where(eq(verses.id, verseId))
    .limit(1);
  return result[0] ?? null;
}

export async function getCommentaryForVerse(
  verseId: string
): Promise<Record<string, any>> {
  const verse = await getVerseById(verseId);
  if (!verse?.commentary_json) return {};
  try {
    return JSON.parse(verse.commentary_json);
  } catch {
    return {};
  }
}
