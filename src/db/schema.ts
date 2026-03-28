import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const chapters = sqliteTable('chapters', {
  id:                   text('id').primaryKey(),              // "ch_1"
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
  id:             text('id').primaryKey(),                    // "1_1"
  chapter_id:     text('chapter_id').notNull(),               // FK → chapters.id
  verse_number:   integer('verse_number').notNull(),
  text_sanskrit:  text('text_sanskrit').notNull(),
  text_romanized: text('text_romanized'),
});

export const translations = sqliteTable('translations', {
  id:          text('id').primaryKey(),                       // "1_1_gambir"
  verse_id:    text('verse_id').notNull(),                    // FK → verses.id
  author_code: text('author_code').notNull(),
  author_name: text('author_name').notNull(),
  et:          text('et'),   // English Translation
  ec:          text('ec'),   // English Commentary
  ht:          text('ht'),   // Hindi Translation
  hc:          text('hc'),   // Hindi Commentary
  sc:          text('sc'),   // Sanskrit Commentary
});

// Inferred types
export type Chapter     = typeof chapters.$inferSelect;
export type Verse       = typeof verses.$inferSelect;
export type Translation = typeof translations.$inferSelect;
