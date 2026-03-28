import { getDb } from './client';
import { chapters, verses, translations } from './schema';
import { eq } from 'drizzle-orm';
import type { Chapter, Verse, Translation } from './schema';

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

// Returns all translation rows for a verse
export async function getTranslationsForVerse(verseId: string): Promise<Translation[]> {
  return getDb()
    .select()
    .from(translations)
    .where(eq(translations.verse_id, verseId));
}

// Returns the primary English translation for a verse (gambir preferred)
export async function getPrimaryTranslation(verseId: string): Promise<string | null> {
  const preferred = ['gambir', 'siva', 'san', 'purohit'];
  const rows = await getTranslationsForVerse(verseId);
  for (const code of preferred) {
    const row = rows.find((r) => r.author_code === code);
    if (row?.et) return row.et;
  }
  return rows.find((r) => r.et)?.et ?? null;
}
