# Bhagavad Gita

A distraction-free, offline-first Android app to read all 700 verses of the Bhagavad Gita.  
Pure typography. Gita Press source. Zero backend. Zero noise.

---

## Philosophy

Every decision in this project flows from four non-negotiable principles:

| Principle | Definition |
|---|---|
| **Pure Typography** | The UI is the text. Zero decorative noise, zero imagery, zero distractions. |
| **Offline-First** | Works fully in airplane mode. No network call is ever needed post-install. |
| **Source Integrity** | Gita Press text only (Jayadayal Goyandka). No paraphrasing, no editorial rewriting. |
| **No Backend** | All 700 verses bundled locally. Static, immutable, no server dependency. |

Violating any of these is an architectural regression, not a tradeoff.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo Managed + CNG) |
| Database | expo-sqlite |
| ORM | Drizzle ORM |
| Search | SQLite FTS5 (on-device, <10ms) |
| Fonts | Noto Serif Devanagari + Noto Serif + Noto Sans |
| Navigation | React Navigation (native stack) |
| State | React Context + useReducer |
| Preferences | AsyncStorage |
| Build | EAS Build → signed AAB → Play Store |

**Explicitly excluded:** Node.js, PostgreSQL, Redis, Docker, AWS, any cloud backend.

---

## Screens

Landing → Chapter List → Verse List → Verse Detail → Commentary

- **Landing** — entry point with title in Sanskrit and English
- **Chapter List** — all 18 chapters with Sanskrit name, English title, verse count
- **Verse List** — scannable verse index for a chapter with translation preview
- **Verse Detail** — Sanskrit (Devanagari) + IAST romanization + primary English translation
- **Commentary** — 21 commentators selectable via horizontal chip picker

---

## Data Strategy

### Phase 0A — API Seed (current)

All 700 verses seeded from the [Vedic Scriptures API](https://vedicscriptures.github.io) — free, open-source, no auth, no rate limit.

- Primary translation: **Swami Gambirananda** (`gambir.et`) — word-for-word, closest to Gita Press register
- Fallback chain: `gambir → siva → san → purohit`
- All 21 commentator payloads stored as `commentary_json` per verse

### Phase 0B — Gita Press Migration (post-UI)

`translation_english` replaced in-place from `gita.txt` (Gita Press 2007 pocket edition).  
Sanskrit and romanization columns are unchanged — source-agnostic.

### Seed Pipeline

```text
Phase 0A:  node scripts/seed_api.js    →  assets/gita.db  (700 verses, one-time)
Phase 0B:  python scripts/parse_gita.py  →  gita_parsed.json
           node scripts/migrate_gita.js  →  gita.db (translation_english updated)
```

`gita.db` ships inside the app bundle. On first launch it is copied from read-only assets to device writable storage. All subsequent reads are local Drizzle queries — zero network calls, ever.

---

## Schema

### chapters

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | "ch_1" |
| chapter_number | INTEGER | NOT NULL | |
| title_english | TEXT | NOT NULL | |
| title_sanskrit | TEXT | NOT NULL | Devanagari |
| summary | TEXT | | nullable |
| verse_count | INTEGER | NOT NULL | |

### verses

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | "1_1" |
| chapter_id | TEXT | NOT NULL | FK → chapters.id |
| verse_number | INTEGER | NOT NULL | |
| verse_range | TEXT | | nullable, e.g. "4-6" |
| text_sanskrit | TEXT | NOT NULL | Devanagari |
| text_romanized | TEXT | | IAST transliteration |
| translation_english | TEXT | | Gambirananda / Gita Press |
| commentary_json | TEXT | | JSON blob: all 21 commentators |

### verses_fts (FTS5 virtual table)

`CREATE VIRTUAL TABLE verses_fts USING fts5(
  translation_english,
  text_romanized,
  content='verses'
);`

---

## Typography

Typography is the product. All specs are non-negotiable.

| Element | Font | Size | Line Height |
|---|---|---|---|
| Sanskrit (Devanagari) | Noto Serif Devanagari | 20sp | 1.75× |
| English Translation | Noto Serif | 17sp | 1.55× |
| Romanized Sanskrit | Noto Serif | 15sp | — |
| Chapter Titles | Noto Serif Bold | 22sp | — |
| UI Chrome | Noto Sans | 13sp | — |

**No italics. No decorative fonts. Plain Roman throughout.**

| Token | Light | Dark |
|---|---|---|
| Background | `#FAFAF7` | `#0F0F0D` |
| Primary Text | `#1A1A1A` | `#FAFAF7` |
| Accent (Gold) | `#B8860B` | `#B8860B` |

---

## Local Setup

### Prerequisites

- Node.js 18+
- Android Studio (for emulator) or Android device with USB debugging
- Python 3 (Phase 0B only)

### Install

```bash
git clone https://github.com/nielless/gita-app
cd gita-app
npm install --legacy-peer-deps
npx expo install expo-sqlite expo-font expo-asset expo-file-system expo-haptics expo-splash-screen @react-native-async-storage/async-storage react-native-screens react-native-safe-area-context
```

### Seed the database

```bash
npm install -D better-sqlite3 --legacy-peer-deps
node scripts/seed_api.js
# Takes ~3 minutes — fetches 700 verses from vedicscriptures.github.io
# Output: assets/gita.db
```

### Add fonts

Download and place in `assets/fonts/`:

- `NotoSerifDevanagari-Regular.ttf`
- `NotoSerif-Regular.ttf`
- `NotoSerif-Bold.ttf`
- `NotoSans-Regular.ttf`

### Run on device

```bash
# Enable USB debugging on your Android device, then:
adb devices                  # confirm device is detected
npx expo run:android
```

---

## Project Structure

```
gita-app/
├── assets/
│   ├── fonts/               # Noto font TTFs
│   └── gita.db              # bundled SQLite database (generated by seed script)
├── scripts/
│   ├── seed_api.js          # Phase 0A — fetches API, writes gita.db
│   ├── parse_gita.py        # Phase 0B — parses gita.txt → gita_parsed.json
│   └── migrate_gita.js      # Phase 0B — updates translation_english in-place
├── src/
│   ├── db/
│   │   ├── schema.ts        # Drizzle table definitions
│   │   ├── client.ts        # expo-sqlite singleton
│   │   ├── init.ts          # first-launch DB copy from assets
│   │   └── queries.ts       # typed query functions
│   ├── screens/
│   │   ├── LandingScreen.tsx
│   │   ├── ChapterListScreen.tsx
│   │   ├── VerseListScreen.tsx
│   │   ├── VerseDetailScreen.tsx
│   │   └── CommentaryScreen.tsx
│   ├── components/
│   │   ├── ChapterCard.tsx
│   │   ├── VerseRow.tsx
│   │   ├── VerseBlock.tsx
│   │   └── CommentatorPicker.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   └── types.ts
│   ├── theme/
│   │   ├── tokens.ts        # colors, typography, spacing, commentator list
│   │   └── useTheme.ts      # light/dark resolver
│   └── context/
│       └── PrefsContext.tsx  # font size, theme toggle, last-read verse
├── App.tsx                  # root — fonts + DB init + navigator
├── app.json
├── metro.config.js          # .db asset extension registered
└── .npmrc                   # legacy-peer-deps=true (Expo 55 canary compat)
```

---

## Roadmap

### Phase 0A — API Seed *(current)*

- [x] Drizzle schema + expo-sqlite setup
- [x] seed_api.js — 700 verses from Vedic Scriptures API
- [x] All 5 screens scaffolded
- [ ] Wire Drizzle queries to screens
- [ ] Test on Nothing Phone 2a+

### Phase 0B — Gita Press Migration

- [ ] parse_gita.py — extract from gita.txt
- [ ] migrate_gita.js — update translation_english in-place
- [ ] Rebuild FTS index
- [ ] Regression test UI

### Phase 1 — Polish

- [ ] SQLite FTS5 search screen
- [ ] Font size preference (S/M/L)
- [ ] Last-read verse persistence per chapter
- [ ] Dark/light theme toggle
- [ ] FlatList performance optimization (getItemLayout, windowSize)
- [ ] Haptic feedback

### Phase 2 — Ship

- [ ] EAS Build → signed AAB
- [ ] Play Store submission
- [ ] 14-day closed testing (20 users)

---

## Author

**Nielless Acharya** — Full-Stack Software Engineer  
[nielless.com](https://nielless.com)
