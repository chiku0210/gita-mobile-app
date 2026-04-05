# Bhagavad Gita

A distraction-free, offline-first Android app to read all 700+ verses of the Bhagavad Gita.  
Pure typography. Gita Press source. Zero backend. Zero noise.

---

## Philosophy

Every decision in this project flows from four non-negotiable principles:

| Principle | Definition |
|---|---|
| **Pure Typography** | The UI is the text. Zero decorative noise, zero imagery, zero distractions. |
| **Offline-First** | Works fully in airplane mode. No network call is ever needed post-install. |
| **Source Integrity** | Gita Press text only (Jayadayal Goyandka). No paraphrasing, no editorial rewriting. |
| **No Backend** | All 668 verses bundled locally. Static, immutable, no server dependency. |

Violating any of these is an architectural regression, not a tradeoff.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.83.4 + Expo 55 (Managed + CNG) |
| Database | expo-sqlite (FTS5 enabled) |
| ORM | Drizzle ORM |
| Navigation | React Navigation 7 (native stack) |
| Fonts | Noto Serif Devanagari + Noto Serif + Noto Sans |
| Gestures | React Native PanResponder |
| Gradients | expo-linear-gradient |
| Build | EAS Build → signed AAB → Play Store |
| TypeScript | ~5.9.2 |

**Explicitly excluded:** Node.js backend, PostgreSQL, Redis, Docker, AWS, any cloud service.

---

## Screens

Landing → Chapter List → Verse List → Verse Detail → Commentary

- **Landing** — entry point with app title in Sanskrit and English
- **Chapter List** — all 18 chapters with Sanskrit name, English name, transliteration, and verse count
- **Verse List** — scannable verse index for a chapter showing the Devanagari Sanskrit text per verse
- **Verse Detail** — speaker portrait as full-bleed background, Sanskrit (Devanagari) + IAST romanization + primary Gita Press English translation; swipe left/right or tap floating arrows to move between verses; hardware back jumps cleanly to Verse List regardless of swipe history depth
- **Commentary** — commentator portrait as fixed background image; sticky chip picker (16 commentators); scrolling content panel with English translation, English commentary, Hindi translation, Hindi commentary, and Sanskrit commentary fields depending on availability; snaps between portrait and text states

---

## Data Strategy

### Two-Table Architecture

Translations are stored in a dedicated `translations` table — one row per commentator per verse — decoupled from the core `verses` table. The Gita Press English translation is stored directly on the `verses` row as `translation_eng`, populated via OCR extraction.

### Gita Press Extraction Pipeline

The Gita Press English translation was extracted from the official PDF using two methods — EPUB parsing and OCR — with OCR producing the successful result. The extracted text was sanitized character-by-character against the source PDF and manually corrected for OCR misreads.

```text
scripts/EPUB Method/     →  attempted EPUB parse (superseded)
scripts/OCR Method/      →  OCR extraction, raw output, sanitation
scripts/migration/
  seed_full_db.js        →  seeds chapters + verses + translations table from Vedic API
  seed_translation_eng.mjs → patches translation_eng column from OCR JSON into verses table
  add_speaker.py         →  annotates speaker column per verse from hardcoded attribution map
```

`gita.db` ships inside the app bundle. On first launch it is copied from read-only assets to device writable storage via `expo-file-system`. All reads thereafter are local Drizzle queries — zero network calls, ever.

### Translation Priority in VerseDetailScreen

1. `verses.translation_eng` — Gita Press English (primary, seeded from OCR)
2. `translations` table fallback chain: `gambir → siva → san → purohit` — API-sourced Gambirananda et al.

---

## Schema

### chapters

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | `"ch_1"` |
| chapter_number | INTEGER | NOT NULL | |
| verses_count | INTEGER | NOT NULL | |
| name_sanskrit | TEXT | NOT NULL | Devanagari |
| name_english | TEXT | | nullable |
| name_transliteration | TEXT | | IAST romanization |
| meaning_en | TEXT | | nullable |
| meaning_hi | TEXT | | nullable |
| summary_en | TEXT | | nullable |
| summary_hi | TEXT | | nullable |

### verses

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | `"1_1"` |
| chapter_id | TEXT | NOT NULL | FK → chapters.id |
| verse_number | INTEGER | NOT NULL | |
| text_sanskrit | TEXT | NOT NULL | Devanagari |
| text_romanized | TEXT | | IAST transliteration |
| speaker | TEXT | | `'krishna'` \| `'arjuna'` \| `'sanjaya'` \| `'dhritarashtra'` |
| translation_eng | TEXT | | Gita Press English (seeded from OCR) |

### translations

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | |
| verse_id | TEXT | NOT NULL | FK → verses.id |
| author_code | TEXT | NOT NULL | e.g. `'gambir'`, `'siva'` |
| author_name | TEXT | NOT NULL | Full name |
| et | TEXT | | English translation |
| ec | TEXT | | English commentary |
| ht | TEXT | | Hindi translation |
| hc | TEXT | | Hindi commentary |
| sc | TEXT | | Sanskrit commentary |

---

## Commentators

16 commentators are available in the Commentary screen, sourced from the Vedic Scriptures API:

| Code | Name | Available Content |
|---|---|---|
| `siva` | Swami Sivananda | et, ec |
| `gambir` | Swami Gambirananda | et |
| `san` | Dr. S. Sankaranarayan | et |
| `purohit` | Shri Purohit Swami | et |
| `adi` | Swami Adidevananda | et |
| `raman` | Sri Ramanuja | et, sc |
| `sankar` | Sri Shankaracharya | et, sc, ht |
| `abhinav` | Sri Abhinav Gupta | et, sc |
| `chinmay` | Swami Chinmayananda | hc |
| `rams` | Swami Ramsukhdas | ht, hc |
| `tej` | Swami Tejomayananda | ht |
| `madhav` | Sri Madhavacharya | sc |
| `ms` | Sri Madhusudan Saraswati | sc |
| `srid` | Sri Sridhara Swami | sc |
| `neel` | Sri Neelkanth | sc |
| `venkat` | Vedantadeshikacharya Venkatanatha | sc |

Each commentator has a portrait image bundled in `assets/commentators/` displayed as the full-bleed background on the Commentary screen.

---

## Typography

Typography is the product. All specs are non-negotiable.

| Element | Font | Size | Line Height |
|---|---|---|---|
| Sanskrit (Devanagari) | Noto Serif Devanagari | 20sp | 35px |
| English Translation | Noto Serif | 17sp | 26px |
| Romanized Sanskrit | Noto Serif | 15sp | 22px |
| Chapter Titles | Noto Serif Bold | 22sp | 30px |
| UI Chrome | Noto Sans | 13sp | 18px |

**No italics. No decorative fonts. Plain Roman throughout.**

| Token | Light | Dark |
|---|---|---|
| Background | `#FAFAF7` | `#0F0F0D` |
| Primary Text | `#1A1A1A` | `#FAFAF7` |
| Accent (Gold) | `#B8860B` | `#B8860B` |
| Muted | `#8A8A80` | `#5A5A52` |
| Border | `#E5E5E0` | `#2A2A26` |

---

## Local Setup

### Prerequisites

- Node.js 18+
- Android Studio (for emulator) or Android device with USB debugging enabled
- Python 3 (for `add_speaker.py` migration only)

### Install

```bash
git clone https://github.com/chiku0210/gita-mobile-app
cd gita-mobile-app
npm install --legacy-peer-deps
```

### Seed the database

The seeded `gita.db` is already committed to `assets/`. To regenerate from scratch:

```bash
# Step 1: Seed chapters + verses + translations table from Vedic API
node scripts/migration/seed_full_db.js
# Output: assets/gita.db with all 668 verses and 16 commentators

# Step 2: Patch Gita Press translation_eng into the verses table
node scripts/migration/seed_translation_eng.mjs
# Reads from the OCR-sanitized JSON, writes translation_eng on each verse row

# Step 3: Annotate speaker per verse
python scripts/migration/add_speaker.py
# Writes speaker column (krishna / arjuna / sanjaya / dhritarashtra)
```

### Add fonts

Download and place in `assets/fonts/`:

- `NotoSerifDevanagari-Regular.ttf`
- `NotoSerif-Regular.ttf`
- `NotoSerif-Bold.ttf`
- `NotoSans-Regular.ttf`

### Run on device

```bash
adb devices                  # confirm device is detected
npx expo run:android
```

---

## Project Structure

```
gita-mobile-app/
├── assets/
│   ├── fonts/                        # Noto font TTFs
│   ├── commentators/                 # 16 commentator portrait images
│   └── gita.db                       # bundled SQLite database (committed)
├── scripts/
│   ├── EPUB Method/                  # superseded EPUB extraction attempt
│   ├── OCR Method/                   # OCR extraction pipeline + sanitized JSON
│   └── migration/
│       ├── seed_full_db.js           # seeds chapters + verses + translations from API
│       ├── seed_translation_eng.mjs  # patches translation_eng from OCR JSON
│       └── add_speaker.py            # annotates speaker column per verse
├── src/
│   ├── db/
│   │   ├── schema.ts                 # Drizzle table definitions (chapters, verses, translations)
│   │   ├── client.ts                 # expo-sqlite singleton
│   │   ├── init.ts                   # first-launch DB copy from assets to writable storage
│   │   └── queries.ts                # typed query functions (getChapters, getVerseById, getTranslationsForVerse, etc.)
│   ├── screens/
│   │   ├── LandingScreen.tsx
│   │   ├── ChapterListScreen.tsx
│   │   ├── VerseListScreen.tsx
│   │   ├── VerseDetailScreen.tsx     # PanResponder swipe nav + speaker portrait background
│   │   └── CommentaryScreen.tsx      # sticky chip picker + commentator portrait + snap scroll
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   └── types.ts                  # RootStackParamList
│   └── theme/
│       ├── tokens.ts                 # Colors, Typography, Spacing, COMMENTATORS, CONTENT_LABELS
│       ├── speakers.ts               # speaker image map + SPEAKER_LABELS
│       └── useTheme.ts               # light/dark color resolver
├── App.tsx                           # root — fonts + DB init + navigator + splash screen
├── app.json                          # Android only, package: com.nielless.gita
├── eas.json
├── metro.config.js                   # .db asset extension registered
├── babel.config.js
└── .npmrc                            # legacy-peer-deps=true (Expo 55 canary compat)
```

---

## Roadmap

### Done

- [x] Drizzle schema — `chapters`, `verses`, `translations` tables
- [x] `seed_full_db.js` — 668 verses + 16 commentators from Vedic Scriptures API
- [x] Gita Press translation extraction — OCR pipeline, sanitation, `seed_translation_eng.mjs`
- [x] Speaker attribution — `add_speaker.py` annotating all 668 verses
- [x] All 5 screens wired to live Drizzle queries
- [x] Verse Detail — speaker portrait as full-bleed background with dynamic gradient mask
- [x] Verse Detail — swipe left/right gesture navigation (PanResponder, 60px threshold)
- [x] Verse Detail — floating tap arrows as fallback navigation
- [x] Verse Detail — hardware back collapses entire swipe history in one tap
- [x] Commentary — 16 commentator portrait images bundled
- [x] Commentary — sticky chip picker with active/inactive/disabled states
- [x] Commentary — snap scroll between portrait view and content view
- [x] EAS configuration (`eas.json`, project ID set)

### Up Next

- [ ] SQLite FTS5 full-text search screen
- [ ] Font size preference (S / M / L)
- [ ] Last-read verse persistence per chapter
- [ ] Dark / light theme toggle exposed to user
- [ ] FlatList performance tuning (`getItemLayout`, `windowSize`)
- [ ] Haptic feedback on verse navigation
- [ ] EAS Build → signed AAB
- [ ] Play Store submission
- [ ] 14-day closed testing (20 users)

---

## Author

**Nielless Acharya** — Full-Stack Software Engineer  
[nielless.com](https://nielless.com)
