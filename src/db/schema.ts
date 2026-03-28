import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const chapters = sqliteTable('chapters', {
  id:             text('id').primaryKey(),              // "ch_1"
  chapter_number: integer('chapter_number').notNull(),
  title_english:  text('title_english').notNull(),
  title_sanskrit: text('title_sanskrit').notNull(),
  summary:        text('summary'),                      // nullable
  verse_count:    integer('verse_count').notNull(),
});

export const verses = sqliteTable('verses', {
  id:                  text('id').primaryKey(),         // "1_1"
  chapter_id:          text('chapter_id').notNull(),    // FK → chapters.id
  verse_number:        integer('verse_number').notNull(),
  verse_range:         text('verse_range'),             // nullable, e.g. "4-6"
  text_sanskrit:       text('text_sanskrit').notNull(),
  text_romanized:      text('text_romanized'),
  translation_english: text('translation_english'),
  commentary_json:     text('commentary_json'),         // full JSON blob: all 21 commentators
});

// Types (inferred)
export type Chapter = typeof chapters.$inferSelect;
export type Verse   = typeof verses.$inferSelect;