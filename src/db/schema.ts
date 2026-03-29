import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const chapters = sqliteTable('chapters', {
  id:                   text('id').primaryKey(),
  chapter_number:       integer('chapter_number').notNull(),
  verses_count:         integer('verses_count').notNull(),
  name_sanskrit:        text('name_sanskrit').notNull(),
  name_english:         text('name_english'),
  name_transliteration: text('name_transliteration'),
  meaning_en:           text('meaning_en'),
  meaning_hi:           text('meaning_hi'),
  summary_en:           text('summary_en'),
  summary_hi:           text('summary_hi'),
});

export const verses = sqliteTable('verses', {
  id:              text('id').primaryKey(),
  chapter_id:      text('chapter_id').notNull(),
  verse_number:    integer('verse_number').notNull(),
  text_sanskrit:   text('text_sanskrit').notNull(),
  text_romanized:  text('text_romanized'),
  speaker:         text('speaker'),  // 'krishna' | 'arjuna' | 'sanjaya' | 'dhritarashtra'
  translation_eng: text('translation_eng'), // Gita Press English translation (seeded from OCR)
});

export const translations = sqliteTable('translations', {
  id:          text('id').primaryKey(),
  verse_id:    text('verse_id').notNull(),
  author_code: text('author_code').notNull(),
  author_name: text('author_name').notNull(),
  et:          text('et'),
  ec:          text('ec'),
  ht:          text('ht'),
  hc:          text('hc'),
  sc:          text('sc'),
});

export type Chapter     = typeof chapters.$inferSelect;
export type Verse       = typeof verses.$inferSelect;
export type Translation = typeof translations.$inferSelect;
