export const Colors = {
  light: {
    background: '#FAFAF7',
    text:       '#1A1A1A',
    accent:     '#B8860B',
    muted:      '#8A8A80',
    border:     '#E5E5E0',
  },
  dark: {
    background: '#0F0F0D',
    text:       '#FAFAF7',
    accent:     '#B8860B',
    muted:      '#5A5A52',
    border:     '#2A2A26',
  },
};

export const Typography = {
  sanskrit: {
    fontFamily: 'NotoSerifDevanagari',
    fontSize: 20,
    lineHeight: 35,
  },
  translation: {
    fontFamily: 'NotoSerif',
    fontSize: 17,
    lineHeight: 26,
  },
  romanized: {
    fontFamily: 'NotoSerif',
    fontSize: 15,
    lineHeight: 22,
  },
  chapterTitle: {
    fontFamily: 'NotoSerif_700Bold',
    fontSize: 22,
    lineHeight: 30,
  },
  ui: {
    fontFamily: 'NotoSans',
    fontSize: 13,
    lineHeight: 18,
  },
};

export const Spacing = {
  screenMargin: 24,
};

export const COMMENTATORS = [
  { code: 'siva',    author: 'Swami Sivananda',                      langs: ['et', 'ec'] },
  { code: 'gambir',  author: 'Swami Gambirananda',                   langs: ['et'] },
  { code: 'san',     author: 'Dr. S. Sankaranarayan',                langs: ['et'] },
  { code: 'purohit', author: 'Shri Purohit Swami',                   langs: ['et'] },
  { code: 'adi',     author: 'Swami Adidevananda',                   langs: ['et'] },
  { code: 'raman',   author: 'Sri Ramanuja',                         langs: ['et', 'sc'] },
  { code: 'sankar',  author: 'Sri Shankaracharya',                   langs: ['et', 'sc', 'ht'] },
  { code: 'abhinav', author: 'Sri Abhinav Gupta',                    langs: ['et', 'sc'] },
  { code: 'chinmay', author: 'Swami Chinmayananda',                  langs: ['hc'] },
  { code: 'rams',    author: 'Swami Ramsukhdas',                     langs: ['ht', 'hc'] },
  { code: 'tej',     author: 'Swami Tejomayananda',                  langs: ['ht'] },
  { code: 'madhav',  author: 'Sri Madhavacharya',                    langs: ['sc'] },
  { code: 'ms',      author: 'Sri Madhusudan Saraswati',             langs: ['sc'] },
  { code: 'srid',    author: 'Sri Sridhara Swami',                   langs: ['sc'] },
  { code: 'neel',    author: 'Sri Neelkanth',                        langs: ['sc'] },
  { code: 'venkat',  author: 'Vedantadeshikacharya Venkatanatha',    langs: ['sc'] },
] as const;

export type CommentatorCode = typeof COMMENTATORS[number]['code'];

export const CONTENT_LABELS: Record<string, string> = {
  et: 'English Translation',
  ec: 'English Commentary',
  ht: 'Hindi Translation',
  hc: 'Hindi Commentary',
  sc: 'Sanskrit Commentary',
};